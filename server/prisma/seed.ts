import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Use environment variables for seed credentials, or generate random passwords
  const adminPassword =
    process.env.SEED_ADMIN_PASSWORD || crypto.randomBytes(16).toString("hex");
  const agentPassword =
    process.env.SEED_AGENT_PASSWORD || crypto.randomBytes(16).toString("hex");

  // Create admin user
  const passwordHash = await bcrypt.hash(adminPassword, 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@vixy.co.il" },
    update: {},
    create: {
      email: "admin@vixy.co.il",
      passwordHash,
      name: "מנהל ראשי",
    },
  });

  // Create agent user
  const agentHash = await bcrypt.hash(agentPassword, 12);
  const agent = await prisma.user.upsert({
    where: { email: "agent@vixy.co.il" },
    update: {},
    create: {
      email: "agent@vixy.co.il",
      passwordHash: agentHash,
      name: "נציג מכירות",
    },
  });

  // Create demo workspace
  const workspace = await prisma.workspace.upsert({
    where: { slug: "demo-workspace" },
    update: {},
    create: {
      name: "חברת הדגמה",
      slug: "demo-workspace",
      ownerId: admin.id,
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

  // Add admin as owner member
  const adminMember = await prisma.workspaceMember.upsert({
    where: {
      workspaceId_userId: {
        workspaceId: workspace.id,
        userId: admin.id,
      },
    },
    update: {},
    create: {
      workspaceId: workspace.id,
      userId: admin.id,
      role: "OWNER",
      joinedAt: new Date(),
    },
  });

  // Add agent as member
  const agentMember = await prisma.workspaceMember.upsert({
    where: {
      workspaceId_userId: {
        workspaceId: workspace.id,
        userId: agent.id,
      },
    },
    update: {},
    create: {
      workspaceId: workspace.id,
      userId: agent.id,
      role: "AGENT",
      joinedAt: new Date(),
    },
  });

  // Create default SLA policy
  const slaPolicy = await prisma.slaPolicy.upsert({
    where: { id: "default-sla" },
    update: {},
    create: {
      id: "default-sla",
      workspaceId: workspace.id,
      name: "ברירת מחדל",
      firstResponseMinutes: 60,
      resolutionMinutes: 480,
      businessHoursOnly: true,
      isDefault: true,
    },
  });

  // Create sample companies
  const companies = await Promise.all([
    prisma.company.create({
      data: {
        workspaceId: workspace.id,
        name: 'טכנולוגיות אלפא בע"מ',
        website: "https://alpha-tech.co.il",
        phone: "03-1234567",
        email: "info@alpha-tech.co.il",
        industry: "טכנולוגיה",
        size: "50-200",
      },
    }),
    prisma.company.create({
      data: {
        workspaceId: workspace.id,
        name: "שיווק דיגיטלי פלוס",
        website: "https://digital-plus.co.il",
        phone: "02-9876543",
        email: "hello@digital-plus.co.il",
        industry: "שיווק",
        size: "10-50",
      },
    }),
    prisma.company.create({
      data: {
        workspaceId: workspace.id,
        name: "מסעדות השף",
        phone: "04-5555555",
        email: "orders@chef-restaurants.co.il",
        industry: "מזון",
        size: "200+",
      },
    }),
  ]);

  // Create sample contacts
  const contacts = await Promise.all([
    prisma.contact.create({
      data: {
        workspaceId: workspace.id,
        firstName: "יוסי",
        lastName: "כהן",
        email: "yossi@alpha-tech.co.il",
        phone: "050-1111111",
        companyId: companies[0].id,
        position: 'מנכ"ל',
        source: "אתר",
        status: "CUSTOMER",
        leadScore: 85,
        createdById: adminMember.id,
        lastActivityAt: new Date(),
      },
    }),
    prisma.contact.create({
      data: {
        workspaceId: workspace.id,
        firstName: "מיכל",
        lastName: "לוי",
        email: "michal@digital-plus.co.il",
        phone: "052-2222222",
        companyId: companies[1].id,
        position: 'סמנכ"לית שיווק',
        source: "הפניה",
        status: "QUALIFIED",
        leadScore: 72,
        createdById: adminMember.id,
        lastActivityAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      },
    }),
    prisma.contact.create({
      data: {
        workspaceId: workspace.id,
        firstName: "דני",
        lastName: "אברהם",
        email: "dani@chef-restaurants.co.il",
        phone: "054-3333333",
        companyId: companies[2].id,
        position: "מנהל רכש",
        source: "vixy",
        status: "LEAD",
        leadScore: 45,
        createdById: agentMember.id,
      },
    }),
    prisma.contact.create({
      data: {
        workspaceId: workspace.id,
        firstName: "שרה",
        lastName: "ישראלי",
        email: "sara@example.co.il",
        phone: "053-4444444",
        source: "פייסבוק",
        status: "LEAD",
        leadScore: 30,
        createdById: agentMember.id,
      },
    }),
    prisma.contact.create({
      data: {
        workspaceId: workspace.id,
        firstName: "אבי",
        lastName: "מזרחי",
        email: "avi@example.co.il",
        phone: "050-5555555",
        source: "טלפון",
        status: "CHURNED",
        leadScore: 10,
        createdById: adminMember.id,
        lastActivityAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      },
    }),
  ]);

  // Create sample deals
  const deals = await Promise.all([
    prisma.deal.create({
      data: {
        workspaceId: workspace.id,
        title: "חבילת פרסום שנתית - אלפא",
        value: 120000,
        stage: "NEGOTIATION",
        priority: "HIGH",
        contactId: contacts[0].id,
        companyId: companies[0].id,
        assigneeId: adminMember.id,
        probability: 70,
        expectedClose: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        stageChangedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        lastActivityAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      },
    }),
    prisma.deal.create({
      data: {
        workspaceId: workspace.id,
        title: "קמפיין דיגיטלי - פלוס",
        value: 45000,
        stage: "PROPOSAL",
        priority: "MEDIUM",
        contactId: contacts[1].id,
        companyId: companies[1].id,
        assigneeId: agentMember.id,
        probability: 50,
        expectedClose: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        stageChangedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        lastActivityAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
      },
    }),
    prisma.deal.create({
      data: {
        workspaceId: workspace.id,
        title: "ניהול סושיאל - מסעדות השף",
        value: 8000,
        stage: "LEAD",
        priority: "LOW",
        contactId: contacts[2].id,
        companyId: companies[2].id,
        assigneeId: agentMember.id,
        probability: 20,
        stageChangedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      },
    }),
    prisma.deal.create({
      data: {
        workspaceId: workspace.id,
        title: "עיצוב מחדש אתר",
        value: 25000,
        stage: "CLOSED_WON",
        priority: "HIGH",
        contactId: contacts[0].id,
        companyId: companies[0].id,
        assigneeId: adminMember.id,
        probability: 100,
        closedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        stageChangedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        lastActivityAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      },
    }),
  ]);

  // Create sample tags
  const tags = await Promise.all([
    prisma.tag.create({
      data: { workspaceId: workspace.id, name: "VIP", color: "#A25DDC" },
    }),
    prisma.tag.create({
      data: { workspaceId: workspace.id, name: "חם", color: "#E2445C" },
    }),
    prisma.tag.create({
      data: { workspaceId: workspace.id, name: "Vixy", color: "#0073EA" },
    }),
  ]);

  // Tag some contacts
  await prisma.tagOnContact.createMany({
    data: [
      { contactId: contacts[0].id, tagId: tags[0].id },
      { contactId: contacts[0].id, tagId: tags[2].id },
      { contactId: contacts[2].id, tagId: tags[2].id },
      { contactId: contacts[1].id, tagId: tags[1].id },
    ],
  });

  // Create sample tickets
  const tickets = await Promise.all([
    prisma.ticket.create({
      data: {
        workspaceId: workspace.id,
        subject: "בעיה בתצוגת מודעות",
        description: "המודעות לא מוצגות כראוי בדף הנחיתה",
        status: "OPEN",
        priority: "HIGH",
        channel: "email",
        contactId: contacts[0].id,
        assigneeId: agentMember.id,
        slaPolicyId: slaPolicy.id,
      },
    }),
    prisma.ticket.create({
      data: {
        workspaceId: workspace.id,
        subject: "שאלה על חבילת מחירים",
        description: "מעוניין לדעת על חבילות מחירים לעסקים קטנים",
        status: "NEW",
        priority: "MEDIUM",
        channel: "whatsapp",
        contactId: contacts[3].id,
        slaPolicyId: slaPolicy.id,
      },
    }),
    prisma.ticket.create({
      data: {
        workspaceId: workspace.id,
        subject: "בקשה לשינוי בקמפיין",
        description: "צריך לשנות את הקהל יעד בקמפיין הנוכחי",
        status: "RESOLVED",
        priority: "LOW",
        channel: "email",
        contactId: contacts[1].id,
        assigneeId: adminMember.id,
        slaPolicyId: slaPolicy.id,
        resolvedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        firstResponseAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        csatScore: 5,
        csatComment: "שירות מעולה, תודה!",
      },
    }),
  ]);

  // Create ticket messages
  await prisma.ticketMessage.createMany({
    data: [
      {
        ticketId: tickets[0].id,
        senderType: "contact",
        senderId: contacts[0].id,
        body: "שלום, המודעות שלנו לא מוצגות כראוי כבר יומיים. אשמח לעזרה דחופה.",
      },
      {
        ticketId: tickets[0].id,
        senderType: "agent",
        senderId: agentMember.id,
        body: "שלום יוסי, אני בודק את הנושא כרגע. אחזור אליך בהקדם.",
      },
      {
        ticketId: tickets[0].id,
        senderType: "agent",
        senderId: agentMember.id,
        body: "צריך לבדוק את ההגדרות בחשבון Vixy שלהם",
        isInternal: true,
      },
    ],
  });

  // Create sample activities
  await prisma.activity.createMany({
    data: [
      {
        workspaceId: workspace.id,
        type: "NOTE",
        subject: "פגישת היכרות",
        body: "נפגשנו עם יוסי, מאוד מעוניין בחבילה שנתית",
        contactId: contacts[0].id,
        dealId: deals[0].id,
        memberId: adminMember.id,
      },
      {
        workspaceId: workspace.id,
        type: "CALL",
        subject: "שיחת מעקב",
        body: "דיברנו על הצעת המחיר, ביקשה לחשוב על זה",
        contactId: contacts[1].id,
        dealId: deals[1].id,
        memberId: agentMember.id,
      },
      {
        workspaceId: workspace.id,
        type: "EMAIL",
        subject: "שליחת הצעת מחיר",
        contactId: contacts[1].id,
        dealId: deals[1].id,
        memberId: agentMember.id,
      },
      {
        workspaceId: workspace.id,
        type: "WHATSAPP",
        subject: "הודעה מ-Vixy",
        body: "ליד חדש מקמפיין פייסבוק",
        contactId: contacts[2].id,
        memberId: agentMember.id,
      },
    ],
  });

  // Create sample tasks
  await prisma.task.createMany({
    data: [
      {
        workspaceId: workspace.id,
        title: "להתקשר ליוסי - מעקב הצעה",
        status: "TODO",
        priority: "HIGH",
        dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
        contactId: contacts[0].id,
        dealId: deals[0].id,
        assigneeId: adminMember.id,
        createdById: adminMember.id,
      },
      {
        workspaceId: workspace.id,
        title: "לשלוח הצעת מחיר מעודכנת",
        status: "IN_PROGRESS",
        priority: "MEDIUM",
        dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        contactId: contacts[1].id,
        dealId: deals[1].id,
        assigneeId: agentMember.id,
        createdById: adminMember.id,
      },
      {
        workspaceId: workspace.id,
        title: "לבדוק בעיית תצוגה",
        status: "TODO",
        priority: "HIGH",
        dueDate: new Date(),
        ticketId: tickets[0].id,
        assigneeId: agentMember.id,
        createdById: agentMember.id,
      },
    ],
  });

  // Create sample smart views
  await prisma.smartView.createMany({
    data: [
      {
        workspaceId: workspace.id,
        name: "לידים חמים",
        module: "contacts",
        filters: {
          status: ["LEAD"],
          leadScoreMin: 40,
        },
        isShared: true,
      },
      {
        workspaceId: workspace.id,
        name: "עסקאות בסיכון",
        module: "deals",
        filters: {
          stage: ["PROPOSAL", "NEGOTIATION"],
          daysInStageMin: 7,
        },
        isShared: true,
      },
      {
        workspaceId: workspace.id,
        name: "פניות פתוחות",
        module: "tickets",
        filters: {
          status: ["NEW", "OPEN"],
        },
        isShared: true,
      },
    ],
  });

  // Create KB category + article
  const kbCategory = await prisma.kbCategory.create({
    data: {
      workspaceId: workspace.id,
      name: "שאלות נפוצות",
      slug: "faq",
      order: 0,
    },
  });

  await prisma.kbArticle.create({
    data: {
      workspaceId: workspace.id,
      title: "איך ליצור קמפיין חדש?",
      slug: "how-to-create-campaign",
      body: '<h2>יצירת קמפיין חדש</h2><p>כדי ליצור קמפיין חדש, יש להיכנס לפלטפורמת Vixy וללחוץ על כפתור "קמפיין חדש" בדף הראשי.</p><h3>שלבים:</h3><ol><li>בחרו את סוג הקמפיין</li><li>הגדירו קהל יעד</li><li>העלו את החומרים הגרפיים</li><li>הגדירו תקציב ולוח זמנים</li><li>לחצו על "הפעל"</li></ol>',
      categoryId: kbCategory.id,
      status: "published",
      authorId: admin.id,
      viewCount: 42,
      helpfulCount: 15,
      notHelpfulCount: 2,
    },
  });

  // Create canned responses
  await prisma.cannedResponse.createMany({
    data: [
      {
        workspaceId: workspace.id,
        title: "תודה על הפנייה",
        body: "שלום {{contact.firstName}},\n\nתודה שפנית אלינו! קיבלנו את הפנייה שלך ונחזור אליך בהקדם.\n\nבברכה,\n{{agent.name}}",
        category: "כללי",
      },
      {
        workspaceId: workspace.id,
        title: "עדכון סטטוס",
        body: "שלום {{contact.firstName}},\n\nרצינו לעדכן אותך שהפנייה שלך נמצאת בטיפול. נעדכן אותך ברגע שנסיים.\n\nבברכה,\n{{agent.name}}",
        category: "כללי",
      },
      {
        workspaceId: workspace.id,
        title: "סגירת פנייה",
        body: "שלום {{contact.firstName}},\n\nהפנייה שלך טופלה בהצלחה. אם יש לך שאלות נוספות, אל תהסס/י לפנות אלינו.\n\nבברכה,\n{{agent.name}}",
        category: "סגירה",
      },
    ],
  });

  console.log("Seed complete!");
  console.log(`  Admin: admin@vixy.co.il`);
  console.log(`  Agent: agent@vixy.co.il`);
  if (!process.env.SEED_ADMIN_PASSWORD) {
    console.log(
      `  (Random passwords generated — set SEED_ADMIN_PASSWORD and SEED_AGENT_PASSWORD env vars to control)`,
    );
  }
  console.log(`  Workspace: ${workspace.name} (${workspace.slug})`);
  console.log(
    `  ${contacts.length} contacts, ${deals.length} deals, ${tickets.length} tickets`,
  );
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
