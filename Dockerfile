# ===========================
# Stage 1: Install dependencies
# ===========================
FROM node:20-alpine AS deps
WORKDIR /app

# Force development so npm ci includes devDependencies needed for build
ENV NODE_ENV=development

# Copy root package files for workspace resolution
COPY package.json package-lock.json ./
COPY client/package.json ./client/
COPY server/package.json ./server/

RUN npm ci

# ===========================
# Stage 2: Build client (Vite)
# ===========================
FROM node:20-alpine AS client-builder
WORKDIR /app

# npm workspaces hoists deps to root node_modules
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY client ./client
COPY tsconfig.base.json ./

ARG VITE_API_URL=/api/v1
ARG VITE_GOOGLE_CLIENT_ID=595077912228-qbl9ulrqtalslk58pii8ttpo772m0dk6.apps.googleusercontent.com
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID

WORKDIR /app/client
RUN /app/node_modules/.bin/vite build

# ===========================
# Stage 3: Build server (TypeScript)
# ===========================
FROM node:20-alpine AS server-builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY server ./server
COPY tsconfig.base.json ./

WORKDIR /app/server
RUN /app/node_modules/.bin/prisma generate
RUN /app/node_modules/.bin/tsc

# ===========================
# Stage 4: Production
# ===========================
FROM node:20-alpine AS runner
WORKDIR /app

# Security: non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 appuser

# Copy server build + production deps (hoisted to root node_modules)
COPY --from=server-builder --chown=appuser:nodejs /app/server/dist ./dist
COPY --from=server-builder --chown=appuser:nodejs /app/node_modules ./node_modules
COPY --from=server-builder /app/server/package.json ./package.json
COPY --from=server-builder /app/server/prisma ./prisma

# Copy client build into public/ (served by Express in production)
COPY --from=client-builder --chown=appuser:nodejs /app/client/dist ./public

# Create uploads directory
RUN mkdir -p /app/uploads && chown appuser:nodejs /app/uploads

ENV NODE_ENV=production
ENV PORT=3000

USER appuser
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

CMD ["sh", "-c", "node_modules/.bin/prisma migrate deploy && node dist/index.js"]
