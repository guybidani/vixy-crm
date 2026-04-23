import { useState, useEffect, useRef } from "react";
import { X, Users, Handshake, CheckSquare, LayoutGrid, Loader2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { handleMutationError } from "../../lib/utils";
import { createContact } from "../../api/contacts";
import { createDeal } from "../../api/deals";
import { createTask } from "../../api/tasks";
import { listBoards, addBoardItem, type BoardSummary } from "../../api/boards";
import { useWorkspaceOptions } from "../../hooks/useWorkspaceOptions";

type TabType = "contact" | "deal" | "task" | "board";

const TABS: { key: TabType; label: string; icon: React.ReactNode; color: string; bg: string }[] = [
  { key: "contact", label: "איש קשר", icon: <Users size={16} />, color: "#0073EA", bg: "#CCE5FF" },
  { key: "deal",    label: "עסקה",    icon: <Handshake size={16} />, color: "#00C875", bg: "#D6F5E8" },
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

// Monday-style input / select classes defined in globals.css
const INPUT_CLASS = "input";
const SELECT_CLASS = "select";

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
      className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] animate-modal-backdrop"
      onClick={onClose}
      style={{
        backgroundColor: "rgba(0, 0, 0, 0.4)",
        backdropFilter: "blur(4px)",
        WebkitBackdropFilter: "blur(4px)",
      }}
    >
      <div
        className="bg-white rounded-[8px] w-full max-w-[480px] overflow-hidden animate-modal-spring"
        style={{ boxShadow: "0 16px 48px rgba(0, 0, 0, 0.18)" }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="הוספה מהירה"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E6E9EF]">
          <h2 className="text-[20px] font-semibold text-[#323338] leading-tight">הוספה מהירה</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-[4px] hover:bg-[#F6F7FB] transition-colors text-[#676879] hover:text-[#323338]"
            aria-label="סגור"
            type="button"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab bar */}
        <div
          className="flex gap-1 px-6 pt-3 pb-3 border-b border-[#E6E9EF]"
          role="tablist"
          aria-label="סוג פריט להוספה"
        >
          {TABS.map((t) => (
            <button
              key={t.key}
              role="tab"
              aria-selected={tab === t.key}
              aria-controls={`quick-add-panel-${t.key}`}
              id={`quick-add-tab-${t.key}`}
              onClick={() => {
                setTab(t.key);
                setTimeout(() => firstInputRef.current?.focus(), 60);
              }}
              onKeyDown={(e) => {
                const idx = TABS.findIndex((x) => x.key === t.key);
                let next: number | null = null;
                if (e.key === "ArrowLeft") next = (idx + 1) % TABS.length;
                else if (e.key === "ArrowRight") next = (idx - 1 + TABS.length) % TABS.length;
                else if (e.key === "Home") next = 0;
                else if (e.key === "End") next = TABS.length - 1;
                if (next !== null) {
                  e.preventDefault();
                  setTab(TABS[next].key);
                  const btn = (e.currentTarget.parentElement as HTMLElement)?.querySelector<HTMLElement>(
                    `[id="quick-add-tab-${TABS[next].key}"]`,
                  );
                  btn?.focus();
                }
              }}
              tabIndex={tab === t.key ? 0 : -1}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] text-[12px] font-medium transition-all ${
                tab === t.key
                  ? "text-white"
                  : "text-[#676879] hover:bg-[#F6F7FB]"
              }`}
              style={tab === t.key ? { backgroundColor: t.color } : undefined}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab icon accent */}
        <div className="px-6 pt-5 pb-1 flex items-center gap-2">
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
        <div
          className="px-6 pt-2 pb-6"
          role="tabpanel"
          id={`quick-add-panel-${tab}`}
          aria-labelledby={`quick-add-tab-${tab}`}
        >
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

  const mut = useMutation<Awaited<ReturnType<typeof createContact>>, Error, void>({
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
    onError: (err) => handleMutationError(err),
  });

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); mut.mutate(); }}
      className="space-y-3 mt-3"
    >
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="form-label">
            שם פרטי<span className="form-required">*</span>
          </label>
          <input
            ref={firstInputRef as React.RefObject<HTMLInputElement>}
            type="text"
            placeholder="יוסי"
            value={form.firstName}
            onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
            className={INPUT_CLASS}
            required
          />
        </div>
        <div>
          <label className="form-label">שם משפחה</label>
          <input
            type="text"
            placeholder="כהן"
            value={form.lastName}
            onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
            className={INPUT_CLASS}
          />
        </div>
      </div>
      <div>
        <label className="form-label">טלפון</label>
        <input
          type="tel"
          placeholder="050-0000000"
          value={form.phone}
          onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
          className={INPUT_CLASS}
        />
      </div>
      <div>
        <label className="form-label">אימייל</label>
        <input
          type="email"
          placeholder="name@example.com"
          value={form.email}
          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          className={INPUT_CLASS}
        />
      </div>
      <div>
        <label className="form-label">חברה</label>
        <input
          type="text"
          placeholder="שם החברה"
          value={form.company}
          onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
          className={INPUT_CLASS}
        />
      </div>
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

  const mut = useMutation<Awaited<ReturnType<typeof createDeal>>, Error, void>({
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
    onError: (err) => handleMutationError(err),
  });

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); mut.mutate(); }}
      className="space-y-3 mt-3"
    >
      <div>
        <label className="form-label">
          שם העסקה<span className="form-required">*</span>
        </label>
        <input
          ref={firstInputRef as React.RefObject<HTMLInputElement>}
          type="text"
          placeholder="לדוגמה: פגישת מכירה חברת XYZ"
          value={form.title}
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          className={INPUT_CLASS}
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="form-label">שווי (₪)</label>
          <input
            type="number"
            placeholder="0"
            value={form.value}
            onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
            className={INPUT_CLASS}
            min={0}
          />
        </div>
        <div>
          <label className="form-label">שלב</label>
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
        </div>
      </div>
      <div>
        <label className="form-label">איש קשר</label>
        <input
          type="text"
          placeholder="שם איש הקשר"
          value={form.contact}
          onChange={(e) => setForm((f) => ({ ...f, contact: e.target.value }))}
          className={INPUT_CLASS}
        />
      </div>
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

  const mut = useMutation<Awaited<ReturnType<typeof createTask>>, Error, void>({
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
    onError: (err) => handleMutationError(err),
  });

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); mut.mutate(); }}
      className="space-y-3 mt-3"
    >
      <div>
        <label className="form-label">
          שם המשימה<span className="form-required">*</span>
        </label>
        <input
          ref={firstInputRef as React.RefObject<HTMLInputElement>}
          type="text"
          placeholder="מה צריך לעשות?"
          value={form.title}
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          className={INPUT_CLASS}
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="form-label">סוג</label>
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
        </div>
        <div>
          <label className="form-label">תאריך יעד</label>
          <input
            type="date"
            value={form.dueDate}
            onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
            className={INPUT_CLASS}
          />
        </div>
      </div>
      <div>
        <label className="form-label">איש קשר</label>
        <input
          type="text"
          placeholder="שם איש הקשר"
          value={form.contact}
          onChange={(e) => setForm((f) => ({ ...f, contact: e.target.value }))}
          className={INPUT_CLASS}
        />
      </div>
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

  const mut = useMutation<Awaited<ReturnType<typeof addBoardItem>>, Error, void>({
    mutationFn: () => addBoardItem(boardId, groupId, { name: itemName.trim() }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["board", boardId] });
      toast.success("פריט נוסף לבורד!");
      onClose();
    },
    onError: (err) => handleMutationError(err),
  });

  const canSubmit = !!boardId && !!groupId && !!itemName.trim();

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); if (canSubmit) mut.mutate(); }}
      className="space-y-3 mt-3"
    >
      {/* Board selector */}
      <div>
        <label className="form-label">
          בורד<span className="form-required">*</span>
        </label>
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
      </div>

      {/* Group selector */}
      <div>
        <label className="form-label">
          קבוצה<span className="form-required">*</span>
        </label>
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
      </div>

      {/* Item name */}
      <div>
        <label className="form-label">
          שם הפריט<span className="form-required">*</span>
        </label>
        <input
          ref={firstInputRef as React.RefObject<HTMLInputElement>}
          type="text"
          placeholder="מה שמו?"
          value={itemName}
          onChange={(e) => setItemName(e.target.value)}
          className={INPUT_CLASS}
          required
        />
      </div>

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
  // RTL: justify-start places the pair on the right (cancel first, primary at the end).
  return (
    <div className="flex items-center justify-start gap-2 pt-4 mt-2 border-t border-[#E6E9EF]">
      <button
        type="button"
        onClick={onClose}
        className="modal-btn-secondary"
      >
        ביטול
      </button>
      <button
        type="submit"
        disabled={isPending || disabled}
        className="modal-btn-primary"
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
