import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { prisma } from "../db/client";
import { config } from "../config";
import { AppError } from "../middleware/errorHandler";
import { OAuth2Client } from "google-auth-library";

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

function generateAccessToken(userId: string, email: string) {
  return jwt.sign({ userId, email }, config.jwt.secret, {
    expiresIn: config.jwt.accessExpiresIn,
  });
}

/** Create a cryptographically random refresh token and persist its hash. */
async function createRefreshToken(userId: string) {
  const raw = crypto.randomBytes(48).toString("base64url");
  const tokenHash = crypto.createHash("sha256").update(raw).digest("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  await prisma.refreshToken.create({
    data: { tokenHash, userId, expiresAt },
  });

  return raw;
}

export async function register(data: {
  email: string;
  password: string;
  name: string;
  workspaceName: string;
}) {
  const existing = await prisma.user.findUnique({
    where: { email: data.email },
  });
  if (existing) {
    throw new AppError(409, "EMAIL_EXISTS", "Email already registered");
  }

  const passwordHash = await bcrypt.hash(data.password, 12);

  // Create user + workspace + membership in a transaction
  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email: data.email,
        passwordHash,
        name: data.name,
      },
    });

    const slug =
      data.workspaceName
        .toLowerCase()
        .replace(/[^a-z0-9\u0590-\u05FF]+/g, "-")
        .replace(/^-|-$/g, "") || `ws-${Date.now()}`;

    // Ensure slug uniqueness
    let finalSlug = slug;
    const existingSlug = await tx.workspace.findUnique({
      where: { slug },
    });
    if (existingSlug) {
      finalSlug = `${slug}-${Date.now().toString(36)}`;
    }

    const workspace = await tx.workspace.create({
      data: {
        name: data.workspaceName,
        slug: finalSlug,
        ownerId: user.id,
        settings: {
          currency: "ILS",
          timezone: "Asia/Jerusalem",
          businessHours: {
            start: "09:00",
            end: "18:00",
            days: [0, 1, 2, 3, 4],
          },
        },
      },
    });

    const member = await tx.workspaceMember.create({
      data: {
        workspaceId: workspace.id,
        userId: user.id,
        role: "OWNER",
        joinedAt: new Date(),
      },
    });

    // Create default SLA policy
    await tx.slaPolicy.create({
      data: {
        workspaceId: workspace.id,
        name: "ברירת מחדל",
        firstResponseMinutes: 60,
        resolutionMinutes: 480,
        businessHoursOnly: true,
        isDefault: true,
      },
    });

    return { user, workspace, member };
  });

  const accessToken = generateAccessToken(result.user.id, result.user.email);
  const refreshToken = await createRefreshToken(result.user.id);

  return {
    user: {
      id: result.user.id,
      email: result.user.email,
      name: result.user.name,
    },
    workspace: {
      id: result.workspace.id,
      name: result.workspace.name,
      slug: result.workspace.slug,
    },
    accessToken,
    refreshToken,
  };
}

export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      memberships: {
        include: {
          workspace: {
            select: { id: true, name: true, slug: true, logoUrl: true },
          },
        },
      },
    },
  });

  if (!user || !user.isActive) {
    throw new AppError(401, "INVALID_CREDENTIALS", "Invalid email or password");
  }

  // Google-only user trying password login
  if (!user.passwordHash) {
    throw new AppError(401, "USE_GOOGLE_LOGIN", "This account uses Google login. Please sign in with Google.");
  }

  // Check account lockout
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    const minutesLeft = Math.ceil(
      (user.lockedUntil.getTime() - Date.now()) / 60000,
    );
    throw new AppError(
      429,
      "ACCOUNT_LOCKED",
      `Account locked. Try again in ${minutesLeft} minutes.`,
    );
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    const attempts = user.failedLoginAttempts + 1;
    const lockout =
      attempts >= MAX_FAILED_ATTEMPTS
        ? new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000)
        : null;

    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: attempts,
        ...(lockout && { lockedUntil: lockout }),
      },
    });

    throw new AppError(401, "INVALID_CREDENTIALS", "Invalid email or password");
  }

  // Reset failed attempts on successful login
  if (user.failedLoginAttempts > 0) {
    await prisma.user.update({
      where: { id: user.id },
      data: { failedLoginAttempts: 0, lockedUntil: null },
    });
  }

  const accessToken = generateAccessToken(user.id, user.email);
  const refreshToken = await createRefreshToken(user.id);

  const workspaces = user.memberships.map((m) => ({
    id: m.workspace.id,
    name: m.workspace.name,
    slug: m.workspace.slug,
    logoUrl: m.workspace.logoUrl,
    role: m.role,
  }));

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
    },
    workspaces,
    accessToken,
    refreshToken,
  };
}

export async function refreshTokens(rawToken: string) {
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

  // Find and delete the used token in one operation (single-use rotation)
  const stored = await prisma.refreshToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!stored) {
    throw new AppError(401, "INVALID_REFRESH_TOKEN", "Invalid refresh token");
  }

  // Always delete the used token (single-use)
  await prisma.refreshToken.delete({ where: { id: stored.id } });

  if (stored.expiresAt < new Date()) {
    throw new AppError(401, "REFRESH_TOKEN_EXPIRED", "Refresh token expired");
  }

  const user = stored.user;
  if (!user || !user.isActive) {
    throw new AppError(401, "USER_INACTIVE", "User account is inactive");
  }

  // Issue new token pair
  const accessToken = generateAccessToken(user.id, user.email);
  const refreshToken = await createRefreshToken(user.id);

  return { accessToken, refreshToken };
}

export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new AppError(404, "USER_NOT_FOUND", "User not found");
  }

  if (!user.passwordHash) {
    throw new AppError(400, "NO_PASSWORD", "This account uses Google login and has no password set");
  }

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) {
    throw new AppError(
      401,
      "INVALID_PASSWORD",
      "Current password is incorrect",
    );
  }

  const newHash = await bcrypt.hash(newPassword, 12);
  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: newHash,
        passwordChangedAt: new Date(),
      },
    }),
    // Revoke all refresh tokens on password change
    prisma.refreshToken.deleteMany({ where: { userId } }),
  ]);
}

export async function getMe(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      memberships: {
        include: {
          workspace: {
            select: { id: true, name: true, slug: true, logoUrl: true },
          },
        },
      },
    },
  });

  if (!user) {
    throw new AppError(404, "USER_NOT_FOUND", "User not found");
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
    workspaces: user.memberships.map((m) => ({
      id: m.workspace.id,
      name: m.workspace.name,
      slug: m.workspace.slug,
      logoUrl: m.workspace.logoUrl,
      role: m.role,
      memberId: m.id,
    })),
  };
}

export async function createWorkspace(userId: string, name: string) {
  const slug =
    name
      .toLowerCase()
      .replace(/[^a-z0-9\u0590-\u05FF]+/g, "-")
      .replace(/^-|-$/g, "") || `ws-${Date.now()}`;

  let finalSlug = slug;
  const existing = await prisma.workspace.findUnique({ where: { slug } });
  if (existing) {
    finalSlug = `${slug}-${Date.now().toString(36)}`;
  }

  const result = await prisma.$transaction(async (tx) => {
    const workspace = await tx.workspace.create({
      data: {
        name,
        slug: finalSlug,
        ownerId: userId,
        settings: {
          currency: "ILS",
          timezone: "Asia/Jerusalem",
          businessHours: {
            start: "09:00",
            end: "18:00",
            days: [0, 1, 2, 3, 4],
          },
        },
      },
    });

    await tx.workspaceMember.create({
      data: {
        workspaceId: workspace.id,
        userId,
        role: "OWNER",
        joinedAt: new Date(),
      },
    });

    await tx.slaPolicy.create({
      data: {
        workspaceId: workspace.id,
        name: "ברירת מחדל",
        firstResponseMinutes: 60,
        resolutionMinutes: 480,
        businessHoursOnly: true,
        isDefault: true,
      },
    });

    return workspace;
  });

  return {
    id: result.id,
    name: result.name,
    slug: result.slug,
  };
}

export async function inviteMember(
  workspaceId: string,
  inviterUserId: string,
  email: string,
  role: "ADMIN" | "AGENT",
) {
  // Verify inviter is owner or admin
  const inviterMembership = await prisma.workspaceMember.findFirst({
    where: {
      workspaceId,
      userId: inviterUserId,
      role: { in: ["OWNER", "ADMIN"] },
    },
  });
  if (!inviterMembership) {
    throw new AppError(
      403,
      "FORBIDDEN",
      "Only owners and admins can invite members",
    );
  }

  // Find or note the user
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new AppError(
      404,
      "USER_NOT_FOUND",
      "User with this email not found. They need to register first.",
    );
  }

  // Check if already a member
  const existing = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId: user.id } },
  });
  if (existing) {
    throw new AppError(
      409,
      "ALREADY_MEMBER",
      "User is already a member of this workspace",
    );
  }

  const member = await prisma.workspaceMember.create({
    data: {
      workspaceId,
      userId: user.id,
      role,
      joinedAt: new Date(),
    },
  });

  return { memberId: member.id, userId: user.id, role: member.role };
}

const googleClient = new OAuth2Client(config.google.clientId);

export async function googleLogin(idToken: string) {
  // Verify the Google ID token
  const ticket = await googleClient.verifyIdToken({
    idToken,
    audience: config.google.clientId,
  });
  const payload = ticket.getPayload();
  if (!payload || !payload.email) {
    throw new AppError(401, "INVALID_GOOGLE_TOKEN", "Invalid Google token");
  }

  const { sub: googleId, email, name, picture } = payload;

  // Look up user by googleId or email
  let user = await prisma.user.findFirst({
    where: { OR: [{ googleId }, { email }] },
    include: {
      memberships: {
        include: {
          workspace: {
            select: { id: true, name: true, slug: true, logoUrl: true },
          },
        },
      },
    },
  });

  let isNewUser = false;

  if (user) {
    // Link Google account if not yet linked
    if (!user.googleId) {
      await prisma.user.update({
        where: { id: user.id },
        data: { googleId, avatarUrl: user.avatarUrl || picture },
      });
    }
  } else {
    // Create new user + workspace
    isNewUser = true;
    const displayName = name || email.split("@")[0];

    const slug =
      displayName
        .toLowerCase()
        .replace(/[^a-z0-9\u0590-\u05FF]+/g, "-")
        .replace(/^-|-$/g, "") || `ws-${Date.now()}`;

    let finalSlug = slug;
    const existingSlug = await prisma.workspace.findUnique({
      where: { slug },
    });
    if (existingSlug) {
      finalSlug = `${slug}-${Date.now().toString(36)}`;
    }

    const result = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email,
          googleId,
          name: displayName,
          avatarUrl: picture,
        },
      });

      const workspace = await tx.workspace.create({
        data: {
          name: `${displayName}`,
          slug: finalSlug,
          ownerId: newUser.id,
          settings: {
            currency: "ILS",
            timezone: "Asia/Jerusalem",
            businessHours: {
              start: "09:00",
              end: "18:00",
              days: [0, 1, 2, 3, 4],
            },
          },
        },
      });

      await tx.workspaceMember.create({
        data: {
          workspaceId: workspace.id,
          userId: newUser.id,
          role: "OWNER",
          joinedAt: new Date(),
        },
      });

      await tx.slaPolicy.create({
        data: {
          workspaceId: workspace.id,
          name: "ברירת מחדל",
          firstResponseMinutes: 60,
          resolutionMinutes: 480,
          businessHoursOnly: true,
          isDefault: true,
        },
      });

      return { user: newUser, workspace };
    });

    user = await prisma.user.findUnique({
      where: { id: result.user.id },
      include: {
        memberships: {
          include: {
            workspace: {
              select: { id: true, name: true, slug: true, logoUrl: true },
            },
          },
        },
      },
    });

    if (!user) {
      throw new AppError(500, "USER_CREATE_FAILED", "Failed to create user");
    }
  }

  if (!user.isActive) {
    throw new AppError(401, "USER_INACTIVE", "Account is deactivated");
  }

  // Reset failed attempts if any
  if (user.failedLoginAttempts > 0) {
    await prisma.user.update({
      where: { id: user.id },
      data: { failedLoginAttempts: 0, lockedUntil: null },
    });
  }

  const accessToken = generateAccessToken(user.id, user.email);
  const refreshToken = await createRefreshToken(user.id);

  const workspaces = user.memberships.map((m) => ({
    id: m.workspace.id,
    name: m.workspace.name,
    slug: m.workspace.slug,
    logoUrl: m.workspace.logoUrl,
    role: m.role,
  }));

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
    },
    workspaces,
    accessToken,
    refreshToken,
    isNewUser,
  };
}

export async function getWorkspaceMembers(workspaceId: string) {
  const members = await prisma.workspaceMember.findMany({
    where: { workspaceId },
    include: {
      user: {
        select: { id: true, email: true, name: true, avatarUrl: true },
      },
    },
    orderBy: { invitedAt: "asc" },
  });

  return members.map((m) => ({
    memberId: m.id,
    userId: m.user.id,
    email: m.user.email,
    name: m.user.name,
    avatarUrl: m.user.avatarUrl,
    role: m.role,
    joinedAt: m.joinedAt,
  }));
}
