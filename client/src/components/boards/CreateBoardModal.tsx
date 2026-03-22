import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { LayoutGrid, Users, Handshake, CheckSquare } from "lucide-react";
import { cn } from "../../lib/utils";
import Modal from "../shared/Modal";
import {
  getTemplates,
  createBoard,
} from "../../api/boards";

const ICON_MAP: Record<string, React.ReactNode> = {
  Users: <Users size={28} />,
  Handshake: <Handshake size={28} />,
  CheckSquare: <CheckSquare size={28} />,
  LayoutGrid: <LayoutGrid size={28} />,
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

  const { data: templates = [] } = useQuery({
    queryKey: ["board-templates"],
    queryFn: getTemplates,
    enabled: open,
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
      templateKey: selected || undefined,
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={step === "template" ? "בחר תבנית" : "צור בורד חדש"}
      maxWidth="max-w-[560px]"
      className="max-h-[85vh] overflow-y-auto"
    >
      {step === "template" ? (
        <div className="p-6">
          <p className="text-sm text-[#676879] mb-4">
            בחר תבנית להתחלה או התחל מבורד ריק
          </p>
          <div className="grid grid-cols-2 gap-3">
            {templates.map((tmpl) => (
              <button
                key={tmpl.key}
                onClick={() => handleSelectTemplate(tmpl.key)}
                className={cn(
                  "flex flex-col items-center gap-3 p-5 rounded-xl border-2 transition-all hover:shadow-md text-center",
                  "border-[#E6E9EF] hover:border-[#0073EA]",
                )}
              >
                <div
                  className="w-14 h-14 rounded-xl flex items-center justify-center text-white"
                  style={{ backgroundColor: tmpl.color }}
                >
                  {ICON_MAP[tmpl.icon] || <LayoutGrid size={28} />}
                </div>
                <div>
                  <div className="font-semibold text-[14px] text-[#323338]">
                    {tmpl.name}
                  </div>
                  <div className="text-[12px] text-[#676879] mt-0.5">
                    {tmpl.columnCount} עמודות
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="p-6">
          <button
            onClick={() => setStep("template")}
            className="text-sm text-[#0073EA] hover:underline mb-4 flex items-center gap-1"
          >
            ← חזור לתבניות
          </button>

          {selected && (
            <div className="flex items-center gap-3 mb-5 p-3 bg-[#F5F6F8] rounded-lg">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center text-white"
                style={{
                  backgroundColor:
                    templates.find((t) => t.key === selected)?.color ||
                    "#579BFC",
                }}
              >
                {ICON_MAP[
                  templates.find((t) => t.key === selected)?.icon ||
                    "LayoutGrid"
                ] || <LayoutGrid size={20} />}
              </div>
              <div>
                <div className="text-[13px] font-semibold text-[#323338]">
                  {templates.find((t) => t.key === selected)?.name}
                </div>
                <div className="text-[11px] text-[#676879]">
                  {templates
                    .find((t) => t.key === selected)
                    ?.columns.map((c) => c.label)
                    .join(" · ")}
                </div>
              </div>
            </div>
          )}

          <label className="block text-sm font-medium text-[#323338] mb-1.5">
            שם הבורד
          </label>
          <input
            autoFocus
            className="w-full px-3 py-2.5 border border-[#D0D4E4] rounded-lg text-sm focus:outline-none focus:border-[#0073EA] focus:ring-1 focus:ring-[#0073EA]/20"
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
            className="w-full mt-4 py-2.5 bg-[#0073EA] hover:bg-[#0060C2] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm rounded-lg transition-colors"
          >
            {createMut.isPending ? "יוצר..." : "צור בורד"}
          </button>
        </div>
      )}
    </Modal>
  );
}
