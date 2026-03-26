import { useState, useEffect, useRef, useCallback, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  TrendingUp,
  CheckSquare,
  Headphones,
  Zap,
  BookOpen,
  Smile,
  Globe,
  LayoutDashboard,
  Check,
  ChevronDown,
  Star,
  ArrowLeft,
  Play,
  Shield,
  Github,
  Linkedin,
  Twitter,
  Menu,
  X,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  useInView – scroll-triggered animation hook                        */
/* ------------------------------------------------------------------ */
function useInView(threshold = 0.05) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!("IntersectionObserver" in window)) {
      setInView(true);
      return;
    }
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          obs.unobserve(el);
        }
      },
      { threshold, rootMargin: "0px 0px 100px 0px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);

  return { ref, inView };
}

/* ------------------------------------------------------------------ */
/*  AnimatedCounter                                                    */
/* ------------------------------------------------------------------ */
function AnimatedCounter({
  end,
  suffix = "",
  prefix = "",
  duration = 2000,
  inView,
}: {
  end: number;
  suffix?: string;
  prefix?: string;
  duration?: number;
  inView: boolean;
}) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!inView) return;
    let startTime: number | null = null;
    let rafId: number;
    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1);
      setCount(Math.floor(progress * end));
      if (progress < 1) {
        rafId = requestAnimationFrame(animate);
      } else {
        setCount(end);
      }
    };
    rafId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafId);
  }, [end, duration, inView]);

  return (
    <span>
      {prefix}
      {count.toLocaleString()}
      {suffix}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Section wrapper                                                    */
/* ------------------------------------------------------------------ */
function Section({
  children,
  className = "",
  id,
}: {
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  const { ref, inView } = useInView();
  return (
    <section
      id={id}
      ref={ref}
      className={`transition-all duration-700 ${inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"} ${className}`}
    >
      {children}
    </section>
  );
}

/* ================================================================== */
/*  LandingPage                                                       */
/* ================================================================== */
export default function LandingPage() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [ctaEmail, setCtaEmail] = useState("");
  const statsSection = useInView(0.3);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollTo = useCallback((id: string) => {
    setMobileMenu(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  }, []);

  /* ---- data ---- */
  const features = [
    {
      icon: Users,
      color: "#6161FF",
      bg: "#E8E8FF",
      title: "אנשי קשר",
      desc: "נהלו את כל אנשי הקשר שלכם במקום אחד עם פילטרים חכמים, תגיות ותצוגות מותאמות.",
    },
    {
      icon: TrendingUp,
      color: "#00CA72",
      bg: "#D6F5E8",
      title: "עסקאות",
      desc: "עקבו אחרי צינור המכירות שלכם עם בורדים ויזואליים, תחזיות הכנסה ודוחות בזמן אמת.",
    },
    {
      icon: CheckSquare,
      color: "#A25DDC",
      bg: "#EDE1F5",
      title: "משימות",
      desc: "ארגנו משימות עם תאריכי יעד, תעדוף ושיוך לאנשי קשר ועסקאות.",
    },
    {
      icon: Headphones,
      color: "#FB275D",
      bg: "#FDE0E7",
      title: "פניות",
      desc: "מערכת טיקטים מלאה לניהול פניות לקוחות עם מעקב סטטוס ו-SLA.",
    },
    {
      icon: Zap,
      color: "#FF642E",
      bg: "#FFE4D9",
      title: "אוטומציות",
      desc: "הפכו תהליכים ידניים לאוטומטיים עם טריגרים, תנאים ופעולות מותאמות.",
    },
    {
      icon: BookOpen,
      color: "#66CCFF",
      bg: "#E0F4FF",
      title: "מאגר ידע",
      desc: "מרכזו את כל המידע הארגוני שלכם במקום אחד עם חיפוש חכם וקטגוריות.",
    },
  ];

  const whyItems = [
    {
      icon: Smile,
      title: "קל לשימוש",
      desc: "ממשק נקי ואינטואיטיבי שכל אחד בצוות יכול להתחיל להשתמש בו תוך דקות.",
    },
    {
      icon: Globe,
      title: "מותאם לעברית",
      desc: "תמיכה מלאה ב-RTL, עברית כשפת ברירת מחדל, וחוויה שנבנתה מהיסוד לשוק הישראלי.",
    },
    {
      icon: LayoutDashboard,
      title: "בורדים מותאמים אישית",
      desc: "צרו בורדים ותצוגות בדיוק כמו שאתם צריכים, עם עמודות, פילטרים וצבעים מותאמים.",
    },
  ];

  const pricingPlans: Array<{
    name: string;
    price: string;
    period: string;
    desc: string;
    highlighted: boolean;
    badge?: string;
    features: string[];
  }> = [
    {
      name: "סטארטר",
      price: "₪0",
      period: "/חודש",
      desc: "לעסקים קטנים שרק מתחילים",
      highlighted: false,
      features: [
        "עד 2 משתמשים",
        "עד 500 אנשי קשר",
        "ניהול עסקאות בסיסי",
        "משימות ותזכורות",
        "תמיכה במייל",
      ],
    },
    {
      name: "מקצועי",
      price: "₪149",
      period: "/חודש",
      desc: "לצוותים שרוצים לצמוח מהר",
      highlighted: true,
      badge: "מומלץ",
      features: [
        "עד 10 משתמשים",
        "אנשי קשר ללא הגבלה",
        "אוטומציות מתקדמות",
        "דוחות וניתוחים",
        "מאגר ידע",
        "תמיכה בצ׳אט ומייל",
        "ייבוא וייצוא נתונים",
      ],
    },
    {
      name: "ארגוני",
      price: "צרו קשר",
      period: "",
      desc: "לארגונים עם דרישות מותאמות",
      highlighted: false,
      features: [
        "משתמשים ללא הגבלה",
        "הכל בתוכנית המקצועית",
        "SLA מובטח",
        "גישה ל-API",
        "SSO ואבטחה מתקדמת",
        "מנהל לקוח ייעודי",
        "התאמות מותאמות אישית",
      ],
    },
  ];

  const testimonials = [
    {
      name: "דוד כהן",
      role: "מנכ\"ל, סטארטאפ טק",
      text: "עברנו מ-Salesforce ל-Vixy ולא הסתכלנו אחורה. הממשק הנקי והתמיכה בעברית שינו את הדרך שבה אנחנו מנהלים לקוחות. הצוות שלנו אימץ את המערכת תוך שבוע.",
      avatar: "ד",
      color: "#6161FF",
    },
    {
      name: "מיכל לוי",
      role: "מנהלת מכירות, חברת שיווק",
      text: "האוטומציות של Vixy חסכו לנו שעות עבודה כל שבוע. אני יכולה לעקוב אחרי כל העסקאות בקלות ולדעת בדיוק מה הסטטוס של כל לקוח.",
      avatar: "מ",
      color: "#A25DDC",
    },
    {
      name: "יוסי אברהם",
      role: "מנהל לקוחות, סוכנות דיגיטל",
      text: "הבורדים המותאמים של Vixy נתנו לנו גמישות שלא הכרנו. כל מחלקה בנתה את התצוגה שמתאימה לה. המאגר ידע ריכז לנו את כל המידע.",
      avatar: "י",
      color: "#00CA72",
    },
  ];

  const faqs = [
    {
      q: "האם יש תקופת ניסיון?",
      a: "כן! תוכנית הסטארטר היא חינמית לחלוטין ולא דורשת כרטיס אשראי. בנוסף, כל התוכניות המשודרגות כוללות 14 ימי ניסיון חינם.",
    },
    {
      q: "האם הנתונים שלי מאובטחים?",
      a: "בהחלט. אנחנו משתמשים בהצפנה מקצה לקצה, גיבויים יומיים, ועומדים בתקני אבטחה מחמירים. השרתים שלנו ממוקמים בתשתית מאובטחת עם זמינות של 99.9%.",
    },
    {
      q: "האם אפשר לייבא נתונים ממערכת אחרת?",
      a: "בוודאי. אנחנו תומכים בייבוא מ-Excel, CSV, Google Sheets ומערכות CRM נפוצות כמו Salesforce, HubSpot ו-Monday. צוות התמיכה שלנו ישמח לעזור בתהליך.",
    },
    {
      q: "מה ההבדל בין התוכניות?",
      a: "התוכנית החינמית מתאימה לעסקים קטנים עם עד 2 משתמשים. התוכנית המקצועית מוסיפה אוטומציות, דוחות מתקדמים ותמיכה מורחבת. התוכנית הארגונית כוללת הכל ללא הגבלה עם SLA מובטח.",
    },
    {
      q: "האם יש תמיכה בעברית?",
      a: "Vixy נבנתה מהיסוד עבור השוק הישראלי. הממשק כולו בעברית, עם תמיכה מלאה ב-RTL. צוות התמיכה שלנו זמין בעברית ובאנגלית.",
    },
  ];

  return (
    <div dir="rtl" className="min-h-screen bg-white font-sans text-[#323338] overflow-x-hidden">
      {/* ============================================================ */}
      {/*  NAVBAR                                                       */}
      {/* ============================================================ */}
      <nav
        className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
          scrolled
            ? "bg-white/80 backdrop-blur-xl shadow-[0_1px_6px_rgba(0,0,0,0.08)] border-b border-[#E6E9EF]"
            : "bg-transparent"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div
              className="flex items-center gap-2 cursor-pointer"
              role="button"
              tabIndex={0}
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); window.scrollTo({ top: 0, behavior: "smooth" }); } }}
            >
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#0073EA] to-[#6161FF] flex items-center justify-center shadow-[0_1px_6px_rgba(0,0,0,0.08)]">
                <span className="text-white font-bold text-lg">V</span>
              </div>
              <span className="text-xl font-bold text-[#323338]">Vixy CRM</span>
            </div>

            {/* Desktop nav */}
            <div className="hidden md:flex items-center gap-8">
              <button onClick={() => scrollTo("features")} className="text-[13px] text-[#676879] hover:text-[#0073EA] transition-colors">
                תכונות
              </button>
              <button onClick={() => scrollTo("pricing")} className="text-[13px] text-[#676879] hover:text-[#0073EA] transition-colors">
                תמחור
              </button>
              <button onClick={() => scrollTo("faq")} className="text-[13px] text-[#676879] hover:text-[#0073EA] transition-colors">
                שאלות נפוצות
              </button>
            </div>

            {/* CTA buttons */}
            <div className="hidden md:flex items-center gap-3">
              <button
                onClick={() => navigate("/login")}
                className="px-4 py-2 text-[13px] font-medium text-[#676879] hover:text-[#0073EA] transition-colors"
              >
                התחברות
              </button>
              <button
                onClick={() => navigate("/register")}
                className="px-5 py-2 text-[13px] font-semibold text-white bg-gradient-to-l from-[#0073EA] to-[#6161FF] rounded-lg hover:shadow-[0_1px_6px_rgba(0,0,0,0.08)] transition-all duration-300"
              >
                הרשמה חינם
              </button>
            </div>

            {/* Mobile hamburger */}
            <button className="md:hidden p-2" onClick={() => setMobileMenu(!mobileMenu)} aria-label="תפריט" aria-expanded={mobileMenu}>
              {mobileMenu ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenu && (
          <div className="md:hidden bg-white/95 backdrop-blur-xl border-t border-[#E6E9EF] px-4 pb-4 pt-2 space-y-2">
            <button onClick={() => scrollTo("features")} className="block w-full text-right py-2 text-[13px] text-[#676879] hover:text-[#0073EA]">
              תכונות
            </button>
            <button onClick={() => scrollTo("pricing")} className="block w-full text-right py-2 text-[13px] text-[#676879] hover:text-[#0073EA]">
              תמחור
            </button>
            <button onClick={() => scrollTo("faq")} className="block w-full text-right py-2 text-[13px] text-[#676879] hover:text-[#0073EA]">
              שאלות נפוצות
            </button>
            <hr className="border-[#E6E9EF]" />
            <button onClick={() => navigate("/login")} className="block w-full text-right py-2 text-[13px] font-medium text-[#676879]">
              התחברות
            </button>
            <button
              onClick={() => navigate("/register")}
              className="block w-full py-2.5 text-[13px] font-semibold text-white bg-gradient-to-l from-[#0073EA] to-[#6161FF] rounded-lg text-center"
            >
              הרשמה חינם
            </button>
          </div>
        )}
      </nav>

      {/* ============================================================ */}
      {/*  HERO                                                         */}
      {/* ============================================================ */}
      <section className="relative pt-28 pb-20 sm:pt-36 sm:pb-28 overflow-hidden">
        {/* Background gradient mesh */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full bg-[#0073EA]/10 blur-[120px]" />
          <div className="absolute top-40 left-0 w-[500px] h-[500px] rounded-full bg-purple/10 blur-[120px]" />
          <div className="absolute bottom-0 right-1/3 w-[400px] h-[400px] rounded-full bg-sky/8 blur-[100px]" />
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage:
                "radial-gradient(circle at 1px 1px, #6161FF 1px, transparent 0)",
              backgroundSize: "40px 40px",
            }}
          />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Text */}
            <div className="text-center lg:text-right">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#E8F3FF]/60 text-[#0073EA] text-xs font-semibold mb-6 backdrop-blur-sm">
                <Zap size={14} />
                <span>חדש! אוטומציות AI מתקדמות</span>
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight mb-6">
                ה-
                <span className="bg-gradient-to-l from-[#0073EA] to-[#6161FF] bg-clip-text text-transparent">
                  CRM
                </span>
                {" "}שעובד
                <br />
                בשבילך
              </h1>
              <p className="text-lg sm:text-xl text-[#676879] leading-relaxed mb-8 max-w-lg mx-auto lg:mx-0 lg:max-w-none">
                נהלו לקוחות, עסקאות ומשימות במקום אחד.
                <br className="hidden sm:block" />
                פשוט, חכם ויפה.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
                <button
                  onClick={() => navigate("/register")}
                  className="group px-8 py-3.5 text-base font-bold text-white bg-gradient-to-l from-[#0073EA] to-[#6161FF] rounded-xl hover:shadow-[0_1px_6px_rgba(0,0,0,0.08)] transition-all duration-300 hover:-translate-y-0.5 flex items-center justify-center gap-2"
                >
                  התחלה חינם
                  <ArrowLeft size={18} className="transition-transform group-hover:-translate-x-1" />
                </button>
                <button
                  onClick={() => scrollTo("features")}
                  className="px-8 py-3.5 text-base font-semibold text-[#0073EA] border-2 border-[#0073EA]/20 rounded-xl hover:bg-[#E8F3FF]/40 transition-all duration-300 flex items-center justify-center gap-2"
                >
                  <Play size={16} />
                  גלו את התכונות
                </button>
              </div>
            </div>

            {/* Dashboard mockup */}
            <div className="relative">
              <div className="relative bg-white/70 backdrop-blur-xl rounded-2xl shadow-[0_4px_16px_rgba(0,0,0,0.1)] border border-[#E6E9EF] p-5 transform lg:rotate-[-1deg] hover:rotate-0 transition-transform duration-500">
                {/* Window chrome */}
                <div className="flex items-center gap-1.5 mb-4">
                  <div className="w-3 h-3 rounded-full bg-danger/60" />
                  <div className="w-3 h-3 rounded-full bg-warning/60" />
                  <div className="w-3 h-3 rounded-full bg-success/60" />
                  <div className="flex-1 mx-3 h-6 rounded-md bg-[#F5F6F8]" />
                </div>

                {/* KPI cards row */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                  {[
                    { label: "עסקאות פתוחות", value: "47", color: "text-[#0073EA]", bg: "bg-[#E8F3FF]" },
                    { label: "הכנסה חודשית", value: "₪284K", color: "text-success", bg: "bg-success-light" },
                    { label: "לקוחות חדשים", value: "+23", color: "text-purple", bg: "bg-purple-light" },
                  ].map((kpi) => (
                    <div key={kpi.label} className={`${kpi.bg} rounded-lg p-3`}>
                      <p className="text-[10px] text-[#676879] mb-1">{kpi.label}</p>
                      <p className={`text-lg font-bold ${kpi.color}`}>{kpi.value}</p>
                    </div>
                  ))}
                </div>

                {/* Mini bar chart */}
                <div className="bg-[#F5F6F8] rounded-lg p-3 mb-4">
                  <p className="text-[10px] text-[#676879] mb-2">מכירות שבועיות</p>
                  <div className="flex items-end gap-1.5 h-16">
                    {[40, 65, 45, 80, 55, 90, 70].map((h, i) => (
                      <div
                        key={i}
                        className="flex-1 rounded-t-sm bg-gradient-to-t from-[#0073EA] to-[#6161FF]/60 transition-all duration-500"
                        style={{ height: `${h}%` }}
                      />
                    ))}
                  </div>
                </div>

                {/* Mini table rows */}
                <div className="space-y-2">
                  {[
                    { name: "ישראל טכנולוגיות", status: "bg-success", amount: "₪45,000" },
                    { name: "מדיה פלוס בע\"מ", status: "bg-warning", amount: "₪32,000" },
                    { name: "דיגיטל סולושנס", status: "bg-[#0073EA]", amount: "₪28,500" },
                  ].map((row) => (
                    <div key={row.name} className="flex items-center justify-between py-1.5 px-2 rounded-md bg-white/60">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${row.status}`} />
                        <span className="text-xs text-[#323338] font-medium">{row.name}</span>
                      </div>
                      <span className="text-xs text-[#676879] font-medium">{row.amount}</span>
                    </div>
                  ))}
                </div>
              </div>
              {/* Floating accent */}
              <div className="absolute -bottom-4 -left-4 w-20 h-20 rounded-2xl bg-gradient-to-br from-success to-success/50 blur-2xl opacity-40" />
              <div className="absolute -top-4 -right-4 w-16 h-16 rounded-2xl bg-gradient-to-br from-[#0073EA] to-[#6161FF] blur-2xl opacity-30" />
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  STATS BAR                                                    */}
      {/* ============================================================ */}
      <div ref={statsSection.ref} className="relative py-12 bg-gradient-to-l from-[#0073EA] to-[#6161FF]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center text-white">
            {[
              { end: 10000, suffix: "+", label: "לקוחות מרוצים" },
              { end: 1000000, suffix: "+", label: "עסקאות נוהלו", prefix: "" },
              { end: 99.9, suffix: "%", label: "זמינות" },
              { end: 4.9, suffix: "/5", label: "דירוג" },
            ].map((stat, i) => (
              <div key={i}>
                <p className="text-2xl sm:text-3xl font-extrabold mb-1">
                  {stat.end === 99.9 || stat.end === 4.9 ? (
                    <span>
                      {statsSection.inView ? stat.end : 0}
                      {stat.suffix}
                    </span>
                  ) : (
                    <AnimatedCounter
                      end={stat.end}
                      suffix={stat.suffix}
                      prefix={stat.prefix}
                      inView={statsSection.inView}
                    />
                  )}
                </p>
                <p className="text-[13px] text-white/80">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/*  FEATURES GRID                                                */}
      {/* ============================================================ */}
      <Section id="features" className="py-20 sm:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <p className="text-[13px] font-semibold text-[#0073EA] mb-2">תכונות</p>
            <h2 className="text-3xl sm:text-4xl font-extrabold mb-4">
              כל מה שאתם צריכים,{" "}
              <span className="bg-gradient-to-l from-[#0073EA] to-[#6161FF] bg-clip-text text-transparent">
                במקום אחד
              </span>
            </h2>
            <p className="text-[#676879] max-w-2xl mx-auto">
              Vixy CRM נותנת לכם את כל הכלים לניהול לקוחות, מכירות ותפעול &#8211; בממשק יפה ופשוט.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f, i) => {
              const Icon = f.icon;
              return (
                <div
                  key={i}
                  className="group relative bg-white/80 backdrop-blur-sm rounded-xl border border-[#E6E9EF] p-6 shadow-[0_1px_6px_rgba(0,0,0,0.08)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.1)] hover:-translate-y-1 transition-all duration-300"
                >
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110"
                    style={{ backgroundColor: f.bg }}
                  >
                    <Icon size={22} style={{ color: f.color }} />
                  </div>
                  <h3 className="text-lg font-bold mb-2">{f.title}</h3>
                  <p className="text-[13px] text-[#676879] leading-relaxed">
                    {f.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </Section>

      {/* ============================================================ */}
      {/*  WHY VIXY                                                     */}
      {/* ============================================================ */}
      <Section className="py-20 sm:py-28 bg-[#F5F6F8]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <p className="text-[13px] font-semibold text-[#0073EA] mb-2">למה Vixy?</p>
            <h2 className="text-3xl sm:text-4xl font-extrabold mb-4">
              בנינו את ה-CRM שרצינו לעצמנו
            </h2>
            <p className="text-[#676879] max-w-2xl mx-auto">
              אחרי שניסינו עשרות מערכות, הבנו שחסר CRM שמדבר עברית, פשוט לשימוש, ומותאם לצוותים ישראליים.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {whyItems.map((item, i) => {
              const Icon = item.icon;
              return (
                <div
                  key={i}
                  className="relative bg-white/80 backdrop-blur-sm rounded-xl border border-[#E6E9EF] p-8 text-center shadow-[0_1px_6px_rgba(0,0,0,0.08)] hover:shadow-[0_1px_6px_rgba(0,0,0,0.08)] transition-all duration-300"
                >
                  <div className="w-14 h-14 rounded-2xl bg-[#E8F3FF] flex items-center justify-center mx-auto mb-5">
                    <Icon size={26} className="text-[#0073EA]" />
                  </div>
                  <h3 className="text-lg font-bold mb-3">{item.title}</h3>
                  <p className="text-[13px] text-[#676879] leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </Section>

      {/* ============================================================ */}
      {/*  PRICING                                                      */}
      {/* ============================================================ */}
      <Section id="pricing" className="py-20 sm:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <p className="text-[13px] font-semibold text-[#0073EA] mb-2">תמחור</p>
            <h2 className="text-3xl sm:text-4xl font-extrabold mb-4">
              תוכנית לכל{" "}
              <span className="bg-gradient-to-l from-[#0073EA] to-[#6161FF] bg-clip-text text-transparent">
                גודל עסק
              </span>
            </h2>
            <p className="text-[#676879] max-w-2xl mx-auto">
              התחילו בחינם, שדרגו כשתגדלו. ללא התחייבות, ללא הפתעות.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 items-stretch">
            {pricingPlans.map((plan, i) => (
              <div
                key={i}
                className={`relative rounded-2xl border p-7 transition-all duration-300 hover:scale-[1.03] ${
                  plan.highlighted
                    ? "bg-gradient-to-b from-[#0073EA]/[0.03] to-[#6161FF]/[0.03] border-[#0073EA]/30 shadow-[0_1px_6px_rgba(0,0,0,0.08)]"
                    : "bg-white border-[#E6E9EF] shadow-[0_1px_6px_rgba(0,0,0,0.08)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.1)]"
                }`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-l from-[#0073EA] to-[#6161FF] text-white text-xs font-bold shadow-[0_1px_6px_rgba(0,0,0,0.08)]">
                    {plan.badge}
                  </div>
                )}
                <h3 className="text-lg font-bold mb-1">{plan.name}</h3>
                <p className="text-xs text-[#676879] mb-4">{plan.desc}</p>
                <div className="mb-6">
                  <span className="text-3xl font-extrabold">{plan.price}</span>
                  <span className="text-[13px] text-[#676879]">{plan.period}</span>
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feat, j) => (
                    <li key={j} className="flex items-center gap-2 text-[13px] text-[#676879]">
                      <Check
                        size={16}
                        className={plan.highlighted ? "text-[#0073EA]" : "text-success"}
                      />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => plan.price === "צרו קשר" ? window.location.href = "mailto:sales@vixy.co.il" : navigate("/register")}
                  className={`w-full py-3 rounded-xl text-[13px] font-bold transition-all duration-300 ${
                    plan.highlighted
                      ? "bg-gradient-to-l from-[#0073EA] to-[#6161FF] text-white hover:shadow-[0_1px_6px_rgba(0,0,0,0.08)]"
                      : "bg-[#F5F6F8] text-[#323338] hover:bg-[#E8F3FF] hover:text-[#0073EA]"
                  }`}
                >
                  {plan.price === "צרו קשר" ? "צרו קשר" : "התחלה חינם"}
                </button>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* ============================================================ */}
      {/*  TESTIMONIALS                                                 */}
      {/* ============================================================ */}
      <Section className="py-20 sm:py-28 bg-[#F5F6F8]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <p className="text-[13px] font-semibold text-[#0073EA] mb-2">המלצות</p>
            <h2 className="text-3xl sm:text-4xl font-extrabold mb-4">
              מה הלקוחות שלנו אומרים
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <div
                key={i}
                className="bg-white/80 backdrop-blur-sm rounded-xl border border-[#E6E9EF] p-6 shadow-[0_1px_6px_rgba(0,0,0,0.08)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.1)] transition-all duration-300"
              >
                {/* Stars */}
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: 5 }).map((_, s) => (
                    <Star key={s} size={16} className="fill-warning text-warning" />
                  ))}
                </div>
                <p className="text-[13px] text-[#676879] leading-relaxed mb-6">
                  &ldquo;{t.text}&rdquo;
                </p>
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-[13px]"
                    style={{ backgroundColor: t.color }}
                  >
                    {t.avatar}
                  </div>
                  <div>
                    <p className="text-[13px] font-bold">{t.name}</p>
                    <p className="text-xs text-[#676879]">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* ============================================================ */}
      {/*  FAQ                                                          */}
      {/* ============================================================ */}
      <Section id="faq" className="py-20 sm:py-28">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <p className="text-[13px] font-semibold text-[#0073EA] mb-2">שאלות נפוצות</p>
            <h2 className="text-3xl sm:text-4xl font-extrabold mb-4">
              יש שאלות? יש לנו תשובות
            </h2>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <div
                key={i}
                className="bg-white/80 backdrop-blur-sm rounded-xl border border-[#E6E9EF] shadow-[0_1px_6px_rgba(0,0,0,0.08)] overflow-hidden"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  aria-expanded={openFaq === i}
                  className="w-full flex items-center justify-between p-5 text-right"
                >
                  <span className="text-[13px] font-bold">{faq.q}</span>
                  <ChevronDown
                    size={18}
                    className={`text-[#676879] transition-transform duration-300 flex-shrink-0 mr-3 ${
                      openFaq === i ? "rotate-180" : ""
                    }`}
                  />
                </button>
                <div
                  className={`overflow-hidden transition-all duration-300 ${
                    openFaq === i ? "max-h-60 pb-5" : "max-h-0"
                  }`}
                >
                  <p className="px-5 text-[13px] text-[#676879] leading-relaxed">
                    {faq.a}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* ============================================================ */}
      {/*  FINAL CTA                                                    */}
      {/* ============================================================ */}
      <section className="relative py-20 sm:py-28 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-bl from-[#0073EA] via-[#6161FF] to-[#0073EA]" />
        <div className="absolute inset-0 opacity-10">
          <div
            className="w-full h-full"
            style={{
              backgroundImage:
                "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
              backgroundSize: "32px 32px",
            }}
          />
        </div>

        <div className="relative max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4">
            מוכנים להתחיל?
          </h2>
          <p className="text-lg text-white/80 mb-8">
            הצטרפו לאלפי עסקים שכבר מנהלים את הלקוחות שלהם עם Vixy.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
            <input
              type="email"
              placeholder="הזינו את המייל שלכם"
              value={ctaEmail}
              onChange={(e) => setCtaEmail(e.target.value)}
              className="flex-1 px-5 py-3.5 rounded-xl bg-white/15 backdrop-blur-sm border border-white/20 text-white placeholder:text-white/50 text-[13px] focus:outline-none focus:ring-2 focus:ring-white/30"
            />
            <button
              onClick={() => navigate(ctaEmail ? `/register?email=${encodeURIComponent(ctaEmail)}` : "/register")}
              className="px-7 py-3.5 bg-white text-[#0073EA] font-bold text-[13px] rounded-[4px] hover:bg-white/90 transition-all duration-300 hover:shadow-lg whitespace-nowrap"
            >
              התחלה חינם
            </button>
          </div>
          <p className="mt-4 text-xs text-white/60 flex items-center justify-center gap-1">
            <Shield size={12} />
            אין צורך בכרטיס אשראי
          </p>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  FOOTER                                                       */}
      {/* ============================================================ */}
      <footer className="bg-[#1a1a2e] text-white/70 pt-16 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
            {/* Brand */}
            <div className="sm:col-span-2 lg:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#0073EA] to-[#6161FF] flex items-center justify-center">
                  <span className="text-white font-bold text-lg">V</span>
                </div>
                <span className="text-xl font-bold text-white">Vixy CRM</span>
              </div>
              <p className="text-[13px] leading-relaxed mb-4 max-w-xs">
                הCRM הישראלי החכם לניהול לקוחות, מכירות ותפעול. פשוט, יפה ויעיל.
              </p>
              <div className="flex gap-3">
                {([
                  { Icon: Twitter, label: "Twitter" },
                  { Icon: Linkedin, label: "LinkedIn" },
                  { Icon: Github, label: "GitHub" },
                ] as const).map(({ Icon, label }, i) => (
                  <a
                    key={i}
                    href="#"
                    aria-label={label}
                    className="w-9 h-9 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
                  >
                    <Icon size={16} />
                  </a>
                ))}
              </div>
            </div>

            {/* Links */}
            {[
              {
                title: "מוצר",
                links: ["תכונות", "תמחור", "אינטגרציות", "עדכונים", "API"],
              },
              {
                title: "חברה",
                links: ["אודות", "בלוג", "קריירה", "צור קשר", "שותפים"],
              },
              {
                title: "משאבים",
                links: ["מרכז עזרה", "תיעוד", "קהילה", "סטטוס", "אבטחה"],
              },
            ].map((col, i) => (
              <div key={i}>
                <h4 className="text-[13px] font-bold text-white mb-4">{col.title}</h4>
                <ul className="space-y-2.5">
                  {col.links.map((link, j) => (
                    <li key={j}>
                      <a
                        href="#"
                        className="text-[13px] hover:text-white transition-colors"
                      >
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="border-t border-white/10 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs">
              &copy; {new Date().getFullYear()} Vixy CRM. כל הזכויות שמורות.
            </p>
            <div className="flex gap-6 text-xs">
              <a href="#" className="hover:text-white transition-colors">
                תנאי שימוש
              </a>
              <a href="#" className="hover:text-white transition-colors">
                מדיניות פרטיות
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
