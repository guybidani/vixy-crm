import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const prisma = new PrismaClient();

// Helper: days from now (positive = future, negative = past)
const daysFromNow = (days: number) =>
  new Date(Date.now() + days * 24 * 60 * 60 * 1000);

async function main() {
  console.log("Seeding database...");

  // Use environment variables for seed credentials, or generate random passwords
  const adminPassword =
    process.env.SEED_ADMIN_PASSWORD || crypto.randomBytes(16).toString("hex");
  const agentPassword =
    process.env.SEED_AGENT_PASSWORD || crypto.randomBytes(16).toString("hex");
  const salesPassword =
    process.env.SEED_SALES_PASSWORD || "Sales123!";

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

  // Create sales manager user
  const salesHash = await bcrypt.hash(salesPassword, 12);
  const salesUser = await prisma.user.upsert({
    where: { email: "sales@vixy.co.il" },
    update: {},
    create: {
      email: "sales@vixy.co.il",
      passwordHash: salesHash,
      name: "מנהל מכירות",
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

  // Add sales manager as ADMIN member
  const salesMember = await prisma.workspaceMember.upsert({
    where: {
      workspaceId_userId: {
        workspaceId: workspace.id,
        userId: salesUser.id,
      },
    },
    update: {},
    create: {
      workspaceId: workspace.id,
      userId: salesUser.id,
      role: "ADMIN",
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

  // Create sample companies (3 original + 5 new = 8 total)
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
        status: "ACTIVE",
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
        status: "ACTIVE",
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
        status: "PROSPECT",
      },
    }),
    // --- 5 new companies ---
    prisma.company.create({
      data: {
        workspaceId: workspace.id,
        name: 'סולאר גרין בע"מ',
        website: "https://solar-green.co.il",
        phone: "08-6543210",
        email: "info@solar-green.co.il",
        industry: "אנרגיה מתחדשת",
        size: "10-50",
        status: "ACTIVE",
      },
    }),
    prisma.company.create({
      data: {
        workspaceId: workspace.id,
        name: "נדל״ן ברקת",
        website: "https://bareket-realestate.co.il",
        phone: "03-7654321",
        email: "office@bareket-re.co.il",
        industry: "נדל״ן",
        size: "50-200",
        status: "ACTIVE",
      },
    }),
    prisma.company.create({
      data: {
        workspaceId: workspace.id,
        name: "מעבדות רפא-טק",
        website: "https://refa-tech.co.il",
        phone: "09-8765432",
        email: "contact@refa-tech.co.il",
        industry: "פארמה",
        size: "200+",
        status: "PROSPECT",
      },
    }),
    prisma.company.create({
      data: {
        workspaceId: workspace.id,
        name: "לוגיסטיקה מהירה",
        phone: "03-2345678",
        email: "info@fast-logistics.co.il",
        industry: "לוגיסטיקה",
        size: "50-200",
        status: "ACTIVE",
        notes: "חברת שילוח ארצית, פוטנציאל גבוה",
      },
    }),
    prisma.company.create({
      data: {
        workspaceId: workspace.id,
        name: 'חינוך פלוס בע"מ',
        website: "https://edu-plus.co.il",
        phone: "02-3456789",
        email: "hello@edu-plus.co.il",
        industry: "חינוך",
        size: "10-50",
        status: "PROSPECT",
      },
    }),
  ]);

  // Create sample contacts (5 original + 15 new = 20 total)
  const contacts = await Promise.all([
    // --- 5 original contacts ---
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
        lastActivityAt: daysFromNow(-2),
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
        lastActivityAt: daysFromNow(-30),
      },
    }),
    // --- 15 new contacts ---
    prisma.contact.create({
      data: {
        workspaceId: workspace.id,
        firstName: "רונית",
        lastName: "שמעון",
        email: "ronit@solar-green.co.il",
        phone: "050-6666666",
        companyId: companies[3].id,
        position: "מנהלת פיתוח עסקי",
        source: "לינקדאין",
        status: "QUALIFIED",
        leadScore: 78,
        createdById: salesMember.id,
        lastActivityAt: daysFromNow(-1),
      },
    }),
    prisma.contact.create({
      data: {
        workspaceId: workspace.id,
        firstName: "עומר",
        lastName: "דוד",
        email: "omer@bareket-re.co.il",
        phone: "052-7777777",
        companyId: companies[4].id,
        position: "מנהל שיווק",
        source: "כנס",
        status: "CUSTOMER",
        leadScore: 90,
        createdById: adminMember.id,
        lastActivityAt: daysFromNow(-3),
      },
    }),
    prisma.contact.create({
      data: {
        workspaceId: workspace.id,
        firstName: "תמר",
        lastName: "גולן",
        email: "tamar@refa-tech.co.il",
        phone: "054-8888888",
        companyId: companies[5].id,
        position: "סמנכ״לית תפעול",
        source: "אתר",
        status: "LEAD",
        leadScore: 55,
        createdById: agentMember.id,
        lastActivityAt: daysFromNow(-5),
      },
    }),
    prisma.contact.create({
      data: {
        workspaceId: workspace.id,
        firstName: "אלון",
        lastName: "ברק",
        email: "alon@fast-logistics.co.il",
        phone: "050-9999999",
        companyId: companies[6].id,
        position: 'מנכ"ל',
        source: "הפניה",
        status: "QUALIFIED",
        leadScore: 82,
        createdById: salesMember.id,
        lastActivityAt: daysFromNow(-1),
      },
    }),
    prisma.contact.create({
      data: {
        workspaceId: workspace.id,
        firstName: "נועה",
        lastName: "פרץ",
        email: "noa@edu-plus.co.il",
        phone: "053-1010101",
        companyId: companies[7].id,
        position: "מנהלת תוכן",
        source: "גוגל",
        status: "LEAD",
        leadScore: 40,
        createdById: agentMember.id,
      },
    }),
    prisma.contact.create({
      data: {
        workspaceId: workspace.id,
        firstName: "איתן",
        lastName: "רוזנברג",
        email: "eitan.r@gmail.com",
        phone: "052-1212121",
        source: "פייסבוק",
        status: "LEAD",
        leadScore: 25,
        createdById: agentMember.id,
      },
    }),
    prisma.contact.create({
      data: {
        workspaceId: workspace.id,
        firstName: "ליאת",
        lastName: "עזרא",
        email: "liat.ezra@outlook.co.il",
        phone: "054-1313131",
        source: "אינסטגרם",
        status: "QUALIFIED",
        leadScore: 65,
        createdById: salesMember.id,
        lastActivityAt: daysFromNow(-4),
      },
    }),
    prisma.contact.create({
      data: {
        workspaceId: workspace.id,
        firstName: "גיל",
        lastName: "חדד",
        email: "gil.hadad@alpha-tech.co.il",
        phone: "050-1414141",
        companyId: companies[0].id,
        position: "מנהל מוצר",
        source: "vixy",
        status: "CUSTOMER",
        leadScore: 88,
        createdById: adminMember.id,
        lastActivityAt: daysFromNow(-2),
      },
    }),
    prisma.contact.create({
      data: {
        workspaceId: workspace.id,
        firstName: "הילה",
        lastName: "נחמיאס",
        email: "hila@digital-plus.co.il",
        phone: "052-1515151",
        companyId: companies[1].id,
        position: "מעצבת גרפית",
        source: "הפניה",
        status: "CUSTOMER",
        leadScore: 70,
        createdById: agentMember.id,
        lastActivityAt: daysFromNow(-7),
      },
    }),
    prisma.contact.create({
      data: {
        workspaceId: workspace.id,
        firstName: "מוטי",
        lastName: "אשכנזי",
        email: "moti.ash@gmail.com",
        phone: "054-1616161",
        source: "טלפון",
        status: "INACTIVE",
        leadScore: 15,
        createdById: adminMember.id,
        lastActivityAt: daysFromNow(-60),
      },
    }),
    prisma.contact.create({
      data: {
        workspaceId: workspace.id,
        firstName: "יעל",
        lastName: "בן-דוד",
        email: "yael.bd@bareket-re.co.il",
        phone: "050-1717171",
        companyId: companies[4].id,
        position: "יועצת משכנתאות",
        source: "כנס",
        status: "QUALIFIED",
        leadScore: 60,
        createdById: salesMember.id,
        lastActivityAt: daysFromNow(-6),
      },
    }),
    prisma.contact.create({
      data: {
        workspaceId: workspace.id,
        firstName: "עידו",
        lastName: "סגל",
        email: "ido.segal@refa-tech.co.il",
        phone: "052-1818181",
        companyId: companies[5].id,
        position: 'מנכ"ל',
        source: "לינקדאין",
        status: "LEAD",
        leadScore: 50,
        createdById: salesMember.id,
      },
    }),
    prisma.contact.create({
      data: {
        workspaceId: workspace.id,
        firstName: "שלומית",
        lastName: "אור",
        email: "shlomit.or@gmail.com",
        phone: "053-1919191",
        source: "גוגל",
        status: "LEAD",
        leadScore: 35,
        createdById: agentMember.id,
      },
    }),
    prisma.contact.create({
      data: {
        workspaceId: workspace.id,
        firstName: "רן",
        lastName: "ביטון",
        email: "ran.biton@fast-logistics.co.il",
        phone: "054-2020202",
        companyId: companies[6].id,
        position: "סמנכ״ל תפעול",
        source: "טלפון",
        status: "CUSTOMER",
        leadScore: 75,
        createdById: salesMember.id,
        lastActivityAt: daysFromNow(-2),
      },
    }),
  ]);

  // Create sample deals (4 original + 10 new = 14 total)
  const deals = await Promise.all([
    // --- 4 original deals ---
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
        expectedClose: daysFromNow(14),
        stageChangedAt: daysFromNow(-5),
        lastActivityAt: daysFromNow(-1),
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
        expectedClose: daysFromNow(30),
        stageChangedAt: daysFromNow(-10),
        lastActivityAt: daysFromNow(-8),
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
        stageChangedAt: daysFromNow(-3),
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
        closedAt: daysFromNow(-7),
        stageChangedAt: daysFromNow(-7),
        lastActivityAt: daysFromNow(-7),
      },
    }),
    // --- 10 new deals ---
    prisma.deal.create({
      data: {
        workspaceId: workspace.id,
        title: "מערכת סולארית - סולאר גרין",
        value: 500000,
        stage: "QUALIFIED",
        priority: "URGENT",
        contactId: contacts[5].id,
        companyId: companies[3].id,
        assigneeId: salesMember.id,
        probability: 40,
        expectedClose: daysFromNow(45),
        stageChangedAt: daysFromNow(-7),
        lastActivityAt: daysFromNow(-1),
      },
    }),
    prisma.deal.create({
      data: {
        workspaceId: workspace.id,
        title: "קמפיין נדל״ן - ברקת",
        value: 180000,
        stage: "NEGOTIATION",
        priority: "HIGH",
        contactId: contacts[6].id,
        companyId: companies[4].id,
        assigneeId: salesMember.id,
        probability: 75,
        expectedClose: daysFromNow(10),
        stageChangedAt: daysFromNow(-4),
        lastActivityAt: daysFromNow(-1),
      },
    }),
    prisma.deal.create({
      data: {
        workspaceId: workspace.id,
        title: "דף נחיתה + SEO - רפא-טק",
        value: 35000,
        stage: "PROPOSAL",
        priority: "MEDIUM",
        contactId: contacts[7].id,
        companyId: companies[5].id,
        assigneeId: agentMember.id,
        probability: 45,
        expectedClose: daysFromNow(21),
        stageChangedAt: daysFromNow(-6),
        lastActivityAt: daysFromNow(-3),
      },
    }),
    prisma.deal.create({
      data: {
        workspaceId: workspace.id,
        title: "מיתוג מחדש - לוגיסטיקה מהירה",
        value: 75000,
        stage: "LEAD",
        priority: "MEDIUM",
        contactId: contacts[8].id,
        companyId: companies[6].id,
        assigneeId: salesMember.id,
        probability: 15,
        stageChangedAt: daysFromNow(-2),
      },
    }),
    prisma.deal.create({
      data: {
        workspaceId: workspace.id,
        title: "חבילת תוכן חינוכי - חינוך פלוס",
        value: 22000,
        stage: "QUALIFIED",
        priority: "LOW",
        contactId: contacts[9].id,
        companyId: companies[7].id,
        assigneeId: agentMember.id,
        probability: 30,
        expectedClose: daysFromNow(60),
        stageChangedAt: daysFromNow(-8),
      },
    }),
    prisma.deal.create({
      data: {
        workspaceId: workspace.id,
        title: "ניהול גוגל אדס - אלפא",
        value: 96000,
        stage: "CLOSED_WON",
        priority: "HIGH",
        contactId: contacts[12].id,
        companyId: companies[0].id,
        assigneeId: adminMember.id,
        probability: 100,
        closedAt: daysFromNow(-14),
        stageChangedAt: daysFromNow(-14),
        lastActivityAt: daysFromNow(-14),
      },
    }),
    prisma.deal.create({
      data: {
        workspaceId: workspace.id,
        title: "אתר תדמית - ברקת",
        value: 42000,
        stage: "CLOSED_WON",
        priority: "MEDIUM",
        contactId: contacts[6].id,
        companyId: companies[4].id,
        assigneeId: salesMember.id,
        probability: 100,
        closedAt: daysFromNow(-21),
        stageChangedAt: daysFromNow(-21),
        lastActivityAt: daysFromNow(-21),
      },
    }),
    prisma.deal.create({
      data: {
        workspaceId: workspace.id,
        title: "קמפיין פייסבוק - ליאת עזרא",
        value: 5000,
        stage: "PROPOSAL",
        priority: "LOW",
        contactId: contacts[11].id,
        assigneeId: agentMember.id,
        probability: 35,
        expectedClose: daysFromNow(14),
        stageChangedAt: daysFromNow(-3),
      },
    }),
    prisma.deal.create({
      data: {
        workspaceId: workspace.id,
        title: "חבילת פרסום - סגל רפא-טק",
        value: 250000,
        stage: "CLOSED_LOST",
        priority: "HIGH",
        contactId: contacts[16].id,
        companyId: companies[5].id,
        assigneeId: salesMember.id,
        probability: 0,
        closedAt: daysFromNow(-10),
        stageChangedAt: daysFromNow(-10),
        lostReason: "תקציב לא מספיק, דחו לרבעון הבא",
        lastActivityAt: daysFromNow(-10),
      },
    }),
  ]);

  // Create sample tags (3 original + 3 new = 6 total)
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
    // --- 3 new tags ---
    prisma.tag.create({
      data: { workspaceId: workspace.id, name: "דחוף", color: "#FB275D" },
    }),
    prisma.tag.create({
      data: { workspaceId: workspace.id, name: "ממליץ", color: "#00CA72" },
    }),
    prisma.tag.create({
      data: { workspaceId: workspace.id, name: "Enterprise", color: "#FF9900" },
    }),
  ]);

  // Tag contacts (original + new)
  await prisma.tagOnContact.createMany({
    data: [
      // original
      { contactId: contacts[0].id, tagId: tags[0].id },  // יוסי = VIP
      { contactId: contacts[0].id, tagId: tags[2].id },  // יוסי = Vixy
      { contactId: contacts[2].id, tagId: tags[2].id },  // דני = Vixy
      { contactId: contacts[1].id, tagId: tags[1].id },  // מיכל = חם
      // new tags
      { contactId: contacts[5].id, tagId: tags[0].id },  // רונית = VIP
      { contactId: contacts[5].id, tagId: tags[5].id },  // רונית = Enterprise
      { contactId: contacts[6].id, tagId: tags[0].id },  // עומר = VIP
      { contactId: contacts[6].id, tagId: tags[4].id },  // עומר = ממליץ
      { contactId: contacts[8].id, tagId: tags[1].id },  // אלון = חם
      { contactId: contacts[8].id, tagId: tags[5].id },  // אלון = Enterprise
      { contactId: contacts[7].id, tagId: tags[3].id },  // תמר = דחוף
      { contactId: contacts[11].id, tagId: tags[1].id }, // ליאת = חם
      { contactId: contacts[12].id, tagId: tags[0].id }, // גיל = VIP
      { contactId: contacts[16].id, tagId: tags[5].id }, // עידו = Enterprise
      { contactId: contacts[18].id, tagId: tags[4].id }, // רן = ממליץ
    ],
  });

  // Create sample tickets (3 original + 5 new = 8 total)
  const tickets = await Promise.all([
    // --- 3 original tickets ---
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
        resolvedAt: daysFromNow(-2),
        firstResponseAt: daysFromNow(-3),
        csatScore: 5,
        csatComment: "שירות מעולה, תודה!",
      },
    }),
    // --- 5 new tickets ---
    prisma.ticket.create({
      data: {
        workspaceId: workspace.id,
        subject: "חשבונית לא התקבלה",
        description: "לא קיבלתי חשבונית על התשלום האחרון. אשמח לקבל העתק",
        status: "OPEN",
        priority: "MEDIUM",
        channel: "email",
        contactId: contacts[6].id,
        assigneeId: salesMember.id,
        slaPolicyId: slaPolicy.id,
        firstResponseAt: daysFromNow(-1),
      },
    }),
    prisma.ticket.create({
      data: {
        workspaceId: workspace.id,
        subject: "בעיית ביצועים בקמפיין",
        description: "הקמפיין לא מביא תוצאות כמצופה, ה-CTR נמוך מאוד",
        status: "OPEN",
        priority: "URGENT",
        channel: "whatsapp",
        contactId: contacts[5].id,
        assigneeId: salesMember.id,
        slaPolicyId: slaPolicy.id,
      },
    }),
    prisma.ticket.create({
      data: {
        workspaceId: workspace.id,
        subject: "בקשה להוספת משתמש",
        description: "צריך להוסיף עוד משתמש לחשבון שלנו",
        status: "PENDING",
        priority: "LOW",
        channel: "email",
        contactId: contacts[12].id,
        assigneeId: agentMember.id,
        slaPolicyId: slaPolicy.id,
        firstResponseAt: daysFromNow(-2),
      },
    }),
    prisma.ticket.create({
      data: {
        workspaceId: workspace.id,
        subject: "שגיאה בדוח אנליטיקס",
        description: "הדוח מציג נתונים שגויים לחודש האחרון",
        status: "RESOLVED",
        priority: "HIGH",
        channel: "email",
        contactId: contacts[8].id,
        assigneeId: adminMember.id,
        slaPolicyId: slaPolicy.id,
        resolvedAt: daysFromNow(-1),
        firstResponseAt: daysFromNow(-2),
        csatScore: 4,
        csatComment: "טיפול מהיר, תודה",
      },
    }),
    prisma.ticket.create({
      data: {
        workspaceId: workspace.id,
        subject: "שאלה על אינטגרציה עם CRM",
        description: "האם ניתן לחבר את המערכת שלכם ל-Salesforce?",
        status: "NEW",
        priority: "MEDIUM",
        channel: "whatsapp",
        contactId: contacts[16].id,
        slaPolicyId: slaPolicy.id,
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
      // New ticket messages
      {
        ticketId: tickets[3].id,
        senderType: "contact",
        senderId: contacts[6].id,
        body: "שלום, שילמתי לפני שבוע ועדיין לא קיבלתי חשבונית. אנא טפלו בדחיפות.",
      },
      {
        ticketId: tickets[3].id,
        senderType: "agent",
        senderId: salesMember.id,
        body: "שלום עומר, אני בודק מול מחלקת הנהלת חשבונות ואחזור אליך היום.",
      },
      {
        ticketId: tickets[4].id,
        senderType: "contact",
        senderId: contacts[5].id,
        body: "ה-CTR של הקמפיין ירד ל-0.3% - זה חצי מהממוצע. מה קורה?",
      },
      {
        ticketId: tickets[4].id,
        senderType: "agent",
        senderId: salesMember.id,
        body: "רונית, בדקתי - נראה שיש בעיה עם הקריאייטיב. אני מכין גרסה חדשה.",
      },
    ],
  });

  // Create sample activities (4 original + 15 new = 19 total)
  await prisma.activity.createMany({
    data: [
      // --- 4 original activities ---
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
      // --- 15 new activities ---
      {
        workspaceId: workspace.id,
        type: "MEETING",
        subject: "פגישת הצגת מוצר - סולאר גרין",
        body: "הצגנו את הפלטפורמה, רונית מאוד התלהבה. ביקשה הצעת מחיר תוך שבוע",
        contactId: contacts[5].id,
        dealId: deals[4].id,
        memberId: salesMember.id,
      },
      {
        workspaceId: workspace.id,
        type: "CALL",
        subject: "שיחה עם עומר - ברקת נדל״ן",
        body: "דנו בפרטי הקמפיין, רוצה להתחיל עם 3 פרויקטים במקביל",
        contactId: contacts[6].id,
        dealId: deals[5].id,
        memberId: salesMember.id,
      },
      {
        workspaceId: workspace.id,
        type: "EMAIL",
        subject: "שליחת הצעת מחיר - רפא-טק",
        body: "נשלחה הצעה ל-35,000 ש״ח כולל SEO ודף נחיתה",
        contactId: contacts[7].id,
        dealId: deals[6].id,
        memberId: agentMember.id,
      },
      {
        workspaceId: workspace.id,
        type: "NOTE",
        subject: "מחקר מתחרים - לוגיסטיקה מהירה",
        body: "בדקתי את המתחרים בתחום. יש הזדמנות טובה לבידול דיגיטלי",
        contactId: contacts[8].id,
        dealId: deals[7].id,
        memberId: salesMember.id,
      },
      {
        workspaceId: workspace.id,
        type: "WHATSAPP",
        subject: "הודעה מנועה - חינוך פלוס",
        body: "שלחה שאלות על חבילת התוכן, עניתי בפירוט",
        contactId: contacts[9].id,
        memberId: agentMember.id,
      },
      {
        workspaceId: workspace.id,
        type: "CALL",
        subject: "שיחת סגירה - אלפא גוגל אדס",
        body: "גיל אישר את ההצעה! עובר לחתימה",
        contactId: contacts[12].id,
        dealId: deals[9].id,
        memberId: adminMember.id,
      },
      {
        workspaceId: workspace.id,
        type: "MEETING",
        subject: "פגישת סטטוס שבועית - ברקת",
        body: "סקירת ביצועי קמפיין, שביעות רצון גבוהה",
        contactId: contacts[6].id,
        dealId: deals[10].id,
        memberId: salesMember.id,
      },
      {
        workspaceId: workspace.id,
        type: "EMAIL",
        subject: "מעקב אחרי הצעה - ליאת",
        body: "שלחתי אימייל מעקב, עדיין בוחנת אפשרויות",
        contactId: contacts[11].id,
        dealId: deals[11].id,
        memberId: agentMember.id,
      },
      {
        workspaceId: workspace.id,
        type: "STATUS_CHANGE",
        subject: "עסקה הפסד - רפא-טק",
        body: "עידו הודיע שדוחים לרבעון הבא בגלל תקציב",
        contactId: contacts[16].id,
        dealId: deals[13].id,
        memberId: salesMember.id,
      },
      {
        workspaceId: workspace.id,
        type: "CALL",
        subject: "שיחת היכרות - שלומית",
        body: "שלומית מחפשת פתרון פרסום לעסק קטן, נקבעה פגישה",
        contactId: contacts[17].id,
        memberId: agentMember.id,
      },
      {
        workspaceId: workspace.id,
        type: "NOTE",
        subject: "עדכון פנימי - יעל בן-דוד",
        body: "ליד חזק, צריך תשומת לב. מתעניינת בחבילה שנתית",
        contactId: contacts[15].id,
        memberId: salesMember.id,
      },
      {
        workspaceId: workspace.id,
        type: "WHATSAPP",
        subject: "הודעה מאיתן",
        body: "שאל על מחירים, נראה שעדיין בוחן אפשרויות",
        contactId: contacts[10].id,
        memberId: agentMember.id,
      },
      {
        workspaceId: workspace.id,
        type: "SYSTEM",
        subject: "ליד חדש נקלט - רן ביטון",
        body: "ליד מהאתר, עבר אוטומטית לנציג מכירות",
        contactId: contacts[18].id,
        memberId: salesMember.id,
      },
      {
        workspaceId: workspace.id,
        type: "MEETING",
        subject: "פגישת חתימה - לוגיסטיקה מהירה",
        body: "אלון רוצה להתקדם, קבענו פגישה ליום רביעי",
        contactId: contacts[8].id,
        dealId: deals[7].id,
        memberId: salesMember.id,
      },
      {
        workspaceId: workspace.id,
        type: "CALL",
        subject: "מעקב - מוטי אשכנזי",
        body: "ניסיתי להתקשר, לא ענה. נסיון שלישי",
        contactId: contacts[14].id,
        memberId: adminMember.id,
      },
    ],
  });

  // Create sample tasks (3 original + 7 new = 10 total)
  await prisma.task.createMany({
    data: [
      // --- 3 original tasks ---
      {
        workspaceId: workspace.id,
        title: "להתקשר ליוסי - מעקב הצעה",
        status: "TODO",
        priority: "HIGH",
        dueDate: daysFromNow(1),
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
        dueDate: daysFromNow(3),
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
      // --- 7 new tasks ---
      {
        workspaceId: workspace.id,
        title: "להכין מצגת לסולאר גרין",
        description: "מצגת מותאמת עם דוגמאות מתחום האנרגיה",
        status: "IN_PROGRESS",
        priority: "URGENT",
        dueDate: daysFromNow(2),
        contactId: contacts[5].id,
        dealId: deals[4].id,
        assigneeId: salesMember.id,
        createdById: salesMember.id,
      },
      {
        workspaceId: workspace.id,
        title: "לשלוח חשבונית לעומר",
        status: "TODO",
        priority: "MEDIUM",
        dueDate: daysFromNow(1),
        contactId: contacts[6].id,
        ticketId: tickets[3].id,
        assigneeId: salesMember.id,
        createdById: adminMember.id,
      },
      {
        workspaceId: workspace.id,
        title: "לעדכן קריאייטיב לקמפיין רונית",
        description: "להחליף תמונות ולשפר כותרות",
        status: "TODO",
        priority: "HIGH",
        dueDate: daysFromNow(1),
        contactId: contacts[5].id,
        ticketId: tickets[4].id,
        assigneeId: agentMember.id,
        createdById: salesMember.id,
      },
      {
        workspaceId: workspace.id,
        title: "לקבוע פגישת חתימה - ברקת",
        status: "DONE",
        priority: "HIGH",
        dueDate: daysFromNow(-1),
        contactId: contacts[6].id,
        dealId: deals[5].id,
        assigneeId: salesMember.id,
        createdById: salesMember.id,
        completedAt: daysFromNow(-1),
      },
      {
        workspaceId: workspace.id,
        title: "לשלוח דוגמאות עבודה לנועה",
        status: "TODO",
        priority: "LOW",
        dueDate: daysFromNow(5),
        contactId: contacts[9].id,
        dealId: deals[8].id,
        assigneeId: agentMember.id,
        createdById: agentMember.id,
      },
      {
        workspaceId: workspace.id,
        title: "לבדוק דוח אנליטיקס - לוגיסטיקה מהירה",
        description: "לנתח ביצועי האתר לפני הפגישה",
        status: "TODO",
        priority: "MEDIUM",
        dueDate: daysFromNow(3),
        contactId: contacts[8].id,
        dealId: deals[7].id,
        assigneeId: salesMember.id,
        createdById: salesMember.id,
      },
      {
        workspaceId: workspace.id,
        title: "מעקב חודשי - לקוחות קיימים",
        description: "שיחת מעקב שביעות רצון ללקוחות הוותיקים",
        status: "CANCELLED",
        priority: "LOW",
        dueDate: daysFromNow(-7),
        assigneeId: adminMember.id,
        createdById: adminMember.id,
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

  // Create demo board 1 (lead management) - original
  const board = await prisma.board.upsert({
    where: { id: "46a44efc-68ca-454f-b5cc-5c529578dd77" },
    update: { name: "בורד לידים" },
    create: {
      id: "46a44efc-68ca-454f-b5cc-5c529578dd77",
      workspaceId: workspace.id,
      name: "בורד לידים",
      description: "בורד לניהול ומעקב לידים נכנסים",
      icon: "Users",
      color: "#FDAB3D",
      templateKey: "lead_management",
      createdById: admin.id,
      columns: {
        create: [
          { key: "name", label: "שם", type: "TEXT", order: 0 },
          { key: "phone", label: "טלפון", type: "PHONE", width: "130px", order: 1 },
          {
            key: "status",
            label: "סטטוס",
            type: "STATUS",
            width: "140px",
            order: 2,
            options: [
              { key: "new", label: "חדש", color: "#579BFC" },
              { key: "contacted", label: "יצרנו קשר", color: "#FDAB3D" },
              { key: "interested", label: "מעוניין", color: "#00CA72" },
              { key: "not_interested", label: "לא מעוניין", color: "#FB275D" },
            ],
          },
          { key: "source", label: "מקור", type: "TEXT", width: "120px", order: 3 },
          { key: "notes", label: "הערות", type: "TEXT", width: "200px", order: 4 },
          { key: "assignee", label: "אחראי", type: "PERSON", width: "120px", order: 5 },
        ],
      },
      groups: {
        create: [
          { name: "לידים חדשים", color: "#FDAB3D", order: 0 },
        ],
      },
    },
  });

  // Create demo board 2 (projects board) - NEW
  const projectsBoard = await prisma.board.upsert({
    where: { id: "b2c3d4e5-f6a7-8901-bcde-f23456789abc" },
    update: { name: "בורד פרויקטים" },
    create: {
      id: "b2c3d4e5-f6a7-8901-bcde-f23456789abc",
      workspaceId: workspace.id,
      name: "בורד פרויקטים",
      description: "מעקב אחרי פרויקטים פעילים",
      icon: "FolderKanban",
      color: "#00CA72",
      createdById: admin.id,
      columns: {
        create: [
          { key: "name", label: "שם", type: "TEXT", order: 0 },
          {
            key: "status",
            label: "סטטוס",
            type: "STATUS",
            width: "140px",
            order: 1,
            options: [
              { key: "planning", label: "תכנון", color: "#579BFC" },
              { key: "in_progress", label: "בביצוע", color: "#FDAB3D" },
              { key: "review", label: "בבדיקה", color: "#A25DDC" },
              { key: "done", label: "הושלם", color: "#00CA72" },
              { key: "stuck", label: "תקוע", color: "#FB275D" },
            ],
          },
          { key: "assignee", label: "אחראי", type: "PERSON", width: "120px", order: 2 },
          { key: "deadline", label: "תאריך יעד", type: "DATE", width: "140px", order: 3 },
          { key: "budget", label: "תקציב", type: "NUMBER", width: "120px", order: 4 },
        ],
      },
      groups: {
        create: [
          { name: "פרויקטים פעילים", color: "#00CA72", order: 0 },
          { name: "פרויקטים בהמתנה", color: "#FDAB3D", order: 1 },
        ],
      },
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
  console.log(`  Sales: sales@vixy.co.il / Sales123!`);
  if (!process.env.SEED_ADMIN_PASSWORD) {
    console.log(
      `  (Random passwords for admin/agent — set SEED_ADMIN_PASSWORD and SEED_AGENT_PASSWORD env vars to control)`,
    );
  }
  console.log(`  Workspace: ${workspace.name} (${workspace.slug})`);
  console.log(
    `  ${contacts.length} contacts, ${deals.length} deals, ${tickets.length} tickets, 2 boards`,
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
