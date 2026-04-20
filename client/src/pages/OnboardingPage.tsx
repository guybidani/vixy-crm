import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Check, ChevronLeft, Sparkles } from "lucide-react";
import { cn } from "../lib/utils";
import * as settingsApi from "../api/settings";
import type { IndustryTemplate } from "../api/settings";
import toast from "react-hot-toast";

// ─── Hardcoded templates (avoid extra network call) ───

const TEMPLATES: Record<string, IndustryTemplate> = {
  sales: {
    name: "\u05DE\u05DB\u05D9\u05E8\u05D5\u05EA B2B",
    icon: "\uD83D\uDCBC",
    description: "\u05E6\u05D5\u05D5\u05EA\u05D9 \u05DE\u05DB\u05D9\u05E8\u05D5\u05EA, SDR, AE",
    moduleLabels: { contacts: "\u05D0\u05E0\u05E9\u05D9 \u05E7\u05E9\u05E8", deals: "\u05E2\u05E1\u05E7\u05D0\u05D5\u05EA", leads: "\u05DC\u05D9\u05D3\u05D9\u05DD", tickets: "\u05EA\u05DE\u05D9\u05DB\u05D4" },
    dealStages: ["\u05DC\u05D9\u05D3", "\u05D4\u05E1\u05DE\u05DB\u05D4", "\u05D4\u05E6\u05E2\u05EA \u05DE\u05D7\u05D9\u05E8", "\u05DE\u05E9\u05D0 \u05D5\u05DE\u05EA\u05DF", "\u05E0\u05E1\u05D2\u05E8-\u05D4\u05E6\u05DC\u05D7\u05D4", "\u05E0\u05E1\u05D2\u05E8-\u05D4\u05E4\u05E1\u05D3"],
    contactStatuses: ["\u05DC\u05D9\u05D3", "\u05DE\u05D5\u05E1\u05DE\u05DA", "\u05DC\u05E7\u05D5\u05D7", "\u05E0\u05D8\u05E9", "\u05DC\u05D0 \u05E4\u05E2\u05D9\u05DC"],
  },
  realestate: {
    name: '\u05E0\u05D3\u05DC"\u05DF',
    icon: "\uD83C\uDFE0",
    description: '\u05E1\u05D5\u05DB\u05E0\u05D5\u05D9\u05D5\u05EA \u05E0\u05D3\u05DC"\u05DF, \u05D9\u05D6\u05DE\u05D9\u05DD',
    moduleLabels: { contacts: "\u05DC\u05E7\u05D5\u05D7\u05D5\u05EA", deals: "\u05E0\u05DB\u05E1\u05D9\u05DD", leads: "\u05DE\u05EA\u05E2\u05E0\u05D9\u05D9\u05E0\u05D9\u05DD", companies: "\u05D9\u05D6\u05DE\u05D9\u05DD", tasks: "\u05D1\u05D9\u05E7\u05D5\u05E8\u05D9\u05DD", tickets: "\u05E4\u05E0\u05D9\u05D5\u05EA" },
    dealStages: ["\u05DE\u05EA\u05E2\u05E0\u05D9\u05D9\u05DF", "\u05D1\u05D9\u05E7\u05D5\u05E8 \u05E8\u05D0\u05E9\u05D5\u05DF", "\u05D1\u05D9\u05E7\u05D5\u05E8 \u05E9\u05E0\u05D9", "\u05D4\u05E6\u05E2\u05D4", "\u05DE\u05E9\u05D0 \u05D5\u05DE\u05EA\u05DF", "\u05E0\u05D7\u05EA\u05DD", "\u05D1\u05D5\u05D8\u05DC"],
    contactStatuses: ["\u05DE\u05EA\u05E2\u05E0\u05D9\u05D9\u05DF", "\u05E4\u05E2\u05D9\u05DC", "\u05E8\u05DB\u05E9", "\u05DE\u05D5\u05E9\u05DB\u05E8", "\u05DC\u05D0 \u05E8\u05DC\u05D5\u05D5\u05E0\u05D8\u05D9"],
  },
  agency: {
    name: "\u05E1\u05D5\u05DB\u05E0\u05D5\u05EA \u05E4\u05E8\u05E1\u05D5\u05DD",
    icon: "\uD83D\uDCE2",
    description: "\u05E7\u05DE\u05E4\u05D9\u05D9\u05E0\u05E8\u05D9\u05DD, \u05DE\u05D3\u05D9\u05D4, \u05E7\u05E8\u05D9\u05D9\u05D0\u05D9\u05D9\u05D8\u05D9\u05D1",
    moduleLabels: { contacts: "\u05DC\u05E7\u05D5\u05D7\u05D5\u05EA", deals: "\u05E7\u05DE\u05E4\u05D9\u05D9\u05E0\u05D9\u05DD", leads: "\u05DC\u05D9\u05D3\u05D9\u05DD", companies: "\u05DE\u05D5\u05EA\u05D2\u05D9\u05DD", tasks: "\u05DE\u05E9\u05D9\u05DE\u05D5\u05EA", tickets: "\u05D1\u05E7\u05E9\u05D5\u05EA" },
    dealStages: ["\u05D1\u05E8\u05D9\u05E3", "\u05D4\u05E6\u05E2\u05D4", "\u05D0\u05D9\u05E9\u05D5\u05E8", "\u05D4\u05E4\u05E7\u05D4", "\u05E4\u05E2\u05D9\u05DC", "\u05E1\u05D9\u05D5\u05DD", "\u05D1\u05D5\u05D8\u05DC"],
    contactStatuses: ["\u05E4\u05D5\u05D8\u05E0\u05E6\u05D9\u05D0\u05DC\u05D9", "\u05E4\u05E2\u05D9\u05DC", "VIP", "\u05D4\u05D5\u05E7\u05E4\u05D0", "\u05E2\u05D6\u05D1"],
  },
  recruitment: {
    name: "\u05D2\u05D9\u05D5\u05E1",
    icon: "\uD83D\uDC65",
    description: "HR, \u05D4\u05E9\u05DE\u05D4, \u05D2\u05D9\u05D5\u05E1 \u05D8\u05DB\u05E0\u05D5\u05DC\u05D5\u05D2\u05D9",
    moduleLabels: { contacts: "\u05DE\u05D5\u05E2\u05DE\u05D3\u05D9\u05DD", deals: "\u05DE\u05E9\u05E8\u05D5\u05EA", leads: "\u05DE\u05D2\u05D5\u05D9\u05E1\u05D9\u05DD", companies: "\u05D7\u05D1\u05E8\u05D5\u05EA \u05DE\u05D2\u05D9\u05D9\u05E1\u05D5\u05EA", tasks: "\u05E8\u05D0\u05D9\u05D5\u05E0\u05D5\u05EA", tickets: "\u05E4\u05E0\u05D9\u05D5\u05EA" },
    dealStages: ["\u05E1\u05D9\u05E0\u05D5\u05DF", "\u05E8\u05D0\u05D9\u05D5\u05DF \u05D8\u05DC\u05E4\u05D5\u05E0\u05D9", "\u05E8\u05D0\u05D9\u05D5\u05DF \u05E8\u05D0\u05E9\u05D5\u05DF", "\u05E8\u05D0\u05D9\u05D5\u05DF \u05E9\u05E0\u05D9", "\u05D4\u05E6\u05E2\u05D4", "\u05D4\u05EA\u05D7\u05D9\u05DC", "\u05E0\u05D3\u05D7\u05D4"],
    contactStatuses: ["\u05DE\u05D5\u05E2\u05DE\u05D3", "\u05D1\u05EA\u05D4\u05DC\u05D9\u05DA", "\u05D4\u05D5\u05E6\u05E2", "\u05D4\u05EA\u05E7\u05D1\u05DC", "\u05E0\u05D3\u05D7\u05D4"],
  },
  coaching: {
    name: "\u05D0\u05D9\u05DE\u05D5\u05DF \u05D5\u05D9\u05D9\u05E2\u05D5\u05E5",
    icon: "\uD83C\uDFAF",
    description: "\u05DE\u05D0\u05DE\u05E0\u05D9\u05DD, \u05D9\u05D5\u05E2\u05E6\u05D9\u05DD, \u05DE\u05D8\u05E4\u05DC\u05D9\u05DD",
    moduleLabels: { contacts: "\u05DE\u05D8\u05D5\u05E4\u05DC\u05D9\u05DD", deals: "\u05EA\u05D5\u05DB\u05E0\u05D9\u05D5\u05EA", leads: "\u05E4\u05E0\u05D9\u05D5\u05EA", companies: "\u05D0\u05E8\u05D2\u05D5\u05E0\u05D9\u05DD", tasks: "\u05DE\u05E4\u05D2\u05E9\u05D9\u05DD", tickets: "\u05E9\u05D0\u05DC\u05D5\u05EA" },
    dealStages: ["\u05E4\u05E0\u05D9\u05D9\u05D4", "\u05E9\u05D9\u05D7\u05EA \u05D4\u05D9\u05DB\u05E8\u05D5\u05EA", "\u05D4\u05E6\u05E2\u05D4", "\u05E4\u05E2\u05D9\u05DC", "\u05D4\u05D5\u05E9\u05DC\u05DD", "\u05D1\u05D5\u05D8\u05DC"],
    contactStatuses: ["\u05E4\u05E0\u05D9\u05D9\u05D4 \u05D7\u05D3\u05E9\u05D4", "\u05E4\u05E2\u05D9\u05DC", "VIP", "\u05E1\u05D9\u05D9\u05DD", "\u05DC\u05D0 \u05E4\u05E2\u05D9\u05DC"],
  },
  ecommerce: {
    name: "\u05DE\u05E1\u05D7\u05E8 \u05D0\u05DC\u05E7\u05D8\u05E8\u05D5\u05E0\u05D9",
    icon: "\uD83D\uDED2",
    description: "\u05D7\u05E0\u05D5\u05D9\u05D5\u05EA \u05D0\u05D5\u05E0\u05DC\u05D9\u05D9\u05DF, D2C",
    moduleLabels: { contacts: "\u05DC\u05E7\u05D5\u05D7\u05D5\u05EA", deals: "\u05D4\u05D6\u05DE\u05E0\u05D5\u05EA", leads: "\u05DE\u05EA\u05E2\u05E0\u05D9\u05D9\u05E0\u05D9\u05DD", companies: "\u05E1\u05E4\u05E7\u05D9\u05DD", tasks: "\u05DE\u05E9\u05DC\u05D5\u05D7\u05D9\u05DD", tickets: "\u05D4\u05D7\u05D6\u05E8\u05D5\u05EA" },
    dealStages: ["\u05E2\u05D2\u05DC\u05D4", "\u05D4\u05D6\u05DE\u05E0\u05D4", "\u05D1\u05EA\u05E9\u05DC\u05D5\u05DD", "\u05E0\u05E9\u05DC\u05D7", "\u05D4\u05D5\u05E9\u05DC\u05DD", "\u05D1\u05D9\u05D8\u05D5\u05DC"],
    contactStatuses: ["\u05D7\u05D3\u05E9", "\u05E4\u05E2\u05D9\u05DC", "VIP", "\u05DC\u05D0 \u05E4\u05E2\u05D9\u05DC", "\u05D7\u05E1\u05D5\u05DD"],
  },
  saas: {
    name: "SaaS / \u05D8\u05DB\u05E0\u05D5\u05DC\u05D5\u05D2\u05D9\u05D4",
    icon: "\uD83D\uDCBB",
    description: "\u05D7\u05D1\u05E8\u05D5\u05EA \u05EA\u05D5\u05DB\u05E0\u05D4, SaaS, \u05E1\u05D8\u05D0\u05E8\u05D8\u05D0\u05E4\u05D9\u05DD",
    moduleLabels: { contacts: "\u05D0\u05E0\u05E9\u05D9 \u05E7\u05E9\u05E8", deals: "\u05E2\u05E1\u05E7\u05D0\u05D5\u05EA", leads: "\u05DC\u05D9\u05D3\u05D9\u05DD", companies: "\u05D7\u05E9\u05D1\u05D5\u05E0\u05D5\u05EA", tasks: "\u05DE\u05E9\u05D9\u05DE\u05D5\u05EA", tickets: "\u05EA\u05DE\u05D9\u05DB\u05D4 \u05D8\u05DB\u05E0\u05D9\u05EA" },
    dealStages: ["Discovery", "Demo", "POC", "Proposal", "Negotiation", "Closed Won", "Closed Lost"],
    contactStatuses: ["Trial", "Active", "Paying", "Churned", "Inactive"],
  },
  education: {
    name: "\u05D7\u05D9\u05E0\u05D5\u05DA \u05D5\u05D4\u05DB\u05E9\u05E8\u05D4",
    icon: "\uD83D\uDCDA",
    description: "\u05DE\u05DB\u05DC\u05DC\u05D5\u05EA, \u05E7\u05D5\u05E8\u05E1\u05D9\u05DD, \u05E1\u05D3\u05E0\u05D0\u05D5\u05EA",
    moduleLabels: { contacts: "\u05EA\u05DC\u05DE\u05D9\u05D3\u05D9\u05DD", deals: "\u05D4\u05E8\u05E9\u05DE\u05D5\u05EA", leads: "\u05DE\u05EA\u05E2\u05E0\u05D9\u05D9\u05E0\u05D9\u05DD", companies: "\u05DE\u05D5\u05E1\u05D3\u05D5\u05EA", tasks: "\u05E9\u05D9\u05E2\u05D5\u05E8\u05D9\u05DD", tickets: "\u05E4\u05E0\u05D9\u05D5\u05EA" },
    dealStages: ["\u05DE\u05EA\u05E2\u05E0\u05D9\u05D9\u05DF", "\u05D9\u05D9\u05E2\u05D5\u05E5", "\u05D4\u05E8\u05E9\u05DE\u05D4", "\u05EA\u05E9\u05DC\u05D5\u05DD", "\u05DC\u05D5\u05DE\u05D3", "\u05E1\u05D9\u05D9\u05DD", "\u05D1\u05D9\u05D8\u05D5\u05DC"],
    contactStatuses: ["\u05DE\u05EA\u05E2\u05E0\u05D9\u05D9\u05DF", "\u05E0\u05E8\u05E9\u05DD", "\u05DC\u05D5\u05DE\u05D3", "\u05D1\u05D5\u05D2\u05E8", "\u05E2\u05D6\u05D1"],
  },
};

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
  "#6161FF",
  "#FDAB3D",
  "#FF642E",
  "#00CA72",
  "#FB275D",
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
              ? "w-8 bg-[#6161FF]"
              : i < current
                ? "w-2 bg-[#6161FF]"
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
}: {
  template: IndustryTemplate;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative group p-5 rounded-xl border-2 text-right transition-all duration-200 cursor-pointer",
        "hover:shadow-lg hover:-translate-y-0.5",
        selected
          ? "border-[#6161FF] bg-[#F0F0FF] shadow-md"
          : "border-gray-200 bg-white hover:border-[#6161FF]/40",
      )}
    >
      {selected && (
        <div className="absolute top-3 left-3 w-6 h-6 bg-[#6161FF] rounded-full flex items-center justify-center">
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
      : ["#579BFC", "#A25DDC", "#00CA72", "#FB275D", "#C4C4C4"];

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
        {"\u05E9\u05DE\u05D5\u05EA \u05DE\u05D5\u05D3\u05D5\u05DC\u05D9\u05DD"}
      </h4>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {Object.entries(labels).map(([key, label]) => (
          <div
            key={key}
            className="flex items-center gap-2 p-2 rounded-lg bg-[#F5F6F8]"
          >
            <div className="w-2 h-2 rounded-full bg-[#6161FF]" />
            <span className="text-[13px] text-[#323338]">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Confetti ───

function createConfetti(container: HTMLElement) {
  const colors = ["#6161FF", "#0073EA", "#00CA72", "#FDAB3D", "#FB275D", "#A25DDC"];
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

  const template = selectedTemplate ? TEMPLATES[selectedTemplate] : null;

  const handleApply = useCallback(async () => {
    if (!selectedTemplate) return;
    setIsApplying(true);
    try {
      await settingsApi.applyTemplate(selectedTemplate);
      setStep(2);
      setShowSuccess(true);
    } catch (err: any) {
      toast.error(err?.message || "\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05D4\u05D7\u05DC\u05EA \u05D4\u05EA\u05D1\u05E0\u05D9\u05EA");
    } finally {
      setIsApplying(false);
    }
  }, [selectedTemplate]);

  const handleSkip = useCallback(async () => {
    try {
      await settingsApi.skipOnboarding();
      navigate("/dashboard", { replace: true });
    } catch {
      navigate("/dashboard", { replace: true });
    }
  }, [navigate]);

  const handleFinish = useCallback(() => {
    navigate("/dashboard", { replace: true });
  }, [navigate]);

  // Fire confetti on success
  useEffect(() => {
    if (showSuccess) {
      const container = document.getElementById("confetti-container");
      if (container) createConfetti(container);
    }
  }, [showSuccess]);

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-[#F5F6F8] via-white to-[#EEF0FF] flex items-center justify-center p-4"
      dir="rtl"
    >
      <div id="confetti-container" className="fixed inset-0 pointer-events-none z-50" />

      <div className="w-full max-w-3xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-[#6161FF] rounded-2xl mb-4 shadow-lg shadow-[#6161FF]/20">
            <span className="text-white text-2xl font-bold">V</span>
          </div>
        </div>

        <StepIndicator current={step} total={3} />

        {/* Step 0: Choose Industry */}
        {step === 0 && (
          <div className="animate-fadeIn">
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-[#323338] mb-2">
                {"\u05DE\u05D4 \u05E1\u05D5\u05D2 \u05D4\u05E2\u05E1\u05E7 \u05E9\u05DC\u05DA?"}
              </h1>
              <p className="text-[15px] text-[#676879]">
                {"\u05E0\u05EA\u05D0\u05D9\u05DD \u05D0\u05EA \u05D4-CRM \u05DC\u05E2\u05E1\u05E7 \u05E9\u05DC\u05DA \u05D1\u05DC\u05D7\u05D9\u05E6\u05EA \u05DB\u05E4\u05EA\u05D5\u05E8"}
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
              {TEMPLATE_ORDER.map((key) => (
                <TemplateCard
                  key={key}
                  template={TEMPLATES[key]}
                  selected={selectedTemplate === key}
                  onClick={() => setSelectedTemplate(key)}
                />
              ))}
            </div>

            <div className="flex items-center justify-between">
              <button
                onClick={handleSkip}
                className="text-[13px] text-[#676879] hover:text-[#323338] transition-colors"
              >
                {"\u05D3\u05DC\u05D2 \u2192"}
              </button>
              <button
                onClick={() => selectedTemplate && setStep(1)}
                disabled={!selectedTemplate}
                className={cn(
                  "px-8 py-2.5 rounded-lg text-[14px] font-medium transition-all duration-200",
                  selectedTemplate
                    ? "bg-[#6161FF] text-white hover:bg-[#5050DD] shadow-md shadow-[#6161FF]/20"
                    : "bg-gray-200 text-gray-400 cursor-not-allowed",
                )}
              >
                {"\u05D4\u05DE\u05E9\u05DA"}
              </button>
            </div>
          </div>
        )}

        {/* Step 1: Preview */}
        {step === 1 && template && (
          <div className="animate-fadeIn">
            <div className="text-center mb-8">
              <div className="text-4xl mb-3">{template.icon}</div>
              <h1 className="text-2xl font-bold text-[#323338] mb-2">
                {template.name}
              </h1>
              <p className="text-[15px] text-[#676879]">
                {"\u05DB\u05DA \u05D9\u05D9\u05E8\u05D0\u05D4 \u05D4-CRM \u05E9\u05DC\u05DA"}
              </p>
            </div>

            <div className="space-y-4 mb-8">
              <ModulePreview labels={template.moduleLabels} />
              <PreviewSection
                title={"\u05E9\u05DC\u05D1\u05D9 \u05E2\u05E1\u05E7\u05D4"}
                items={template.dealStages}
                type="stages"
              />
              <PreviewSection
                title={"\u05E1\u05D8\u05D8\u05D5\u05E1\u05D9 \u05D0\u05E0\u05E9\u05D9 \u05E7\u05E9\u05E8"}
                items={template.contactStatuses}
                type="statuses"
              />
            </div>

            <div className="flex items-center justify-between">
              <button
                onClick={() => setStep(0)}
                className="flex items-center gap-1.5 text-[13px] text-[#676879] hover:text-[#323338] transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                {"\u05D7\u05D6\u05E8\u05D4"}
              </button>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleSkip}
                  className="text-[13px] text-[#676879] hover:text-[#323338] transition-colors"
                >
                  {"\u05D3\u05DC\u05D2"}
                </button>
                <button
                  onClick={handleApply}
                  disabled={isApplying}
                  className="px-8 py-2.5 rounded-lg text-[14px] font-medium bg-[#6161FF] text-white hover:bg-[#5050DD] shadow-md shadow-[#6161FF]/20 transition-all duration-200 disabled:opacity-60"
                >
                  {isApplying ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      {"\u05DE\u05D7\u05D9\u05DC..."}
                    </span>
                  ) : (
                    "\u05D4\u05D7\u05DC \u05EA\u05D1\u05E0\u05D9\u05EA"
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Success */}
        {step === 2 && (
          <div className="animate-fadeIn text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-[#E8FFE8] rounded-full mb-6">
              <div className="w-14 h-14 bg-[#00CA72] rounded-full flex items-center justify-center shadow-lg shadow-[#00CA72]/30">
                <Check className="w-8 h-8 text-white" strokeWidth={3} />
              </div>
            </div>

            <h1 className="text-2xl font-bold text-[#323338] mb-2">
              {"\u05D4-CRM \u05E9\u05DC\u05DA \u05DE\u05D5\u05DB\u05DF!"}
            </h1>
            <p className="text-[15px] text-[#676879] mb-2">
              {template
                ? `\u05D4\u05EA\u05D1\u05E0\u05D9\u05EA "${template.name}" \u05D4\u05D5\u05D7\u05DC\u05D4 \u05D1\u05D4\u05E6\u05DC\u05D7\u05D4`
                : "\u05D4\u05DB\u05DC \u05DE\u05D5\u05DB\u05DF"}
            </p>
            <p className="text-[13px] text-[#9699A6] mb-8">
              {"\u05EA\u05D5\u05DB\u05DC \u05DC\u05E9\u05E0\u05D5\u05EA \u05D0\u05EA \u05D4\u05D4\u05D2\u05D3\u05E8\u05D5\u05EA \u05D1\u05DB\u05DC \u05E2\u05EA \u05D1\u05D4\u05D2\u05D3\u05E8\u05D5\u05EA"}
            </p>

            <button
              onClick={handleFinish}
              className="inline-flex items-center gap-2 px-10 py-3 rounded-xl text-[15px] font-bold bg-[#6161FF] text-white hover:bg-[#5050DD] shadow-lg shadow-[#6161FF]/25 transition-all duration-200 hover:shadow-xl hover:-translate-y-0.5"
            >
              <Sparkles className="w-5 h-5" />
              {"\u05D4\u05EA\u05D7\u05DC \u05DC\u05E2\u05D1\u05D5\u05D3"}
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
      `}</style>
    </div>
  );
}
