import { Prisma } from "@prisma/client";
import { prisma } from "../db/client";
import { AppError } from "../middleware/errorHandler";

// ─── Israeli Name Pools ───

const ISRAELI_NAMES = {
  firstNames: [
    "דניאל", "נועה", "אבי", "מיכל", "יוסי", "שירה", "אלון", "רונית",
    "גיל", "תמר", "עידן", "מור", "אמיר", "ליאת", "שי", "הילה",
    "איתי", "נטע", "רועי", "עדי", "דור", "ענת", "עומר", "יעל",
    "ליאור", "אלה", "ניר", "מאיה", "אורן", "קרן",
  ],
  lastNames: [
    "כהן", "לוי", "מזרחי", "פרץ", "ביטון", "דהן", "אבוטבול", "אוחנה",
    "חדד", "אלקיים", "שושן", "עזרא", "אמסלם", "גבאי", "בן דוד", "אזולאי",
    "אברהם", "מלכה", "הראל", "רוזן", "שמש", "ברק", "נחום", "סגל",
  ],
};

const HEBREW_CITIES = [
  "תל אביב", "ירושלים", "חיפה", "ראשון לציון", "פתח תקווה",
  "אשדוד", "רמת גן", "נתניה", "הרצליה", "רעננה", "כפר סבא",
  "באר שבע", "מודיעין", "חולון", "רחובות",
];

// ─── Small Randomness Utilities ───

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickSeveral<T>(arr: readonly T[], n: number): T[] {
  const copy = [...arr];
  const out: T[] = [];
  for (let i = 0; i < n && copy.length > 0; i++) {
    const idx = Math.floor(Math.random() * copy.length);
    out.push(copy.splice(idx, 1)[0]);
  }
  return out;
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function daysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

function daysFromNow(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

function israeliMobile(): string {
  const prefixes = ["50", "52", "53", "54", "55", "58"];
  const prefix = pick(prefixes);
  const rest = String(randInt(1000000, 9999999));
  return `+972 ${prefix}-${rest.slice(0, 3)}-${rest.slice(3)}`;
}

function israeliLandline(): string {
  const areas = ["02", "03", "04", "08", "09"];
  return `${pick(areas)}-${randInt(1000000, 9999999)}`;
}

function emailFrom(firstName: string, lastName: string, domain: string): string {
  // Transliterate only a few common Hebrew letters for realism; fall back to
  // a short random slug so we never produce an empty local-part.
  const translit: Record<string, string> = {
    "א": "a", "ב": "b", "ג": "g", "ד": "d", "ה": "h", "ו": "v", "ז": "z",
    "ח": "h", "ט": "t", "י": "y", "כ": "k", "ך": "k", "ל": "l", "מ": "m",
    "ם": "m", "נ": "n", "ן": "n", "ס": "s", "ע": "a", "פ": "p", "ף": "p",
    "צ": "ts", "ץ": "ts", "ק": "k", "ר": "r", "ש": "sh", "ת": "t",
  };
  const translate = (s: string) =>
    s.split("").map((c) => translit[c] ?? "").join("").toLowerCase();
  let local = `${translate(firstName)}.${translate(lastName)}`;
  if (!local || local === ".") {
    local = `user${randInt(100, 999)}`;
  }
  return `${local}${randInt(1, 99)}@${domain}`;
}

function cleanDomain(name: string): string {
  // Strip Hebrew/quotes/spaces → safe ASCII slug for emails/websites.
  const ascii = name.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
  if (ascii.length >= 3) return ascii;
  return `company${randInt(100, 999)}`;
}

// ─── Industry Profiles ───

interface IndustryProfile {
  /** Prefix applied to generated company names (e.g. "יזמית"). */
  companyPrefix?: string;
  /** Suffix applied to generated company names (e.g. "בע״מ"). */
  companySuffix?: string;
  /** Pool of brand/company base names. */
  companyBaseNames: string[];
  /** Industry label stored on Company. */
  industryLabel: string;
  /** Pool of size buckets. */
  sizeOptions: string[];
  /** Titles assigned to contacts (position field). */
  contactTitles: string[];
  /** Distribution of contact sources. */
  leadSources: string[];
  /** Deal title templates — `{idx}` replaced with a number. */
  dealTitles: string[];
  /** Deal value range (ILS). */
  dealValueRange: [number, number];
  /** Optional per-contact note prefix ("עניין ברכישה/השכרה" etc). */
  contactNoteHints?: string[];
}

const INDUSTRY_PROFILES: Record<string, IndustryProfile> = {
  realestate: {
    companyPrefix: "יזמית",
    companyBaseNames: [
      "ברקת", "אזורים", "גלילות", "פסגות", "הים התיכון",
      "אורות", "מרכז העיר", "הצפון", "הדקל", "רמת השרון",
    ],
    industryLabel: "נדל״ן",
    sizeOptions: ["1-10", "10-50", "50-200"],
    contactTitles: [
      "מתעניין ברכישה", "מתעניין בהשכרה", "משקיע", "רוכש ראשון",
      "מחפש דירה", "משפר דיור",
    ],
    leadSources: ["אתר", "מדלן", "יד2", "הפניה", "פייסבוק", "אחר"],
    dealTitles: [
      "דירת 4 חדרים ברמת גן", "פנטהאוז בתל אביב", "דירת 3 חדרים בפתח תקווה",
      "דופלקס בהרצליה", "דירת גן ברעננה", "וילה בכפר סבא",
      "דירת 5 חדרים במודיעין", "סטודיו בתל אביב", "דירת 4 חדרים בחולון",
      "פנטהאוז בחיפה", "דירת 3 חדרים בנתניה", "דירת גן ברמת השרון",
      "דופלקס בבאר שבע", "דירת 4 חדרים בראשון לציון", "וילה בזכרון יעקב",
      "דירת 3 חדרים בירושלים", "פנטהאוז ברמת אביב", "דירת 5 חדרים בגבעתיים",
      "דירת גן בהוד השרון", "דירת 4 חדרים באשדוד",
    ],
    dealValueRange: [1_200_000, 6_500_000],
    contactNoteHints: [
      "מחפש דירת 4 חדרים", "תקציב עד 3 מיליון", "מחפש להשכרה לטווח ארוך",
      "משקיע מחו״ל", "רוצה קרוב למרכז",
    ],
  },
  agency: {
    companyPrefix: "מותג",
    companyBaseNames: [
      "בורגרים", "שיק", "אקטיב", "גרין", "מובייל-פיקס",
      "ביוטי", "קידס", "ספורט-לייף", "פוד-בוקס", "טק-סטור",
    ],
    industryLabel: "קמעונאות / מותגים",
    sizeOptions: ["10-50", "50-200", "200+"],
    contactTitles: [
      "מנהל שיווק", "מנהלת שיווק", 'סמנכ"ל שיווק', 'סמנכ"לית שיווק',
      "מנהל מותג", "מנהלת דיגיטל", 'מנכ"ל', 'מנכ"לית',
    ],
    leadSources: ["הפניה", "לינקדאין", "אתר", "כנס", "פייסבוק", "אחר"],
    dealTitles: [
      "קמפיין פייסבוק Q1", "קמפיין גוגל Q2", "השקת מותג חדש",
      "קמפיין אינסטגרם - חגים", "קמפיין טיקטוק נוער", "וידאו למותג",
      "ריטרגטינג Q3", "קמפיין מודעות מותג", "קמפיין לידים B2B",
      "קמפיין שנתי 2026", "השקת קולקציה", "קמפיין לינקדאין B2B",
      "קמפיין יוטיוב - הסברה", "אירוע השקה דיגיטלי", "קמפיין SEO",
      "תוכן לחודש העברי", "קמפיין בלקפריידי", "קמפיין מכירות סוף שנה",
      "קמפיין ריטייל מוזל", "קמפיין חובשי קסדות",
    ],
    dealValueRange: [8_000, 120_000],
  },
  recruitment: {
    companyPrefix: "",
    companySuffix: "בע״מ",
    companyBaseNames: [
      "טק-ליין", "דאטה-פוינט", "קוד-פקטורי", "מובייל-ג׳ניוס",
      "קלאוד-נטיב", "פינטק-פרו", "סייבר-דיפנס", "AI-לאבס",
      "דב-טולס", "סקיילאפ",
    ],
    industryLabel: "טכנולוגיה",
    sizeOptions: ["10-50", "50-200", "200+"],
    contactTitles: [
      "מפתח פולסטק", "מפתח Backend", "מפתחת Frontend", "Product Manager",
      "DevOps Engineer", "Data Scientist", "QA Engineer", "UX Designer",
      "Engineering Manager", "Tech Lead", "Scrum Master",
    ],
    leadSources: ["לינקדאין", "הפניה", "אתר קריירה", "AllJobs", "אחר"],
    dealTitles: [
      "Senior Developer - חברת טכנולוגיה", "Full Stack - סטארטאפ פינטק",
      "Product Manager - SaaS B2B", "DevOps Engineer - קלאוד",
      "Data Scientist - AI", "Frontend Lead - חברת מובייל",
      "Backend Engineer - סייבר", "QA Automation - חברת רפואה",
      "UX Designer - סטארטאפ", "Engineering Manager - גיימינג",
      "Tech Lead - אינפרה", "Junior Developer - bootcamp",
      "Mobile Developer iOS", "Mobile Developer Android",
      "Security Engineer - בנק", "Scrum Master - חברת ביטוח",
      "Data Engineer - ריטייל", "CTO - סיד",
    ],
    dealValueRange: [15_000, 60_000],
  },
  saas: {
    companyPrefix: "",
    companyBaseNames: [
      "TechNova", "DataBridge", "CloudPeak", "FlowStack", "MetricHub",
      "PulseOps", "AgileCore", "BrightAPI", "NorthRelay", "SkyForge",
    ],
    industryLabel: "SaaS",
    sizeOptions: ["50-200", "200-1000", "1000+"],
    contactTitles: [
      "VP Sales", "VP Marketing", "CTO", "CEO", "CFO", "COO",
      "Head of RevOps", "Director of Sales", "VP Customer Success",
    ],
    leadSources: ["לינקדאין", "הפניה", "אתר", "כנס", "Inbound", "אחר"],
    dealTitles: [
      "Enterprise Contract - Annual", "Pro Plan - 50 seats",
      "Enterprise Upgrade", "Multi-year Deal - Bank",
      "Pilot Expansion - Retail", "Add-on Module - Analytics",
      "Enterprise Renewal - Finance", "Starter to Pro Upgrade",
      "POC Conversion - Healthcare", "Multi-site License",
      "Custom Integration Package", "Annual Contract - 200 seats",
      "Enterprise - Global Rollout", "Pro Plan - 100 seats",
      "Enterprise - Strategic Account", "Premium Support Tier",
      "Training & Onboarding Package", "Professional Services Bundle",
    ],
    dealValueRange: [25_000, 350_000],
  },
  sales: {
    companyBaseNames: [
      "שלמה ושות׳", "גלובל סוליושנז", "אפקט", "מומנטום", "נקסט-וויב",
      "פריים פרטנרס", "אקסיס", "סטארלייט", "איי-ברידג׳", "פסיפיק",
    ],
    companySuffix: "בע״מ",
    industryLabel: "שירותים עסקיים",
    sizeOptions: ["10-50", "50-200", "200+"],
    contactTitles: [
      'מנכ"ל', "מנהל רכש", "מנהלת רכש", 'סמנכ"ל תפעול',
      "מנהל IT", "מנהלת כספים", "בעל עסק",
    ],
    leadSources: ["הפניה", "אתר", "לינקדאין", "כנס", "פייסבוק", "אחר"],
    dealTitles: [
      "חבילת שירות שנתית", "פרויקט ייעוץ", "הרחבת שירות",
      "חוזה תחזוקה", "הטמעת מערכת", "ליווי עסקי",
      "פרויקט דיגיטציה", "הדרכה לצוות", "אפיון מערכת",
      "שדרוג תשתיות", "חבילת פרימיום", "שירות מנוהל חודשי",
      "פרויקט אבטחת מידע", "פיתוח אתר", "פרויקט אפיון UX",
      "שירות תמיכה 24/7", "חוזה SLA מורחב", "פרויקט מיגרציה",
    ],
    dealValueRange: [10_000, 150_000],
  },
  coaching: {
    companyBaseNames: [
      "הוליסטיק", "קליניקת האור", "מרכז הצמיחה", "הבית הטיפולי",
      "מרכז האיזון", "התחלה חדשה", "המסלול", "מרחב",
    ],
    industryLabel: "אימון וטיפול",
    sizeOptions: ["1-10", "10-50"],
    contactTitles: [
      "מתעניין באימון", "מטופל/ת", "מתעניינת בטיפול",
      "הורה לילד בטיפול", "הפניה מרופא",
    ],
    leadSources: ["הפניה", "אתר", "פייסבוק", "אינסטגרם", "רופא", "אחר"],
    dealTitles: [
      "תוכנית אימון אישי - 12 מפגשים", "חבילת זוגיות - 8 מפגשים",
      "אימון עסקי - רבעון", "טיפול CBT - 16 מפגשים",
      "ליווי הורי - 6 מפגשים", "סדנת מיינדפולנס קבוצתית",
      "תוכנית אימון שנתית", "חבילת היכרות - 3 מפגשים",
      "אימון קריירה - 10 מפגשים", "טיפול זוגי ממוקד",
      "חבילת VIP שנתית", "מפגש אבחון ראשוני",
      "סדנת מנהיגות", "תוכנית ירידה במשקל - 3 חודשים",
      "ליווי אישי רבעוני",
    ],
    dealValueRange: [1_500, 24_000],
    contactNoteHints: [
      "מעוניין/ת בהיכרות", "חיפשו אותנו בגוגל", "הפניה ממטופל קיים",
      "מבקש/ת מפגש אבחון",
    ],
  },
  ecommerce: {
    companyBaseNames: [
      "פאשן-האוס", "טק-שופ", "ביוטי-ברנד", "קידס-פלאנט", "ספורט-זון",
      "הום-סטייל", "פוד-מרקט", "פט-סטור",
    ],
    industryLabel: "מסחר אלקטרוני",
    sizeOptions: ["1-10", "10-50", "50-200"],
    contactTitles: [
      "לקוח", "לקוחה", "לקוח חוזר", "לקוחה VIP",
      "מתעניין במוצר", "מתעניינת במוצר",
    ],
    leadSources: ["אתר", "פייסבוק", "אינסטגרם", "גוגל", "טיקטוק", "אחר"],
    dealTitles: [
      "הזמנה #1001 - אופנה", "הזמנה #1002 - אלקטרוניקה",
      "הזמנה #1003 - יופי וטיפוח", "הזמנה #1004 - לבית",
      "הזמנה גדולה - B2B", "הזמנה #1005 - ספורט",
      "הזמנה #1006 - תכשיטים", "הזמנה #1007 - ילדים",
      "הזמנה חוזרת VIP", "הזמנה #1008 - מטבח",
      "הזמנה #1009 - ריהוט", "הזמנה #1010 - גאדג׳טים",
      "הזמנת ירידה חודשית", "הזמנה סיטונאית",
      "הזמנה #1011 - מתנות", "הזמנה #1012 - חג",
    ],
    dealValueRange: [150, 8_500],
  },
  education: {
    companyBaseNames: [
      "מכללת המחר", "אקדמיית הקוד", "מרכז ההכשרה", "סטודיו-לרן",
      "בית ספר למקצוע", "מכללת דיגיטל", "מרכז הידע",
    ],
    industryLabel: "חינוך והכשרה",
    sizeOptions: ["10-50", "50-200", "200+"],
    contactTitles: [
      "מתעניין בקורס", "מתעניינת בקורס", "תלמיד", "תלמידה",
      "הורה לתלמיד", "בוגר/ת",
    ],
    leadSources: ["אתר", "פייסבוק", "גוגל", "הפניה", "כנס", "אחר"],
    dealTitles: [
      "קורס פיתוח Full Stack - מחזור חורף", "קורס דאטה סיינס",
      "קורס UX/UI - ערב", "קורס ניהול מוצר",
      "קורס שיווק דיגיטלי - 3 חודשים", "קורס סייבר",
      "קורס DevOps", "קורס AI לעסקים",
      "סדנת Excel למתקדמים", "קורס ייעוץ מס",
      "הכשרה פנים-ארגונית", "קורס אנגלית עסקית",
      "קורס עריכת וידאו", "קורס צילום למתחילים",
      "קורס פיתוח מובייל", "קורס פיננסי - משקיע מתחיל",
      "הכשרה לבגרות - מתמטיקה", "קורס פיתוח משחקים",
    ],
    dealValueRange: [1_200, 28_000],
  },
};

function profileFor(templateId: string): IndustryProfile {
  return INDUSTRY_PROFILES[templateId] ?? INDUSTRY_PROFILES.sales;
}

// ─── Stage Distribution ───

type DealStageValue = "LEAD" | "QUALIFIED" | "PROPOSAL" | "NEGOTIATION" | "CLOSED_WON" | "CLOSED_LOST";
type ContactStatusValue = "LEAD" | "QUALIFIED" | "CUSTOMER" | "CHURNED" | "INACTIVE";
type CompanyStatusValue = "PROSPECT" | "ACTIVE" | "INACTIVE" | "CHURNED";
type PriorityValue = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

/**
 * Weighted pipeline distribution — realistic funnel shape so the board
 * doesn't look artificial. Early stages hold more deals than closed.
 */
function randomStage(): DealStageValue {
  const r = Math.random();
  if (r < 0.22) return "LEAD";
  if (r < 0.44) return "QUALIFIED";
  if (r < 0.62) return "PROPOSAL";
  if (r < 0.78) return "NEGOTIATION";
  if (r < 0.92) return "CLOSED_WON";
  return "CLOSED_LOST";
}

function randomContactStatus(): ContactStatusValue {
  const r = Math.random();
  if (r < 0.4) return "LEAD";
  if (r < 0.65) return "QUALIFIED";
  if (r < 0.88) return "CUSTOMER";
  if (r < 0.95) return "INACTIVE";
  return "CHURNED";
}

function randomCompanyStatus(): CompanyStatusValue {
  const r = Math.random();
  if (r < 0.3) return "PROSPECT";
  if (r < 0.85) return "ACTIVE";
  if (r < 0.95) return "INACTIVE";
  return "CHURNED";
}

const PRIORITIES: PriorityValue[] = ["LOW", "MEDIUM", "HIGH", "URGENT"];

// Stage → probability default (keeps the Deal.probability column consistent
// with the chosen stage).
const STAGE_PROBABILITY: Record<DealStageValue, number> = {
  LEAD: 10,
  QUALIFIED: 30,
  PROPOSAL: 55,
  NEGOTIATION: 75,
  CLOSED_WON: 100,
  CLOSED_LOST: 0,
};

// ─── Main Generator ───

interface GenerateOptions {
  companiesCount?: number;
  contactsCount?: number;
  dealsCount?: number;
}

/**
 * Populate a workspace with realistic industry-specific demo data.
 *
 * All inserts happen in a single Prisma transaction so the data either
 * appears atomically or not at all — critical for keeping the UI from
 * rendering a half-populated workspace.
 *
 * Safe to call more than once; it does NOT delete existing data, so repeat
 * calls just stack more demo entities. Calling code should guard if that
 * isn't the desired behavior.
 */
export async function generateDemoData(
  workspaceId: string,
  memberId: string,
  templateId: string,
  options: GenerateOptions = {},
): Promise<{ companies: number; contacts: number; deals: number }> {
  // Validate workspace + member belong together — defense in depth on top of
  // the route-level auth check.
  const member = await prisma.workspaceMember.findFirst({
    where: { id: memberId, workspaceId },
    select: { id: true },
  });
  if (!member) {
    throw new AppError(403, "INVALID_MEMBER", "Member does not belong to workspace");
  }

  const profile = profileFor(templateId);

  const companiesCount = options.companiesCount ?? randInt(10, 15);
  const contactsCount = options.contactsCount ?? randInt(20, 30);
  const dealsCount = options.dealsCount ?? randInt(10, 20);

  // Build companies in memory first so we can reference their ids when
  // stitching contacts and deals together.
  const companies = Array.from({ length: companiesCount }, () => {
    const base = pick(profile.companyBaseNames);
    const nameParts = [profile.companyPrefix, base, profile.companySuffix].filter(Boolean);
    const name = nameParts.join(" ").trim();
    const domain = `${cleanDomain(base)}.co.il`;
    return {
      id: randomUUID(),
      workspaceId,
      name,
      status: randomCompanyStatus(),
      website: `https://${domain}`,
      phone: israeliLandline(),
      email: `info@${domain}`,
      address: `${pick(HEBREW_CITIES)}, ישראל`,
      industry: profile.industryLabel,
      size: pick(profile.sizeOptions),
      notes: null as string | null,
      domain,
    };
  });

  // Build contacts — each optionally attached to a company.
  const contacts = Array.from({ length: contactsCount }, () => {
    const firstName = pick(ISRAELI_NAMES.firstNames);
    const lastName = pick(ISRAELI_NAMES.lastNames);
    // 80% of contacts have a company; 20% are unattached.
    const company = Math.random() < 0.8 ? pick(companies) : null;
    const domain = company?.domain ?? `gmail.com`;
    return {
      id: randomUUID(),
      workspaceId,
      firstName,
      lastName,
      email: emailFrom(firstName, lastName, domain),
      phone: israeliMobile(),
      companyId: company?.id ?? null,
      position: pick(profile.contactTitles),
      source: pick(profile.leadSources),
      status: randomContactStatus(),
      leadScore: randInt(20, 95),
      createdById: memberId,
      lastActivityAt: daysAgo(randInt(0, 45)),
      nextFollowUpDate: Math.random() < 0.5 ? daysFromNow(randInt(-5, 14)) : null,
    };
  });

  // Build deals — each needs a contact; 70% also tie to the contact's
  // company (realistic: some contacts are individuals without a company).
  const deals = Array.from({ length: dealsCount }, (_, idx) => {
    const contact = pick(contacts);
    const stage = randomStage();
    const closed = stage === "CLOSED_WON" || stage === "CLOSED_LOST";
    const [minVal, maxVal] = profile.dealValueRange;
    const title = profile.dealTitles[idx % profile.dealTitles.length];
    return {
      id: randomUUID(),
      workspaceId,
      title,
      value: new Prisma.Decimal(randInt(minVal, maxVal)),
      currency: "ILS",
      stage,
      priority: pick(PRIORITIES),
      contactId: contact.id,
      companyId: contact.companyId,
      assigneeId: memberId,
      probability: STAGE_PROBABILITY[stage] ?? 0,
      expectedClose: closed ? null : daysFromNow(randInt(7, 90)),
      closedAt: closed ? daysAgo(randInt(0, 30)) : null,
      lostReason: stage === "CLOSED_LOST" ? "תקציב / תזמון" : null,
      lastActivityAt: daysAgo(randInt(0, 30)),
      notes: null as string | null,
    };
  });

  // One transaction — if any bulk insert fails, nothing is persisted.
  // `skipDuplicates` guards against the astronomically unlikely UUID
  // collision without aborting the whole batch.
  await prisma.$transaction(async (tx) => {
    // Strip the derived `domain` field before inserting — it isn't a column.
    await tx.company.createMany({
      data: companies.map(({ domain: _domain, ...rest }) => rest),
      skipDuplicates: true,
    });
    await tx.contact.createMany({
      data: contacts,
      skipDuplicates: true,
    });
    await tx.deal.createMany({
      data: deals,
      skipDuplicates: true,
    });
  }, {
    // Bulk insert of ~65 rows typically finishes in well under a second,
    // but we bump the timeout modestly in case the DB is under load so a
    // demo-data call doesn't trip the 5s default.
    timeout: 20_000,
  });

  return {
    companies: companies.length,
    contacts: contacts.length,
    deals: deals.length,
  };
}

// ─── Internal: UUID helper ───

function randomUUID(): string {
  // Node 14.17+ / 16+ ships crypto.randomUUID; fall back to manual if absent.
  // We lazy-require to avoid a top-level import clash in bundled environments.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { randomUUID: rand } = require("crypto") as typeof import("crypto");
  return rand();
}
