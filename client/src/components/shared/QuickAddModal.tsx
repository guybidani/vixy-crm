import { useState, useEffect, useRef } from "react";
import { X, Users, Handshake, CheckSquare, LayoutGrid, Loader2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { handleMutationError } from "../../lib/utils";
import { createContact } from "../../api/contacts";
import { createDeal } from "../../api/deals";
import { createTask } from "../../api/tasks";
import { listBoards, addBoardGroup, addBoardItem, type BoardSummary } from "../../api/boards";
import { useWorkspaceOptions } from "../../hooks/useWorkspaceOptions";

type TabType = "contact" | "deal" | "task" | "board";

const TABS: { key: TabType; label: string; icon: React.ReactNode; color: string; bg: string }[] = [
  { key: "contact", label: "איש קשר", icon: <Users size={16} />, color: "#6161FF", bg: "#E8E8FF" },
  { key: "deal",    label: "עסקה",    icon: <Handshake size={16} />, color: "#00CA72", bg: "#D6F5E8" },
  { key: "task",    label: "משימה",   icon: <CheckSquare size={16} />, color: "#A25DDC", bg: "#EDE1F5" },
  { key: "board",   label: "פריט בבורד", icon: <LayoutGrid size={16} />, color: "#FDAB3D", bg: "#FEF0D8" },
];

const TASK_TYPES = [
  { key: "CALL",      label: "שיחה" },
  { key: "EMAIL",     label: "אימייל" },
  { key: "MEETING",   label: "פגישה" },
  { key: "WHATSAPP",  label: "וואטסאפ" },
  { key: "FOLLOW_UP", label: "מעקב" },
  { key: "TASK",      label: "משימה כללית" },
];

const INPUT_CLASS =
  "w-full px-3 py-[7px] border border-[#D0D4E4] rounded-[4px] text-[13px] focus:outline-none focus:ring-2 focus:ring-[#0073EA]/20 focus:border-[#0073EA] bg-white";
const SELECT_CLASS =
  "w-full px-3 py-[7px] border border-[#D0D4E4] rounded-[4px] text-[13px] focus:outline-none focus:ring-2 focus:ring-[#0073EA]/20 focus:border-[#0073EA] bg-white";

interface QuickAddModalProps {
  open: boolean;
  onClose: () => void;
}

export default function QuickAddModal({ open, onClose }: QuickAddModalProps) {
  const [tab, setTab] = useState<TabType>("contact");
  const firstInputRef = useRef<HTMLInputElement>(null);

  // Reset + focus when opened, and lock body scroll
  useEffect(() => {
    if (open) {
      setTab("contact");
      setTimeout(() => firstInputRef.current?.focus(), 80);

      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [open]);

  // Escape closes
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const activeTab = TABS.find((t) => t.key === tab)!;

  return (
    <div
      className="fixed inset-0 bg-black/30 z-50 flex items-start justify-center pt-[12vh]"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.2)] w-full max-w-[480px] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="הוספה מהירה"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-3">
          <h2 className="text-[15px] font-semibold text-[#323338]">הוספה מהירה</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-[4px] hover:bg-[#F5F6F8] transition-colors text-[#676879] hover:text-[#323338]"
            aria-label="סגור"
          >
            <X size={16} />
          </button>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 px-4 pb-3 border-b border-[#E6E9EF]">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => {
                setTab(t.key);
                setTimeout(() => firstInputRef.current?.focus(), 60);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] text-[12px] font-medium transition-all ${
                tab === t.key
                  ? "text-white"
                  : "text-[#676879] hover:bg-[#F5F6F8]"
              }`}
              style={tab === t.key ? { backgroundColor: t.color } : undefined}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab icon accent */}
        <div className="px-4 pt-3 pb-1 flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-[4px] flex items-center justify-center"
            style={{ backgroundColor: activeTab.bg, color: activeTab.color }}
          >
            {activeTab.icon}
          </div>
          <span className="text-[13px] font-semibold text-[#323338]">
            {activeTab.label} חדש
          </span>
        </div>

        {/* Forms */}
        <div className="px-4 pt-1 pb-3">
          {tab === "contact" && (
            <ContactForm firstInputRef={firstInputRef} onClose={onClose} />
          )}
          {tab === "deal" && (
            <DealForm firstInputRef={firstInputRef} onClose={onClose} />
          )}
          {tab === "task" && (
            <TaskForm firstInputRef={firstInputRef} onClose={onClose} />
          )}
          {tab === "board" && (
            <BoardItemForm firstInputRef={firstInputRef} onClose={onClose} />
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Contact Form ───────────────────────────────────────────────────────────

function ContactForm({
  firstInputRef,
  onClose,
}: {
  firstInputRef: React.RefObject<HTMLInputElement | null>;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ firstName: "", lastName: "", phone: "", email: "", company: "" });

  const mut = useMutation({
    mutationFn: () =>
      createContact({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        phone: form.phone.trim() || undefined,
        email: form.email.trim() || undefined,
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      toast.success("איש קשר נוצר!");
      onClose();
      navigate(`/contacts/${data.id}`);
    },
    onError: handleMutationError,
  });

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); mut.mutate(); }}
      className="space-y-2.5 mt-2"
    >
      <div className="grid grid-cols-2 gap-2.5">
        <input
          ref={firstInputRef as React.RefObject<HTMLInputElement>}
          type="text"
          placeholder="שם פרטי *"
          value={form.firstName}
          onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
          className={INPUT_CLASS}
          required
        />
        <input
          type="text"
          placeholder="שם משפחה"
          value={form.lastName}
          onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
          className={INPUT_CLASS}
        />
      </div>
      <input
        type="tel"
        placeholder="טלפון"
        value={form.phone}
        onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
        className={INPUT_CLASS}
      />
      <input
        type="email"
        placeholder="אימייל"
        value={form.email}
        onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
        className={INPUT_CLASS}
      />
      <input
        type="text"
        placeholder="חברה"
        value={form.company}
        onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
        className={INPUT_CLASS}
      />
      <FormFooter onClose={onClose} isPending={mut.isPending} />
    </form>
  );
}

// ─── Deal Form ──────────────────────────────────────────────────────────────

function DealForm({
  firstInputRef,
  onClose,
}: {
  firstInputRef: React.RefObject<HTMLInputElement | null>;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { dealStages } = useWorkspaceOptions();
  const [form, setForm] = useState({ title: "", value: "", stage: "LEAD", contact: "" });

  const stageEntries = Object.entries(dealStages);

  const mut = useMutation({
    mutationFn: () =>
      createDeal({
        title: form.title.trim(),
        value: form.value ? parseFloat(form.value) : undefined,
        stage: form.stage,
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["deals"] });
      toast.success("עסקה נוצרה!");
      onClose();
      navigate(`/deals?open=${data.id}`);
    },
    onError: handleMutationError,
  });

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); mut.mutate(); }}
      className="space-y-2.5 mt-2"
    >
      <input
        ref={firstInputRef as React.RefObject<HTMLInputElement>}
        type="text"
        placeholder="שם העסקה *"
        value={form.title}
        onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
        className={INPUT_CLASS}
        required
      />
      <input
        type="number"
        placeholder="שווי (₪)"
        value={form.value}
        onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
        className={INPUT_CLASS}
        min={0}
      />
      <select
        value={form.stage}
        onChange={(e) => setForm((f) => ({ ...f, stage: e.target.value }))}
        className={SELECT_CLASS}
      >
        {stageEntries.map(([key, val]) => (
          <option key={key} value={key}>
            {val.label}
          </option>
        ))}
      </select>
      <input
        type="text"
        placeholder="איש קשר (שם)"
        value={form.contact}
        onChange={(e) => setForm((f) => ({ ...f, contact: e.target.value }))}
        className={INPUT_CLASS}
      />
      <FormFooter onClose={onClose} isPending={mut.isPending} />
    </form>
  );
}

// ─── Task Form ──────────────────────────────────────────────────────────────

function TaskForm({
  firstInputRef,
  onClose,
}: {
  firstInputRef: React.RefObject<HTMLInputElement | null>;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ title: "", taskType: "TASK", dueDate: "", contact: "" });

  const mut = useMutation({
    mutationFn: () =>
      createTask({
        title: form.title.trim(),
        taskType: form.taskType,
        dueDate: form.dueDate || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("משימה נוצרה!");
      onClose();
      navigate("/tasks");
    },
    onError: handleMutationError,
  });

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); mut.mutate(); }}
      className="space-y-2.5 mt-2"
    >
      <input
        ref={firstInputRef as React.RefObject<HTMLInputElement>}
        type="text"
        placeholder="שם המשימה *"
        value={form.title}
        onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
        className={INPUT_CLASS}
        required
      />
      <select
        value={form.taskType}
        onChange={(e) => setForm((f) => ({ ...f, taskType: e.target.value }))}
        className={SELECT_CLASS}
      >
        {TASK_TYPES.map((t) => (
          <option key={t.key} value={t.key}>
            {t.label}
          </option>
        ))}
      </select>
      <input
        type="date"
        value={form.dueDate}
        onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
        className={INPUT_CLASS}
        placeholder="תאריך יעד"
      />
      <input
        type="text"
        placeholder="איש קשר (שם)"
        value={form.contact}
        onChange={(e) => setForm((f) => ({ ...f, contact: e.target.value }))}
        className={INPUT_CLASS}
      />
      <FormFooter onClose={onClose} isPending={mut.isPending} />
    </form>
  );
}

// ─── Board Item Form ─────────────────────────────────────────────────────────

function BoardItemForm({
  firstInputRef,
  onClose,
}: {
  firstInputRef: React.RefObject<HTMLInputElement | null>;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [boardId, setBoardId] = useState("");
  const [groupId, setGroupId] = useState("");
  const [itemName, setItemName] = useState("");

  const { data: boards, isLoading: loadingBoards } = useQuery({
    queryKey: ["boards-list"],
    queryFn: listBoards,
  });

  // When board selection changes, auto-select first group
  const selectedBoard = boards?.find((b: BoardSummary) => b.id === boardId);

  // We need the full board with groups — use a separate query
  const { data: fullBoard } = useQuery({
    queryKey: ["board", boardId],
    queryFn: async () => {
      const { getBoard } = await import("../../api/boards");
      return getBoard(boardId);
    },
    enabled: !!boardId,
  });

  // Auto-select first board and group
  useEffect(() => {
    if (boards && boards.length > 0 && !boardId) {
      setBoardId(boards[0].id);
    }
  }, [boards, boardId]);

  useEffect(() => {
    if (fullBoard && fullBoard.groups.length > 0) {
      setGroupId(fullBoard.groups[0].id);
    }
  }, [fullBoard]);

  const mut = useMutation({
    mutationFn: () => addBoardItem(boardId, groupId, { name: itemName.trim() }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["board", boardId] });
      toast.success("פריט נוסף לבורד!");
      onClose();
    },
    onError: handleMutationError,
  });

  const canSubmit = !!boardId && !!groupId && !!itemName.trim();

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); if (canSubmit) mut.mutate(); }}
      className="space-y-2.5 mt-2"
    >
      {/* Board selector */}
      {loadingBoards ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 size={18} className="animate-spin text-[#0073EA]" />
        </div>
      ) : (
        <select
          value={boardId}
          onChange={(e) => setBoardId(e.target.value)}
          className={SELECT_CLASS}
          required
        >
          {!boardId && <option value="">בחר בורד...</option>}
          {(boards ?? []).map((b: BoardSummary) => (
            <option key={b.id} value={b.id}>
              {b.icon} {b.name}
            </option>
          ))}
        </select>
      )}

      {/* Group selector */}
      <select
        value={groupId}
        onChange={(e) => setGroupId(e.target.value)}
        className={SELECT_CLASS}
        disabled={!fullBoard}
        required
      >
        {!groupId && <option value="">בחר קבוצה...</option>}
        {(fullBoard?.groups ?? []).map((g) => (
          <option key={g.id} value={g.id}>
            {g.name}
          </option>
        ))}
      </select>

      {/* Item name */}
      <input
        ref={firstInputRef as React.RefObject<HTMLInputElement>}
        type="text"
        placeholder="שם הפריט *"
        value={itemName}
        onChange={(e) => setItemName(e.target.value)}
        className={INPUT_CLASS}
        required
      />

      <FormFooter onClose={onClose} isPending={mut.isPending} disabled={!canSubmit} />
    </form>
  );
}

// ─── Shared footer ───────────────────────────────────────────────────────────

function FormFooter({
  onClose,
  isPending,
  disabled = false,
}: {
  onClose: () => void;
  isPending: boolean;
  disabled?: boolean;
}) {
  return (
    <div className="flex gap-2 pt-1">
      <button
        type="button"
        onClick={onClose}
        className="flex-1 py-[7px] bg-[#F5F6F8] hover:bg-[#E6E9EF] text-[#676879] font-medium rounded-[4px] transition-colors text-[13px]"
      >
        ביטול
      </button>
      <button
        type="submit"
        disabled={isPending || disabled}
        className="flex-1 py-[7px] bg-[#0073EA] hover:bg-[#0060C2] text-white font-medium rounded-[4px] transition-colors text-[13px] disabled:opacity-50 flex items-center justify-center gap-1.5"
      >
        {isPending ? (
          <>
            <Loader2 size={14} className="animate-spin" />
            שומר...
          </>
        ) : (
          "צור"
        )}
      </button>
    </div>
  );
}
