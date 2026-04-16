import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { LayoutGrid, Users, Handshake, CheckSquare, Calendar, ChevronLeft } from "lucide-react";
import toast from "react-hot-toast";
import { cn } from "../../lib/utils";
import Modal from "../shared/Modal";
import {
  getTemplates,
  createBoard,
} from "../../api/boards";
import type { BoardTemplate } from "../../api/boards";

const ICON_MAP: Record<string, React.ReactNode> = {
  Users: <Users size={26} />,
  Handshake: <Handshake size={26} />,
  CheckSquare: <CheckSquare size={26} />,
  LayoutGrid: <LayoutGrid size={26} />,
  Calendar: <Calendar size={26} />,
};

// Client-side descriptions and ordering (server may not send description yet)
const TEMPLATE_META: Record<string, { description: string; order: number }> = {
  blank: { description: "בורד ריק — בנה את העמודות שלך", order: 0 },
  sales_pipeline: { description: "נהל עסקאות ולידים לאורך כל מחזור המכירה", order: 1 },
  project_management: { description: "עקוב אחר משימות, עדיפויות ואחריות הצוות", order: 2 },
  lead_tracking: { description: "קלוט לידים, עקוב אחר מקור ותזמן פגישות", order: 3 },
  weekly_tasks: { description: "ארגן את משימות השבוע לפי יום ואחריות", order: 4 },
};

interface CreateBoardModalProps {
  open: boolean;
  onClose: () => void;
}

export default function CreateBoardModal({
  open,
  onClose,
}: CreateBoardModalProps) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [selected, setSelected] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [step, setStep] = useState<"template" | "name">("template");

  const { data: rawTemplates = [] } = useQuery({
    queryKey: ["board-templates"],
    queryFn: getTemplates,
    enabled: open,
  });

  // Sort by client-side order
  const templates = [...rawTemplates].sort((a, b) => {
    const oa = TEMPLATE_META[a.key]?.order ?? 99;
    const ob = TEMPLATE_META[b.key]?.order ?? 99;
    return oa - ob;
  });

  const createMut = useMutation({
    mutationFn: createBoard,
    onSuccess: (board) => {
      qc.invalidateQueries({ queryKey: ["boards"] });
      onClose();
      setStep("template");
      setSelected(null);
      setName("");
      navigate(`/boards/${board.id}`);
    },
    onError: () => toast.error("שגיאה ביצירת לוח"),
  });

  if (!open) return null;

  const handleSelectTemplate = (key: string) => {
    setSelected(key);
    const tmpl = templates.find((t) => t.key === key);
    setName(tmpl?.name || "");
    setStep("name");
  };

  const handleCreate = () => {
    if (!name.trim()) return;
    createMut.mutate({
      name: name.trim(),
      templateKey: selected === "blank" ? undefined : (selected || undefined),
    });
  };

  const selectedTemplate = templates.find((t) => t.key === selected);

  // Separate blank from the rest
  const blankTemplate = templates.find((t) => t.key === "blank");
  const namedTemplates = templates.filter((t) => t.key !== "blank");

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={step === "template" ? "בחר תבנית" : "צור בורד חדש"}
      maxWidth="max-w-[620px]"
      className="max-h-[90vh] overflow-y-auto"
    >
      {step === "template" ? (
        <div className="p-6">
          <p className="text-sm text-[#676879] mb-5">
            בחר תבנית להתחלה מהירה, או התחל מבורד ריק
          </p>

          {/* Named templates grid */}
          <div className="grid grid-cols-2 gap-3 mb-3">
            {namedTemplates.map((tmpl) => (
              <TemplateCard
                key={tmpl.key}
                tmpl={tmpl}
                description={TEMPLATE_META[tmpl.key]?.description}
                onSelect={() => handleSelectTemplate(tmpl.key)}
              />
            ))}
          </div>

          {/* Blank board — full width strip */}
          {blankTemplate && (
            <button
              onClick={() => handleSelectTemplate(blankTemplate.key)}
              className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-dashed border-[#C5CAD8] hover:border-[#0073EA] hover:bg-[#F0F7FF] transition-all group"
            >
              <div className="w-10 h-10 rounded-[4px] bg-[#F0F2F5] group-hover:bg-[#D2E8FF] flex items-center justify-center text-[#676879] group-hover:text-[#0073EA] transition-colors flex-shrink-0">
                <LayoutGrid size={20} />
              </div>
              <div className="text-right flex-1">
                <div className="font-semibold text-[14px] text-[#323338] group-hover:text-[#0073EA]">
                  {blankTemplate.name}
                </div>
                <div className="text-[12px] text-[#676879] mt-0.5">
                  {TEMPLATE_META["blank"]?.description}
                </div>
              </div>
            </button>
          )}
        </div>
      ) : (
        <div className="p-6">
          <button
            onClick={() => setStep("template")}
            className="text-sm text-[#0073EA] hover:underline mb-5 flex items-center gap-1"
          >
            <ChevronLeft size={15} />
            חזור לתבניות
          </button>

          {/* Selected template preview */}
          {selectedTemplate && (
            <div className="flex items-start gap-3 mb-5 p-4 bg-[#F5F6F8] rounded-xl border border-[#E6E9EF]">
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center text-white flex-shrink-0"
                style={{ backgroundColor: selectedTemplate.color }}
              >
                {ICON_MAP[selectedTemplate.icon] ?? <LayoutGrid size={22} />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[14px] font-semibold text-[#323338]">
                  {selectedTemplate.name}
                </div>
                <div className="text-[12px] text-[#676879] mt-0.5 mb-2">
                  {TEMPLATE_META[selectedTemplate.key]?.description}
                </div>
                {/* Column chips */}
                {selected !== "blank" && (
                  <div className="flex flex-wrap gap-1.5">
                    {selectedTemplate.columns.map((col) => (
                      <span
                        key={col.key}
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-white border border-[#D0D4E4] text-[#676879]"
                      >
                        {col.label}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          <label className="block text-sm font-medium text-[#323338] mb-1.5">
            שם הבורד
          </label>
          <input
            autoFocus
            className="w-full px-3 py-2.5 border border-[#D0D4E4] rounded-[4px] text-[13px] focus:outline-none focus:border-[#0073EA] focus:ring-1 focus:ring-[#0073EA]/20"
            placeholder="לדוגמה: ניהול לידים"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreate();
            }}
          />

          <button
            onClick={handleCreate}
            disabled={!name.trim() || createMut.isPending}
            className="w-full mt-4 py-2.5 bg-[#0073EA] hover:bg-[#0060C2] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-[13px] rounded-[4px] transition-colors"
          >
            {createMut.isPending ? "יוצר..." : "צור בורד"}
          </button>
        </div>
      )}
    </Modal>
  );
}

// ── Template Card ────────────────────────────────────────────────────

const ICON_MAP_CARD: Record<string, React.ReactNode> = {
  Users: <Users size={24} />,
  Handshake: <Handshake size={24} />,
  CheckSquare: <CheckSquare size={24} />,
  LayoutGrid: <LayoutGrid size={24} />,
  Calendar: <Calendar size={24} />,
};

interface TemplateCardProps {
  tmpl: BoardTemplate;
  description?: string;
  onSelect: () => void;
}

function TemplateCard({ tmpl, description, onSelect }: TemplateCardProps) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        "flex flex-col items-start gap-3 p-4 rounded-xl border-2 transition-all hover:shadow-md text-right w-full",
        "border-[#E6E9EF] hover:border-[#0073EA] hover:bg-[#F0F7FF]",
      )}
    >
      {/* Icon + name row */}
      <div className="flex items-center gap-3 w-full">
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center text-white flex-shrink-0"
          style={{ backgroundColor: tmpl.color }}
        >
          {ICON_MAP_CARD[tmpl.icon] ?? <LayoutGrid size={24} />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-[14px] text-[#323338] leading-snug">
            {tmpl.name}
          </div>
          {description && (
            <div className="text-[11px] text-[#676879] mt-0.5 leading-snug line-clamp-2">
              {description}
            </div>
          )}
        </div>
      </div>

      {/* Column preview chips */}
      <div className="flex flex-wrap gap-1">
        {tmpl.columns.slice(0, 4).map((col) => (
          <span
            key={col.key}
            className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#F0F2F5] text-[#676879] border border-[#E1E4EA]"
          >
            {col.label}
          </span>
        ))}
        {tmpl.columns.length > 4 && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#F0F2F5] text-[#9AABB8]">
            +{tmpl.columns.length - 4}
          </span>
        )}
      </div>
    </button>
  );
}
