import { useState, useEffect, useRef, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Phone,
  Calendar,
  MessageSquare,
  CheckSquare,
  Search,
  X,
  ChevronDown,
  Repeat,
  TrendingUp,
  Headphones,
  Layers,
} from "lucide-react";
import toast from "react-hot-toast";
import Modal from "../shared/Modal";
import { createTask } from "../../api/tasks";
import { listContacts, type Contact } from "../../api/contacts";
import { listDeals, type Deal } from "../../api/deals";
import { getWorkspaceMembers } from "../../api/auth";
import { useWorkspaceOptions } from "../../hooks/useWorkspaceOptions";
import { useAuth } from "../../hooks/useAuth";

// ── Types ──

interface TaskCreateModalProps {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
  initialContactId?: string;
  initialDealId?: string;
}

type TaskTypeOption = "CALL" | "MEETING" | "WHATSAPP" | "TASK";
type TaskContextOption = "SALES" | "SERVICE" | "GENERAL";

type RecurrenceType = "DAILY" | "WEEKLY" | "BIWEEKLY" | "MONTHLY";

interface FormState {
  title: string;
  taskType: TaskTypeOption;
  taskContext: TaskContextOption;
  description: string;
  dueDate: string;
  dueTime: string;
  priority: string;
  assigneeId: string;
  reminderMinutes: number | "";
  contactId: string;
  dealId: string;
  isRecurring: boolean;
  recurrenceType: RecurrenceType;
  recurrenceDay: number | "";
  recurrenceEndDate: string;
}

// ── Constants ──

const TASK_TYPES: {
  value: TaskTypeOption;
  label: string;
  icon: typeof Phone;
  color: string;
}[] = [
  { value: "CALL", label: "שיחה", icon: Phone, color: "#00CA72" },
  { value: "MEETING", label: "פגישה", icon: Calendar, color: "#A25DDC" },
  { value: "WHATSAPP", label: "ווטסאפ", icon: MessageSquare, color: "#25D366" },
  { value: "TASK", label: "כללי", icon: CheckSquare, color: "#579BFC" },
];

const TASK_CONTEXTS: {
  value: TaskContextOption;
  label: string;
  icon: typeof TrendingUp;
  color: string;
}[] = [
  { value: "SALES", label: "מכירות", icon: TrendingUp, color: "#00CA72" },
  { value: "SERVICE", label: "שירות", icon: Headphones, color: "#FDAB3D" },
  { value: "GENERAL", label: "כללי", icon: Layers, color: "#C3C6D4" },
];

const PRIORITY_OPTIONS: {
  value: string;
  label: string;
  color: string;
}[] = [
  { value: "LOW", label: "נמוך", color: "#C3C6D4" },
  { value: "MEDIUM", label: "בינוני", color: "#579BFC" },
  { value: "HIGH", label: "גבוה", color: "#FDAB3D" },
  { value: "URGENT", label: "דחוף", color: "#FB275D" },
];

const REMINDER_OPTIONS: { value: number; label: string }[] = [
  { value: 15, label: "15 דק׳" },
  { value: 30, label: "30 דק׳" },
  { value: 60, label: "שעה" },
  { value: 120, label: "2 שעות" },
];

const RECURRENCE_OPTIONS: { value: RecurrenceType; label: string }[] = [
  { value: "DAILY", label: "יומי" },
  { value: "WEEKLY", label: "שבועי" },
  { value: "BIWEEKLY", label: "דו-שבועי" },
  { value: "MONTHLY", label: "חודשי" },
];

const WEEKDAYS: { value: number; label: string }[] = [
  { value: 0, label: "א׳" },
  { value: 1, label: "ב׳" },
  { value: 2, label: "ג׳" },
  { value: 3, label: "ד׳" },
  { value: 4, label: "ה׳" },
];

// ── Helpers ──

function toISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function addDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

// ── Searchable Dropdown ──

function SearchableDropdown<T extends { id: string }>({
  label,
  placeholder,
  value,
  onChange,
  items,
  getLabel,
  isLoading,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (id: string) => void;
  items: T[];
  getLabel: (item: T) => string;
  isLoading?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && searchRef.current) searchRef.current.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const filtered = items.filter((item) =>
    getLabel(item).toLowerCase().includes(search.toLowerCase()),
  );

  const selected = items.find((item) => item.id === value);

  return (
    <div className="relative" ref={ref}>
      <label className="block text-xs font-medium text-[#676879] mb-1">
        {label}
      </label>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3 py-2 border border-[#E6E9EF] rounded-[4px] text-[13px] bg-white hover:border-[#0073EA]/50 focus:outline-none focus:ring-2 focus:ring-[#0073EA]/20 transition-colors text-right"
      >
        <span className={selected ? "text-[#323338]" : "text-[#9699A6]"}>
          {selected ? getLabel(selected) : placeholder}
        </span>
        <ChevronDown size={14} className="text-[#9699A6] flex-shrink-0" />
      </button>
      {open && (
        <div className="absolute top-full mt-1 right-0 left-0 z-50 bg-white rounded-[4px] shadow-[0_8px_32px_rgba(0,0,0,0.15)] border border-[#E6E9EF] overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-[#E6E9EF]">
            <Search size={14} className="text-[#9699A6] flex-shrink-0" />
            <input
              ref={searchRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="חיפוש..."
              className="flex-1 text-[13px] outline-none bg-transparent"
            />
          </div>
          <div className="max-h-[180px] overflow-y-auto">
            {value && (
              <button
                type="button"
                onClick={() => {
                  onChange("");
                  setOpen(false);
                  setSearch("");
                }}
                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-[#F5F6F8] transition-colors text-right"
              >
                <X size={14} className="text-[#9699A6]" />
                <span className="text-[12px] text-[#676879]">הסר בחירה</span>
              </button>
            )}
            {isLoading ? (
              <div className="flex items-center justify-center py-4">
                <div className="w-4 h-4 border-2 border-[#0073EA] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-4 text-[12px] text-[#9699A6]">
                לא נמצאו תוצאות
              </div>
            ) : (
              filtered.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onChange(item.id);
                    setOpen(false);
                    setSearch("");
                  }}
                  className={`w-full text-right px-3 py-2 text-[13px] hover:bg-[#F5F6F8] transition-colors ${
                    value === item.id
                      ? "bg-[#E8F3FF] text-[#0073EA] font-medium"
                      : "text-[#323338]"
                  }`}
                >
                  {getLabel(item)}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Component ──

export default function TaskCreateModal({
  open,
  onClose,
  onCreated,
  initialContactId,
  initialDealId,
}: TaskCreateModalProps) {
  const { priorities } = useWorkspaceOptions();
  const { currentWorkspaceId } = useAuth();
  const queryClient = useQueryClient();
  const titleRef = useRef<HTMLInputElement>(null);

  void priorities; // we use our own PRIORITY_OPTIONS for the color dots

  const [form, setForm] = useState<FormState>({
    title: "",
    taskType: "TASK",
    taskContext: initialDealId ? "SALES" : "GENERAL",
    description: "",
    dueDate: "",
    dueTime: "",
    priority: "MEDIUM",
    assigneeId: "",
    reminderMinutes: 15,
    contactId: initialContactId || "",
    dealId: initialDealId || "",
    isRecurring: false,
    recurrenceType: "WEEKLY",
    recurrenceDay: "",
    recurrenceEndDate: "",
  });

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setForm({
        title: "",
        taskType: "TASK",
        taskContext: initialDealId ? "SALES" : "GENERAL",
        description: "",
        dueDate: "",
        dueTime: "",
        priority: "MEDIUM",
        assigneeId: "",
        reminderMinutes: 15,
        contactId: initialContactId || "",
        dealId: initialDealId || "",
        isRecurring: false,
        recurrenceType: "WEEKLY",
        recurrenceDay: "",
        recurrenceEndDate: "",
      });
      setTimeout(() => titleRef.current?.focus(), 100);
    }
  }, [open, initialContactId, initialDealId]);

  // Ctrl+Enter to save
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        if (form.title.trim()) mutation.mutate();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, form]);

  // Data fetching
  const { data: contacts, isLoading: contactsLoading } = useQuery({
    queryKey: ["contacts-dropdown"],
    queryFn: () => listContacts({ limit: 50 }),
    enabled: open,
  });

  const { data: deals, isLoading: dealsLoading } = useQuery({
    queryKey: ["deals-dropdown"],
    queryFn: () => listDeals({ limit: 50 }),
    enabled: open,
  });

  const { data: members } = useQuery({
    queryKey: ["members", currentWorkspaceId],
    queryFn: () => getWorkspaceMembers(currentWorkspaceId!),
    enabled: open && !!currentWorkspaceId,
  });

  const memberOptions = useMemo(
    () => (members || []).map((m) => ({ id: m.memberId, name: m.name })),
    [members],
  );

  const mutation = useMutation({
    mutationFn: () =>
      createTask({
        title: form.title,
        description: form.description || undefined,
        priority: form.priority,
        taskType: form.taskType,
        taskContext: form.taskContext,
        dueDate: form.dueDate || undefined,
        dueTime: form.dueTime || undefined,
        reminderMinutes:
          form.dueTime && form.reminderMinutes !== ""
            ? form.reminderMinutes
            : undefined,
        assigneeId: form.assigneeId || undefined,
        contactId: form.contactId || undefined,
        dealId: form.dealId || undefined,
        isRecurring: form.isRecurring || undefined,
        recurrenceType: form.isRecurring ? form.recurrenceType : undefined,
        recurrenceDay: form.isRecurring && form.recurrenceDay !== "" ? form.recurrenceDay : undefined,
        recurrenceEndDate: form.isRecurring && form.recurrenceEndDate ? new Date(form.recurrenceEndDate).toISOString() : undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["tasks-board"] });
      toast.success("משימה נוצרה בהצלחה!");
      onCreated?.();
      onClose();
    },
    onError: (err: any) => {
      toast.error(err?.message || "שגיאה ביצירת משימה");
    },
  });

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    mutation.mutate();
  }

  const DATE_SHORTCUTS = [
    { label: "היום", value: addDays(0) },
    { label: "מחר", value: addDays(1) },
    { label: "בעוד 3 ימים", value: addDays(3) },
    { label: "בעוד שבוע", value: addDays(7) },
  ];

  return (
    <Modal open={open} onClose={onClose} title="משימה חדשה" maxWidth="max-w-xl">
      <form onSubmit={handleSubmit}>
        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* Title */}
          <input
            ref={titleRef}
            type="text"
            value={form.title}
            onChange={(e) => setField("title", e.target.value)}
            placeholder="מה המשימה? *"
            aria-label="כותרת המשימה"
            className="w-full px-3 py-2.5 border border-[#E6E9EF] rounded-[4px] text-[13px] font-medium focus:outline-none focus:ring-2 focus:ring-[#0073EA]/20 focus:border-[#0073EA] placeholder:text-[#9699A6]"
            required
          />

          {/* Task Type — horizontal button group */}
          <div>
            <label className="block text-xs font-medium text-[#676879] mb-2">
              סוג משימה
            </label>
            <div className="flex gap-2">
              {TASK_TYPES.map((tt) => {
                const Icon = tt.icon;
                const isActive = form.taskType === tt.value;
                return (
                  <button
                    key={tt.value}
                    type="button"
                    onClick={() => setField("taskType", tt.value)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] text-[12px] font-semibold border-2 transition-all"
                    style={
                      isActive
                        ? {
                            backgroundColor: tt.color,
                            color: "#fff",
                            borderColor: tt.color,
                          }
                        : {
                            backgroundColor: "#fff",
                            color: tt.color,
                            borderColor: `${tt.color}60`,
                          }
                    }
                  >
                    <Icon size={14} />
                    <span>{tt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Task Context — sales / service / general */}
          <div>
            <label className="block text-xs font-medium text-[#676879] mb-2">
              הקשר
            </label>
            <div className="flex gap-2">
              {TASK_CONTEXTS.map((tc) => {
                const Icon = tc.icon;
                const isActive = form.taskContext === tc.value;
                return (
                  <button
                    key={tc.value}
                    type="button"
                    onClick={() => setField("taskContext", tc.value)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] text-[12px] font-semibold border-2 transition-all"
                    style={
                      isActive
                        ? {
                            backgroundColor: tc.color,
                            color: "#fff",
                            borderColor: tc.color,
                          }
                        : {
                            backgroundColor: "#fff",
                            color: tc.color,
                            borderColor: `${tc.color}60`,
                          }
                    }
                  >
                    <Icon size={14} />
                    <span>{tc.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-[#676879] mb-1">
              תיאור
            </label>
            <textarea
              value={form.description}
              onChange={(e) => setField("description", e.target.value)}
              placeholder="פרטים נוספים..."
              aria-label="תיאור המשימה"
              rows={2}
              className="w-full px-3 py-2 border border-[#E6E9EF] rounded-[4px] text-[13px] focus:outline-none focus:ring-2 focus:ring-[#0073EA]/20 focus:border-[#0073EA] resize-none placeholder:text-[#9699A6]"
            />
          </div>

          {/* Due Date + shortcuts */}
          <div>
            <label className="block text-xs font-medium text-[#676879] mb-1">
              תאריך יעד
            </label>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              {DATE_SHORTCUTS.map((shortcut) => (
                <button
                  key={shortcut.label}
                  type="button"
                  onClick={() => setField("dueDate", shortcut.value)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all ${
                    form.dueDate === shortcut.value
                      ? "bg-[#0073EA] text-white border-[#0073EA]"
                      : "bg-white border-[#E6E9EF] text-[#676879] hover:border-[#0073EA] hover:text-[#0073EA]"
                  }`}
                >
                  {shortcut.label}
                </button>
              ))}
              {form.dueDate && (
                <button
                  type="button"
                  onClick={() => {
                    setField("dueDate", "");
                    setField("dueTime", "");
                  }}
                  className="p-1 rounded text-[#9699A6] hover:text-[#E44258] transition-colors"
                  title="הסר תאריך"
                >
                  <X size={14} />
                </button>
              )}
            </div>
            <input
              type="date"
              value={form.dueDate}
              onChange={(e) => setField("dueDate", e.target.value)}
              className="w-full px-3 py-2 border border-[#E6E9EF] rounded-[4px] text-[13px] focus:outline-none focus:ring-2 focus:ring-[#0073EA]/20 focus:border-[#0073EA]"
              dir="ltr"
            />
          </div>

          {/* Due Time — only when dueDate is set */}
          {form.dueDate && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[#676879] mb-1">
                  שעה
                </label>
                <input
                  type="time"
                  value={form.dueTime}
                  onChange={(e) => setField("dueTime", e.target.value)}
                  className="w-full px-3 py-2 border border-[#E6E9EF] rounded-[4px] text-[13px] focus:outline-none focus:ring-2 focus:ring-[#0073EA]/20 focus:border-[#0073EA]"
                  dir="ltr"
                />
              </div>
              {/* Reminder — only when dueTime is set */}
              {form.dueTime && (
                <div>
                  <label className="block text-xs font-medium text-[#676879] mb-1">
                    תזכורת
                  </label>
                  <select
                    value={form.reminderMinutes}
                    onChange={(e) =>
                      setField("reminderMinutes", Number(e.target.value))
                    }
                    className="w-full px-3 py-2 border border-[#E6E9EF] rounded-[4px] text-[13px] focus:outline-none focus:ring-2 focus:ring-[#0073EA]/20 focus:border-[#0073EA] bg-white"
                  >
                    {REMINDER_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {/* Priority */}
          <div>
            <label className="block text-xs font-medium text-[#676879] mb-2">
              עדיפות
            </label>
            <div className="flex gap-2">
              {PRIORITY_OPTIONS.map((opt) => {
                const isActive = form.priority === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setField("priority", opt.value)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] text-[12px] font-semibold border transition-all ${
                      isActive
                        ? "bg-white shadow-sm"
                        : "bg-white border-[#E6E9EF] text-[#676879] hover:border-[var(--c)]"
                    }`}
                    style={
                      isActive
                        ? {
                            borderColor: opt.color,
                            color: opt.color,
                            boxShadow: `0 0 0 1px ${opt.color}`,
                          }
                        : ({ "--c": opt.color } as React.CSSProperties)
                    }
                  >
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: opt.color }}
                    />
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Recurring task */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <button
                type="button"
                onClick={() => setField("isRecurring", !form.isRecurring)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] text-[12px] font-semibold border-2 transition-all ${
                  form.isRecurring
                    ? "bg-[#0073EA] text-white border-[#0073EA]"
                    : "bg-white text-[#676879] border-[#E6E9EF] hover:border-[#0073EA] hover:text-[#0073EA]"
                }`}
              >
                <Repeat size={14} />
                <span>חזרה</span>
              </button>
              {form.isRecurring && (
                <span className="text-[11px] text-[#9699A6]">משימה חוזרת</span>
              )}
            </div>
            {form.isRecurring && (
              <div className="space-y-3 p-3 bg-[#F5F6F8] rounded-lg border border-[#E6E9EF]">
                {/* Recurrence type */}
                <div>
                  <label className="block text-xs font-medium text-[#676879] mb-1">
                    תדירות
                  </label>
                  <div className="flex gap-2">
                    {RECURRENCE_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => {
                          setField("recurrenceType", opt.value);
                          setField("recurrenceDay", "");
                        }}
                        className={`px-3 py-1.5 rounded-[4px] text-[12px] font-semibold border transition-all ${
                          form.recurrenceType === opt.value
                            ? "bg-[#0073EA] text-white border-[#0073EA]"
                            : "bg-white border-[#E6E9EF] text-[#676879] hover:border-[#0073EA] hover:text-[#0073EA]"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Weekly: day of week selector (Sun-Thu) */}
                {form.recurrenceType === "WEEKLY" && (
                  <div>
                    <label className="block text-xs font-medium text-[#676879] mb-1">
                      יום בשבוע
                    </label>
                    <div className="flex gap-1.5">
                      {WEEKDAYS.map((day) => (
                        <button
                          key={day.value}
                          type="button"
                          onClick={() => setField("recurrenceDay", day.value)}
                          className={`w-9 h-9 rounded-[4px] text-[12px] font-bold border transition-all ${
                            form.recurrenceDay === day.value
                              ? "bg-[#0073EA] text-white border-[#0073EA]"
                              : "bg-white border-[#E6E9EF] text-[#676879] hover:border-[#0073EA] hover:text-[#0073EA]"
                          }`}
                        >
                          {day.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Monthly: day of month input */}
                {form.recurrenceType === "MONTHLY" && (
                  <div>
                    <label className="block text-xs font-medium text-[#676879] mb-1">
                      יום בחודש
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={28}
                      value={form.recurrenceDay}
                      onChange={(e) =>
                        setField(
                          "recurrenceDay",
                          e.target.value ? Math.min(28, Math.max(1, Number(e.target.value))) : "",
                        )
                      }
                      placeholder="1-28"
                      className="w-24 px-3 py-2 border border-[#E6E9EF] rounded-[4px] text-[13px] focus:outline-none focus:ring-2 focus:ring-[#0073EA]/20 focus:border-[#0073EA]"
                      dir="ltr"
                    />
                  </div>
                )}

                {/* End date */}
                <div>
                  <label className="block text-xs font-medium text-[#676879] mb-1">
                    עד תאריך (אופציונלי)
                  </label>
                  <input
                    type="date"
                    value={form.recurrenceEndDate}
                    onChange={(e) => setField("recurrenceEndDate", e.target.value)}
                    className="w-full px-3 py-2 border border-[#E6E9EF] rounded-[4px] text-[13px] focus:outline-none focus:ring-2 focus:ring-[#0073EA]/20 focus:border-[#0073EA]"
                    dir="ltr"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Assignee — searchable member dropdown */}
          <SearchableDropdown
            label="אחראי"
            placeholder="בחר אחראי..."
            value={form.assigneeId}
            onChange={(id) => setField("assigneeId", id)}
            items={memberOptions}
            getLabel={(m) => m.name}
          />

          {/* Contact + Deal side by side */}
          <div className="grid grid-cols-2 gap-3">
            <SearchableDropdown<Contact>
              label="איש קשר"
              placeholder="בחר איש קשר..."
              value={form.contactId}
              onChange={(id) => setField("contactId", id)}
              items={contacts?.data || []}
              getLabel={(c) => c.fullName}
              isLoading={contactsLoading}
            />
            <SearchableDropdown<Deal>
              label="עסקה"
              placeholder="בחר עסקה..."
              value={form.dealId}
              onChange={(id) => {
                setField("dealId", id);
                if (id) setField("taskContext", "SALES");
              }}
              items={deals?.data || []}
              getLabel={(d) => d.title}
              isLoading={dealsLoading}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-[#E6E9EF]">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2 bg-[#F5F6F8] hover:bg-[#E6E9EF] text-[#676879] font-semibold rounded-[4px] transition-colors text-[13px]"
          >
            ביטול
          </button>
          <button
            type="submit"
            disabled={!form.title.trim() || mutation.isPending}
            className="flex-1 py-2 bg-[#0073EA] hover:bg-[#0060C2] text-white font-semibold rounded-[4px] transition-all hover:shadow-md text-[13px] disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {mutation.isPending ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                יוצר...
              </>
            ) : (
              "צור משימה"
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
