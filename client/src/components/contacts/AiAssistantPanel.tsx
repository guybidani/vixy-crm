import { useState, useCallback, useRef, useEffect } from "react";
import {
  Sparkles,
  FileText,
  Mail,
  Lightbulb,
  Loader2,
  Copy,
  Check,
  AlertCircle,
  X,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import {
  getAiHealth,
  summarizeContact,
  draftEmail,
  suggestAction,
} from "../../api/ai";

interface AiAssistantPanelProps {
  contactId: string;
  contactName: string;
}

type AiAction = "summarize" | "draft-email" | "suggest-action" | null;

export default function AiAssistantPanel({ contactId, contactName }: AiAssistantPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [activeAction, setActiveAction] = useState<AiAction>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [emailContext, setEmailContext] = useState("");
  const [showEmailInput, setShowEmailInput] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);

  const { data: health } = useQuery({
    queryKey: ["ai-health"],
    queryFn: getAiHealth,
    staleTime: 60_000,
    retry: false,
  });

  const isAvailable = health?.available ?? false;

  const runAction = useCallback(
    (action: AiAction) => {
      if (!action || loading) return;

      setActiveAction(action);
      setLoading(true);
      setResult("");
      setError("");

      const handlers = {
        onChunk: (text: string) => {
          setResult((prev) => prev + text);
        },
        onDone: () => {
          setLoading(false);
        },
        onError: (err: string) => {
          setError(err);
          setLoading(false);
        },
      };

      switch (action) {
        case "summarize":
          summarizeContact(contactId, handlers);
          break;
        case "draft-email":
          draftEmail(contactId, emailContext || undefined, handlers);
          setShowEmailInput(false);
          break;
        case "suggest-action":
          suggestAction(contactId, handlers);
          break;
      }
    },
    [contactId, emailContext, loading],
  );

  // Auto-scroll result into view
  useEffect(() => {
    if (result && resultRef.current) {
      resultRef.current.scrollTop = resultRef.current.scrollHeight;
    }
  }, [result]);

  function handleCopy() {
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleEmailAction() {
    if (showEmailInput) {
      runAction("draft-email");
    } else {
      setShowEmailInput(true);
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-[#E6E9EF] overflow-hidden">
      {/* Header - always visible */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between p-4 hover:bg-[#F5F6F8]/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-gradient-to-br from-[#6C5CE7] to-[#A855F7] rounded-full flex items-center justify-center">
            <Sparkles size={12} className="text-white" />
          </div>
          <h3 className="font-bold text-[#323338]">עוזר AI</h3>
          {!isAvailable && (
            <span className="text-[10px] bg-[#FFF0F0] text-[#E44258] px-1.5 py-0.5 rounded-full font-medium">
              לא זמין
            </span>
          )}
          {isAvailable && (
            <span className="text-[10px] bg-green-50 text-green-600 px-1.5 py-0.5 rounded-full font-medium">
              Gemma 4
            </span>
          )}
        </div>
        {expanded ? (
          <ChevronUp size={16} className="text-[#9699A6]" />
        ) : (
          <ChevronDown size={16} className="text-[#9699A6]" />
        )}
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3">
          {!isAvailable ? (
            <div className="flex items-center gap-2 p-3 bg-[#FFF5F5] rounded-lg">
              <AlertCircle size={14} className="text-[#E44258] flex-shrink-0" />
              <p className="text-[12px] text-[#676879]">
                AI לא זמין — ודא שOllama רץ עם מודל Gemma 4
              </p>
            </div>
          ) : (
            <>
              {/* Action buttons */}
              <div className="grid grid-cols-1 gap-2">
                <ActionButton
                  icon={<FileText size={14} />}
                  label="סכם איש קשר"
                  description="סיכום אוטומטי על בסיס היסטוריה"
                  onClick={() => runAction("summarize")}
                  active={activeAction === "summarize" && loading}
                  disabled={loading}
                />
                <ActionButton
                  icon={<Mail size={14} />}
                  label="טיוטת מייל"
                  description="מייל מעקב מותאם אישית"
                  onClick={handleEmailAction}
                  active={activeAction === "draft-email" && loading}
                  disabled={loading}
                />
                <ActionButton
                  icon={<Lightbulb size={14} />}
                  label="הפעולה הבאה"
                  description="המלצה חכמה לפעולה הבאה"
                  onClick={() => runAction("suggest-action")}
                  active={activeAction === "suggest-action" && loading}
                  disabled={loading}
                />
              </div>

              {/* Email context input */}
              {showEmailInput && !loading && (
                <div className="space-y-2">
                  <textarea
                    autoFocus
                    value={emailContext}
                    onChange={(e) => setEmailContext(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                        e.preventDefault();
                        runAction("draft-email");
                      }
                      if (e.key === "Escape") setShowEmailInput(false);
                    }}
                    placeholder="הקשר נוסף למייל (אופציונלי)..."
                    rows={2}
                    className="w-full px-3 py-2 text-[12px] bg-[#F5F6F8] border border-[#E6E9EF] rounded-lg outline-none focus:ring-2 focus:ring-[#6C5CE7]/20 focus:border-[#6C5CE7] resize-none"
                  />
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-[#9699A6]">Ctrl+Enter לשליחה</span>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => setShowEmailInput(false)}
                        className="px-2 py-0.5 text-[11px] text-[#676879] hover:bg-[#F5F6F8] rounded transition-colors"
                      >
                        ביטול
                      </button>
                      <button
                        onClick={() => runAction("draft-email")}
                        className="px-3 py-0.5 text-[11px] bg-[#6C5CE7] text-white rounded transition-colors hover:bg-[#5B4BD5]"
                      >
                        צור טיוטה
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Result area */}
              {(result || error || loading) && (
                <div className="relative">
                  {/* Close button */}
                  {!loading && (result || error) && (
                    <button
                      onClick={() => {
                        setResult("");
                        setError("");
                        setActiveAction(null);
                      }}
                      className="absolute top-2 left-2 p-1 rounded-full hover:bg-[#F5F6F8] text-[#9699A6] hover:text-[#676879] transition-colors z-10"
                    >
                      <X size={12} />
                    </button>
                  )}

                  <div
                    ref={resultRef}
                    className="bg-gradient-to-br from-[#F8F7FF] to-[#F5F6F8] rounded-lg p-3 max-h-[300px] overflow-y-auto"
                  >
                    {error ? (
                      <div className="flex items-center gap-2 text-[#E44258]">
                        <AlertCircle size={14} />
                        <span className="text-[12px]">{error}</span>
                      </div>
                    ) : (
                      <>
                        {loading && !result && (
                          <div className="flex items-center gap-2 text-[#6C5CE7]">
                            <Loader2 size={14} className="animate-spin" />
                            <span className="text-[12px]">
                              {activeAction === "summarize" && "מסכם את הפרופיל..."}
                              {activeAction === "draft-email" && "כותב טיוטת מייל..."}
                              {activeAction === "suggest-action" && "מנתח ומחפש תובנות..."}
                            </span>
                          </div>
                        )}
                        {result && (
                          <div className="text-[12px] text-[#323338] whitespace-pre-wrap leading-relaxed" dir="rtl">
                            {result}
                            {loading && (
                              <span className="inline-block w-1.5 h-3.5 bg-[#6C5CE7] rounded-sm animate-pulse mr-0.5 align-text-bottom" />
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* Copy button */}
                  {result && !loading && (
                    <button
                      onClick={handleCopy}
                      className="mt-2 flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium text-[#676879] hover:text-[#6C5CE7] hover:bg-[#F8F7FF] rounded transition-colors"
                    >
                      {copied ? (
                        <>
                          <Check size={12} className="text-green-500" />
                          הועתק
                        </>
                      ) : (
                        <>
                          <Copy size={12} />
                          העתק
                        </>
                      )}
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function ActionButton({
  icon,
  label,
  description,
  onClick,
  active,
  disabled,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
  onClick: () => void;
  active: boolean;
  disabled: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full flex items-center gap-3 p-2.5 rounded-lg text-right transition-all ${
        active
          ? "bg-[#6C5CE7]/10 border border-[#6C5CE7]/30"
          : "bg-[#F5F6F8] hover:bg-[#ECEDF0] border border-transparent"
      } ${disabled && !active ? "opacity-50 cursor-not-allowed" : ""}`}
    >
      <div
        className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
          active ? "bg-[#6C5CE7] text-white" : "bg-white text-[#6C5CE7] shadow-sm"
        }`}
      >
        {active ? <Loader2 size={14} className="animate-spin" /> : icon}
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-[12px] font-semibold text-[#323338] block">{label}</span>
        <span className="text-[10px] text-[#9699A6] block">{description}</span>
      </div>
    </button>
  );
}
