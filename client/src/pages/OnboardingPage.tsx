import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Check, ChevronLeft, Sparkles } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { cn } from "../lib/utils";
import {
  applyTemplate,
  getIndustryTemplates,
  populateDemoData,
  skipOnboarding,
  type IndustryTemplate,
} from "../api/settings";
import { handleMutationError } from "../lib/utils";

// ─── Industry templates are fetched from the server's getIndustryTemplates() ───
// The server is the source of truth (INDUSTRY_TEMPLATES in settings.service.ts).
// We cache with staleTime: Infinity — the template catalog is effectively static
// within a session, and re-fetching on re-mount would be wasted work.
//
// Server response shape is { templates: Record<string, IndustryTemplate> } —
// a keyed object, not an array. The id is the record key (e.g. "sales").
// Display order for the UI; each key must exist in the server response.
const TEMPLATE_ORDER = [
  "sales",
  "realestate",
  "agency",
  "recruitment",
  "coaching",
  "ecommerce",
  "saas",
  "education",
];

const STAGE_COLORS = [
  "#579BFC",
  "#A25DDC",
  "#0073EA",
  "#FDAB3D",
  "#FF642E",
  "#00C875",
  "#E2445C",
  "#C4C4C4",
];

// ─── Components ───

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2 justify-center mb-8">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={cn(
            "h-2 rounded-full transition-all duration-500",
            i === current
              ? "w-8 bg-[#0073EA]"
              : i < current
                ? "w-2 bg-[#0073EA]"
                : "w-2 bg-gray-200",
          )}
        />
      ))}
    </div>
  );
}

function TemplateCard({
  template,
  selected,
  onClick,
  onKeyDown,
  tabIndex,
  cardRef,
}: {
  template: IndustryTemplate;
  selected: boolean;
  onClick: () => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLButtonElement>) => void;
  tabIndex: number;
  cardRef: (el: HTMLButtonElement | null) => void;
}) {
  return (
    <button
      ref={cardRef}
      onClick={onClick}
      onKeyDown={onKeyDown}
      role="radio"
      aria-checked={selected}
      tabIndex={tabIndex}
      className={cn(
        "relative group p-5 rounded-xl border-2 text-right transition-all duration-200 cursor-pointer",
        "hover:shadow-lg hover:-translate-y-0.5",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0073EA] focus-visible:ring-offset-2",
        selected
          ? "border-[#0073EA] bg-[#CCE5FF] shadow-md"
          : "border-gray-200 bg-white hover:border-[#0073EA]/40",
      )}
    >
      {selected && (
        <div className="absolute top-3 left-3 w-6 h-6 bg-[#0073EA] rounded-full flex items-center justify-center">
          <Check className="w-4 h-4 text-white" />
        </div>
      )}
      <div className="text-3xl mb-3">{template.icon}</div>
      <h3 className="text-[15px] font-bold text-[#323338] mb-1">
        {template.name}
      </h3>
      <p className="text-[13px] text-[#676879] leading-relaxed">
        {template.description}
      </p>
    </button>
  );
}

function PreviewSection({
  title,
  items,
  type,
}: {
  title: string;
  items: string[];
  type: "stages" | "statuses";
}) {
  const colors =
    type === "stages"
      ? STAGE_COLORS
      : ["#579BFC", "#A25DDC", "#00C875", "#E2445C", "#C4C4C4"];

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h4 className="text-[13px] font-bold text-[#676879] mb-3 uppercase tracking-wide">
        {title}
      </h4>
      <div className="flex flex-wrap gap-2">
        {items.map((item, i) => (
          <span
            key={item}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-medium"
            style={{
              backgroundColor: `${colors[i % colors.length]}18`,
              color: colors[i % colors.length],
            }}
          >
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: colors[i % colors.length] }}
            />
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

function ModulePreview({ labels }: { labels: Record<string, string> }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h4 className="text-[13px] font-bold text-[#676879] mb-3 uppercase tracking-wide">
        שמות מודולים
      </h4>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {Object.entries(labels).map(([key, label]) => (
          <div
            key={key}
            className="flex items-center gap-2 p-2 rounded-lg bg-[#F6F7FB]"
          >
            <div className="w-2 h-2 rounded-full bg-[#0073EA]" />
            <span className="text-[13px] text-[#323338]">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Confetti ───

function createConfetti(container: HTMLElement) {
  const colors = ["#0073EA", "#0073EA", "#00C875", "#FDAB3D", "#E2445C", "#A25DDC"];
  const count = 80;

  for (let i = 0; i < count; i++) {
    const el = document.createElement("div");
    const color = colors[Math.floor(Math.random() * colors.length)];
    const size = Math.random() * 8 + 4;
    const isCircle = Math.random() > 0.5;

    el.style.cssText = `
      position: fixed;
      width: ${size}px;
      height: ${isCircle ? size : size * 2.5}px;
      background: ${color};
      border-radius: ${isCircle ? "50%" : "2px"};
      top: -20px;
      left: ${Math.random() * 100}%;
      z-index: 9999;
      pointer-events: none;
      opacity: 1;
    `;

    container.appendChild(el);

    const duration = Math.random() * 2000 + 1500;
    const xDrift = (Math.random() - 0.5) * 200;
    const rotation = Math.random() * 720 - 360;

    el.animate(
      [
        { transform: "translateY(0) translateX(0) rotate(0deg)", opacity: 1 },
        {
          transform: `translateY(${window.innerHeight + 50}px) translateX(${xDrift}px) rotate(${rotation}deg)`,
          opacity: 0,
        },
      ],
      {
        duration,
        easing: "cubic-bezier(0.25, 0.46, 0.45, 0.94)",
        fill: "forwards",
        delay: Math.random() * 400,
      },
    ).onfinish = () => el.remove();
  }
}

// ─── Main Component ───

export default function OnboardingPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [isApplying, setIsApplying] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  // Default ON: most first-time users benefit from seeing a populated
  // workspace rather than staring at an empty board. Easy to turn off.
  const [populateSamples, setPopulateSamples] = useState(true);

  // Fetch the industry template catalog from the server. The catalog is
  // effectively static — cache forever within the session.
  const {
    data: templatesData,
    isLoading: templatesLoading,
    isError: templatesError,
  } = useQuery({
    queryKey: ["industry-templates"],
    queryFn: getIndustryTemplates,
    staleTime: Infinity,
  });

  const templates = useMemo<Record<string, IndustryTemplate>>(
    () => templatesData?.templates ?? {},
    [templatesData],
  );

  const template = selectedTemplate ? templates[selectedTemplate] ?? null : null;

  // Refs for focus management on step change
  const step0HeadingRef = useRef<HTMLHeadingElement>(null);
  const step1HeadingRef = useRef<HTMLHeadingElement>(null);
  const step2HeadingRef = useRef<HTMLHeadingElement>(null);

  // Refs for keyboard navigation between template cards
  const cardRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const handleApply = useCallback(async () => {
    if (!selectedTemplate) return;
    setIsApplying(true);
    try {
      await applyTemplate(selectedTemplate);

      // Fire-and-forget: the server returns 202 immediately and generates
      // the rows in the background. We intentionally don't await this — the
      // user shouldn't stare at a spinner while rows are bulk-inserted.
      if (populateSamples) {
        populateDemoData(selectedTemplate).catch((err) => {
          // Non-fatal: template was applied, just the samples failed.
          // eslint-disable-next-line no-console
          console.warn("populateDemoData failed", err);
        });
      }

      setStep(2);
      setShowSuccess(true);
    } catch (err) {
      handleMutationError(err, "שגיאה בהחלת התבנית");
    } finally {
      setIsApplying(false);
    }
  }, [selectedTemplate, populateSamples]);

  const handleSkip = useCallback(async () => {
    try {
      await skipOnboarding();
      navigate("/dashboard", { replace: true });
    } catch (err) {
      handleMutationError(err, "שגיאה בדילוג");
    }
  }, [navigate]);

  const handleFinish = useCallback(() => {
    navigate("/dashboard", { replace: true });
  }, [navigate]);

  // Focus heading on step change for screen reader announcement
  useEffect(() => {
    const refs = [step0HeadingRef, step1HeadingRef, step2HeadingRef];
    const target = refs[step]?.current;
    if (target) {
      target.focus();
    }
  }, [step]);

  // Visible templates in rendered order — filtered to those the server
  // actually returned so keyboard nav can't land on a missing key.
  const visibleTemplateKeys = useMemo(
    () => TEMPLATE_ORDER.filter((key) => templates[key]),
    [templates],
  );

  // Keyboard arrow-key navigation between template cards
  const handleCardKeyDown = useCallback(
    (index: number) => (e: React.KeyboardEvent<HTMLButtonElement>) => {
      const lastIndex = visibleTemplateKeys.length - 1;
      if (lastIndex < 0) return;
      let nextIndex = -1;
      // RTL: visually "right" = previous, "left" = next. But per radiogroup
      // semantics, use Left/Right for horizontal and Up/Down for vertical.
      switch (e.key) {
        case "ArrowRight":
        case "ArrowDown":
          nextIndex = index === lastIndex ? 0 : index + 1;
          break;
        case "ArrowLeft":
        case "ArrowUp":
          nextIndex = index === 0 ? lastIndex : index - 1;
          break;
        case "Home":
          nextIndex = 0;
          break;
        case "End":
          nextIndex = lastIndex;
          break;
        default:
          return;
      }
      e.preventDefault();
      const nextKey = visibleTemplateKeys[nextIndex];
      setSelectedTemplate(nextKey);
      cardRefs.current[nextIndex]?.focus();
    },
    [visibleTemplateKeys],
  );

  // Fire confetti on success — respect prefers-reduced-motion
  useEffect(() => {
    if (!showSuccess) return;
    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) return;
    const container = document.getElementById("confetti-container");
    if (container) createConfetti(container);
  }, [showSuccess]);

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-[#F6F7FB] via-white to-[#EEF0FF] flex items-center justify-center p-4"
      dir="rtl"
    >
      <div id="confetti-container" className="fixed inset-0 pointer-events-none z-50" aria-hidden="true" />

      <div className="w-full max-w-3xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-[#0073EA] rounded-2xl mb-4 shadow-lg shadow-[#0073EA]/20">
            <span className="text-white text-2xl font-bold">V</span>
          </div>
        </div>

        <StepIndicator current={step} total={3} />

        {/* Step 0: Choose Industry */}
        {step === 0 && (
          <div className="animate-fadeIn">
            <div className="text-center mb-8">
              <h1
                ref={step0HeadingRef}
                tabIndex={-1}
                className="text-2xl font-bold text-[#323338] mb-2 focus:outline-none"
              >
                מה סוג העסק שלך?
              </h1>
              <p className="text-[15px] text-[#676879]">
                נתאים את ה-CRM לעסק שלך בלחיצת כפתור
              </p>
            </div>

            {templatesLoading ? (
              <div
                role="status"
                aria-label="טוען תבניות"
                className="flex items-center justify-center py-16 mb-8"
              >
                <span className="w-8 h-8 border-2 border-[#0073EA]/20 border-t-[#0073EA] rounded-full animate-spin" />
              </div>
            ) : templatesError ? (
              <div
                role="alert"
                className="mb-8 p-4 rounded-xl border border-[#E2445C]/30 bg-[#FFF0F3] text-center"
              >
                <p className="text-[14px] font-bold text-[#E2445C] mb-1">
                  שגיאה בטעינת התבניות
                </p>
                <p className="text-[13px] text-[#676879]">
                  נסה לרענן את העמוד. אם הבעיה נמשכת, אפשר לדלג ולהגדיר ידנית.
                </p>
              </div>
            ) : (
              <div
                role="radiogroup"
                aria-label="בחר תבנית ענף"
                className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8"
              >
                {visibleTemplateKeys.map((key, i) => {
                  const isSelected = selectedTemplate === key;
                  // Roving tabindex: if nothing selected, only the first is tabbable;
                  // otherwise the selected card is the single tab stop.
                  const tabIndex = isSelected || (!selectedTemplate && i === 0) ? 0 : -1;
                  return (
                    <TemplateCard
                      key={key}
                      template={templates[key]}
                      selected={isSelected}
                      onClick={() => setSelectedTemplate(key)}
                      onKeyDown={handleCardKeyDown(i)}
                      tabIndex={tabIndex}
                      cardRef={(el) => {
                        cardRefs.current[i] = el;
                      }}
                    />
                  );
                })}
              </div>
            )}

            <div className="flex items-center justify-between">
              <button
                onClick={handleSkip}
                className="text-[13px] text-[#676879] hover:text-[#323338] transition-colors rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0073EA] focus-visible:ring-offset-2 px-1"
              >
                דלג →
              </button>
              <button
                onClick={() => selectedTemplate && setStep(1)}
                disabled={!selectedTemplate}
                className={cn(
                  "px-8 py-2.5 rounded-lg text-[14px] font-medium transition-all duration-200",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0073EA] focus-visible:ring-offset-2",
                  selectedTemplate
                    ? "bg-[#0073EA] text-white hover:bg-[#0060C2] shadow-md shadow-[#0073EA]/20"
                    : "bg-gray-200 text-gray-400 cursor-not-allowed",
                )}
              >
                המשך
              </button>
            </div>
          </div>
        )}

        {/* Step 1: Preview */}
        {step === 1 && template && (
          <div className="animate-fadeIn">
            <div className="text-center mb-8">
              <div className="text-4xl mb-3">{template.icon}</div>
              <h1
                ref={step1HeadingRef}
                tabIndex={-1}
                className="text-2xl font-bold text-[#323338] mb-2 focus:outline-none"
              >
                {template.name}
              </h1>
              <p className="text-[15px] text-[#676879]">
                כך ייראה ה-CRM שלך
              </p>
            </div>

            <div className="space-y-4 mb-6">
              <ModulePreview labels={template.moduleLabels} />
              <PreviewSection
                title="שלבי עסקה"
                items={template.dealStages}
                type="stages"
              />
              <PreviewSection
                title="סטטוסי אנשי קשר"
                items={template.contactStatuses}
                type="statuses"
              />
            </div>

            {/* Populate-with-demo-data toggle. Default ON — an empty CRM on
                day one feels broken. Rendered as a labelled container so the
                entire row is clickable (bigger hit target on touch). */}
            <label
              className={cn(
                "flex items-start gap-3 p-4 mb-6 rounded-xl border-2 cursor-pointer transition-all duration-200",
                populateSamples
                  ? "border-[#0073EA] bg-[#CCE5FF]"
                  : "border-gray-200 bg-white hover:border-[#0073EA]/40",
              )}
            >
              <input
                type="checkbox"
                checked={populateSamples}
                onChange={(e) => setPopulateSamples(e.target.checked)}
                className="mt-0.5 w-5 h-5 accent-[#0073EA] cursor-pointer"
              />
              <div className="flex-1 text-right">
                <div className="text-[14px] font-bold text-[#323338] mb-0.5">
                  מלא נתוני דוגמה
                </div>
                <div className="text-[13px] text-[#676879] leading-relaxed">
                  נוסיף לך חברות, אנשי קשר ועסקאות לדוגמה שמתאימים לתחום שבחרת — כדי שתוכל להתנסות מיד. אפשר למחוק בכל עת.
                </div>
              </div>
            </label>

            <div className="flex items-center justify-between">
              <button
                onClick={() => setStep(0)}
                className="flex items-center gap-1.5 text-[13px] text-[#676879] hover:text-[#323338] transition-colors rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0073EA] focus-visible:ring-offset-2 px-1"
              >
                <ChevronLeft className="w-4 h-4" />
                חזרה
              </button>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleSkip}
                  className="text-[13px] text-[#676879] hover:text-[#323338] transition-colors rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0073EA] focus-visible:ring-offset-2 px-1"
                >
                  דלג
                </button>
                <button
                  onClick={handleApply}
                  disabled={isApplying}
                  className="px-8 py-2.5 rounded-lg text-[14px] font-medium bg-[#0073EA] text-white hover:bg-[#0060C2] shadow-md shadow-[#0073EA]/20 transition-all duration-200 disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0073EA] focus-visible:ring-offset-2"
                >
                  {isApplying ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      מחיל...
                    </span>
                  ) : (
                    "החל תבנית"
                  )}
                </button>
              </div>
            </div>

            {/* aria-live region for applying state */}
            <div role="status" aria-live="polite" className="sr-only">
              {isApplying ? "מחיל את התבנית, אנא המתן" : ""}
            </div>
          </div>
        )}

        {/* Step 2: Success */}
        {step === 2 && (
          <div className="animate-fadeIn text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-[#E8FFE8] rounded-full mb-6">
              <div className="w-14 h-14 bg-[#00C875] rounded-full flex items-center justify-center shadow-lg shadow-[#00C875]/30">
                <Check className="w-8 h-8 text-white" strokeWidth={3} />
              </div>
            </div>

            <div role="status" aria-live="polite">
              <h1
                ref={step2HeadingRef}
                tabIndex={-1}
                className="text-2xl font-bold text-[#323338] mb-2 focus:outline-none"
              >
                ה-CRM שלך מוכן!
              </h1>
              <p className="text-[15px] text-[#676879] mb-2">
                {template
                  ? `התבנית "${template.name}" הוחלה בהצלחה`
                  : "הכל מוכן"}
              </p>
            </div>
            <p className="text-[13px] text-[#9699A6] mb-8">
              תוכל לשנות את ההגדרות בכל עת בהגדרות
            </p>

            <button
              onClick={handleFinish}
              className="inline-flex items-center gap-2 px-10 py-3 rounded-xl text-[15px] font-bold bg-[#0073EA] text-white hover:bg-[#0060C2] shadow-lg shadow-[#0073EA]/25 transition-all duration-200 hover:shadow-xl hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0073EA] focus-visible:ring-offset-2"
            >
              <Sparkles className="w-5 h-5" />
              התחל לעבוד
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.4s ease-out;
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-fadeIn {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}
