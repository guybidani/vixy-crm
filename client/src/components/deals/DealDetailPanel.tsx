import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import ConfirmDialog from "../shared/ConfirmDialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAutoSave } from "../../hooks/useAutoSave";
import {
  X,
  Mail,
  Phone,
  Building2,
  Calendar,
  User,
  DollarSign,
  Trash2,
  Clock,
  StickyNote,
  PhoneCall,
  MessageCircle,
  Bot,
  ArrowRight,
  CheckSquare,
  Wallet,
  Shield,
  Target,
  Timer,
  Check,
  Circle,
  MessageSquare,
  Send,
  Pencil,
  HeartPulse,
  Plus,
} from "lucide-react";
import toast from "react-hot-toast";
import { getWhatsAppUrl, getTelUrl } from "../../utils/phone";
import { getAvatarColor as avatarColor, getInitials } from "../../utils/avatar";
import {
  getDeal,
  updateDeal,
  deleteDeal,
} from "../../api/deals";
import type { BantData, DealHealth } from "../../api/deals";
import TagSelector from "../shared/TagSelector";
import MondayPersonCell, {
  type PersonOption,
} from "../shared/MondayPersonCell";
import { listContacts } from "../../api/contacts";
import { listCompanies } from "../../api/companies";
import { getWorkspaceMembers } from "../../api/auth";
import { createActivity, updateActivity, deleteActivity } from "../../api/activities";
import { updateTask, createTask } from "../../api/tasks";
import { useAuth } from "../../hooks/useAuth";
import { useWorkspaceOptions } from "../../hooks/useWorkspaceOptions";

interface DealDetailPanelProps {
  dealId: string;
  onClose: () => void;
  onDeleted?: () => void;
}

const ACTIVITY_ICONS: Record<string, any> = {
  NOTE: StickyNote,
  CALL: PhoneCall,
  EMAIL: Mail,
  MEETING: Calendar,
  WHATSAPP: MessageCircle,
  STATUS_CHANGE: ArrowRight,
  SYSTEM: Bot,
};

// ── Avatar helpers ──────────────────────────────────────────────────────────

function Avatar({ name, size = 28 }: { name: string; size?: number }) {
  return (
    <div
      className="flex items-center justify-center rounded-full text-white font-semibold flex-shrink-0 select-none"
      style={{ width: size, height: size, backgroundColor: avatarColor(name), fontSize: size * 0.38 }}
    >
      {getInitials(name)}
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────────────

export default function DealDetailPanel({
  dealId,
  onClose,
  onDeleted,
}: DealDetailPanelProps) {
  const { dealStages, priorities, activityTypes } = useWorkspaceOptions();
  const { currentWorkspaceId, user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"activity" | "details" | "tasks">("activity");
  const [editingNotes, setEditingNotes] = useState(false);
  const [notes, setNotes] = useState("");
  const [autoSaving, setAutoSaving] = useState(false);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [visible, setVisible] = useState(false);
  const [nameHovered, setNameHovered] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState("");
  const [newActivityText, setNewActivityText] = useState("");
  const [newActivityType, setNewActivityType] = useState<"NOTE" | "CALL" | "EMAIL" | "MEETING" | "WHATSAPP">("NOTE");
  const [postingActivity, setPostingActivity] = useState(false);
  const [editingActivityId, setEditingActivityId] = useState<string | null>(null);
  const [editingActivityText, setEditingActivityText] = useState("");
  const activityEndRef = useRef<HTMLDivElement>(null);
  const activityTextareaRef = useRef<HTMLTextAreaElement>(null);
  const [addingTask, setAddingTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDueDate, setNewTaskDueDate] = useState("");
  const newTaskInputRef = useRef<HTMLInputElement>(null);

  // Animate in on mount
  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  const { data: deal, isLoading } = useQuery({
    queryKey: ["deal", dealId],
    queryFn: () => getDeal(dealId),
    enabled: !!dealId,
  });

  const { data: contactsData } = useQuery({
    queryKey: ["contacts", { limit: 200 }],
    queryFn: () => listContacts({ limit: 200 }),
  });
  const { data: companiesData } = useQuery({
    queryKey: ["companies", { limit: 200 }],
    queryFn: () => listCompanies({ limit: 200 }),
  });
  const { data: membersData } = useQuery({
    queryKey: ["members", currentWorkspaceId],
    queryFn: () => getWorkspaceMembers(currentWorkspaceId!),
    enabled: !!currentWorkspaceId,
  });

  const contactOptions: PersonOption[] = (contactsData?.data || []).map(
    (c) => ({ id: c.id, name: c.fullName }),
  );
  const companyOptions: PersonOption[] = (companiesData?.data || []).map(
    (c) => ({ id: c.id, name: c.name }),
  );
  const memberOptions: PersonOption[] = (membersData || []).map((m) => ({
    id: m.memberId,
    name: m.name,
  }));

  const updateMut = useMutation({
    mutationFn: (data: Parameters<typeof updateDeal>[1]) =>
      updateDeal(dealId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deal", dealId] });
      queryClient.invalidateQueries({ queryKey: ["deals"] });
      queryClient.invalidateQueries({ queryKey: ["deals-pipeline"] });
      toast.success("עסקה עודכנה");
      setEditingField(null);
      setEditingName(false);
    },
  });

  const deleteMut = useMutation({
    mutationFn: () => deleteDeal(dealId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deals"] });
      queryClient.invalidateQueries({ queryKey: ["deals-pipeline"] });
      toast.success("עסקה נמחקה");
      onDeleted?.();
      onClose();
    },
  });

  const taskToggleMut = useMutation({
    mutationFn: ({ taskId, status }: { taskId: string; status: string }) =>
      updateTask(taskId, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deal", dealId] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });

  const createTaskMut = useMutation({
    mutationFn: (data: { title: string; dueDate?: string }) =>
      createTask({
        title: data.title,
        dealId,
        contactId: deal?.contact?.id || undefined,
        dueDate: data.dueDate || undefined,
        priority: "MEDIUM",
        taskType: "TASK",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deal", dealId] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      setNewTaskTitle("");
      setNewTaskDueDate("");
      setAddingTask(false);
      toast.success("משימה נוצרה");
    },
    onError: () => toast.error("שגיאה ביצירת משימה"),
  });

  const editActivityMut = useMutation({
    mutationFn: ({ id, body }: { id: string; body: string }) =>
      updateActivity(id, { body }),
    onSuccess: () => {
      setEditingActivityId(null);
      queryClient.invalidateQueries({ queryKey: ["deal", dealId] });
      toast.success("עודכן");
    },
    onError: () => toast.error("שגיאה בעדכון"),
  });

  const deleteActivityMut = useMutation({
    mutationFn: (id: string) => deleteActivity(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deal", dealId] });
      toast.success("נמחק");
    },
    onError: () => toast.error("שגיאה במחיקה"),
  });

  // Sync notes & name state when deal loads
  useEffect(() => {
    if (deal?.notes !== undefined) setNotes(deal.notes || "");
  }, [deal?.notes]);

  useEffect(() => {
    if (deal?.title) setNameValue(deal.title);
  }, [deal?.title]);

  // Auto-save notes
  useAutoSave(notes, (val) => {
    setAutoSaving(true);
    updateMut.mutate({ notes: val }, {
      onSettled: () => setAutoSaving(false),
    });
  }, { enabled: editingNotes && notes !== (deal?.notes || "") });

  // Close on Escape
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape" && !editingName && !editingField && !editingActivityId && !addingTask) {
        handleClose();
      }
    },
    [editingName, editingField, editingActivityId, addingTask], // eslint-disable-line react-hooks/exhaustive-deps
  );
  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // Auto-focus activity textarea
  useEffect(() => {
    const timer = setTimeout(() => {
      activityTextareaRef.current?.focus();
    }, 350);
    return () => clearTimeout(timer);
  }, []);

  // Focus new task input when inline form opens
  useEffect(() => {
    if (addingTask) {
      requestAnimationFrame(() => newTaskInputRef.current?.focus());
    }
  }, [addingTask]);

  function handleClose() {
    setVisible(false);
    setTimeout(onClose, 300);
  }

  function startEdit(field: string, value: string) {
    setEditingField(field);
    setEditValues({ ...editValues, [field]: value });
  }

  function saveField(field: string) {
    const val = editValues[field];
    if (field === "value") {
      updateMut.mutate({ value: Number(val) });
    } else if (field === "probability") {
      updateMut.mutate({ probability: Number(val) });
    } else if (field === "expectedClose") {
      updateMut.mutate({ expectedClose: val });
    }
  }

  async function postNote() {
    const text = newActivityText.trim();
    if (!text || postingActivity) return;
    setPostingActivity(true);
    try {
      await createActivity({
        type: newActivityType,
        body: text,
        dealId,
        contactId: deal?.contact?.id || undefined,
      });
      setNewActivityText("");
      queryClient.invalidateQueries({ queryKey: ["deal", dealId] });
    } catch {
      toast.error("שגיאה בפרסום הפעילות");
    } finally {
      setPostingActivity(false);
    }
  }

  if (isLoading) {
    return (
      <>
        <div className="fixed inset-0 bg-black/30 z-40" onClick={handleClose} />
        <div className="fixed top-0 right-0 h-full w-full max-w-[900px] bg-white shadow-2xl z-50 flex items-center justify-center">
          <p className="text-[#676879]">טוען...</p>
        </div>
      </>
    );
  }

  if (!deal) {
    return (
      <>
        <div className="fixed inset-0 bg-black/30 z-40" onClick={handleClose} />
        <div className="fixed top-0 right-0 h-full w-full max-w-[900px] bg-white shadow-2xl z-50 flex items-center justify-center">
          <p className="text-[#676879]">עסקה לא נמצאה</p>
        </div>
      </>
    );
  }

  const stageInfo = dealStages[deal.stage];
  const priorityInfo = priorities[deal.priority];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-40 transition-opacity duration-300"
        style={{ opacity: visible ? 1 : 0 }}
        onClick={handleClose}
      />

      {/* Panel */}
      <div
        className="fixed top-0 right-0 h-full z-50 flex flex-col bg-white shadow-2xl w-full"
        style={{
          maxWidth: 900,
          transform: visible ? "translateX(0)" : "translateX(100%)",
          transition: "transform 300ms ease-out",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Top bar ── */}
        <div className="flex-shrink-0 border-b border-[#E6E9EF] bg-white">
          {/* Close + delete row */}
          <div className="flex items-center justify-between px-6 pt-4 pb-1">
            <div className="flex items-center gap-2 text-[12px] text-[#676879]">
              <span className="font-semibold text-[#323338]">עסקאות</span>
              <ArrowRight size={12} className="opacity-40" />
              <span className="text-[#9699A6]">
                {stageInfo?.label || deal.stage}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="p-1.5 rounded-[4px] hover:bg-[#FFEEF0] text-[#676879] hover:text-[#E44258] transition-colors"
                title="מחק עסקה"
              >
                <Trash2 size={16} />
              </button>
              <button
                onClick={handleClose}
                className="p-1.5 text-[#676879] hover:text-[#323338] hover:bg-[#F5F6F8] rounded-[4px] transition-colors"
                aria-label="סגור"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Deal name (editable) */}
          <div className="px-6 pb-1">
            {editingName ? (
              <input
                autoFocus
                value={nameValue}
                onChange={(e) => setNameValue(e.target.value)}
                onBlur={() => {
                  if (nameValue.trim() && nameValue !== deal.title) {
                    updateMut.mutate({ title: nameValue.trim() });
                  } else {
                    setEditingName(false);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                  if (e.key === "Escape") {
                    setNameValue(deal.title);
                    setEditingName(false);
                  }
                }}
                className="text-[24px] font-semibold text-[#323338] w-full border-b-2 border-[#0073EA] outline-none bg-transparent py-0.5"
              />
            ) : (
              <div
                className="relative inline-flex items-center gap-2 group cursor-text"
                onMouseEnter={() => setNameHovered(true)}
                onMouseLeave={() => setNameHovered(false)}
                onClick={() => setEditingName(true)}
              >
                <h2 className="text-[24px] font-semibold text-[#323338] leading-tight">
                  {deal.title}
                </h2>
                <Pencil
                  size={14}
                  className="text-[#9699A6] flex-shrink-0 transition-opacity"
                  style={{ opacity: nameHovered ? 1 : 0 }}
                />
              </div>
            )}
          </div>

          {/* Stage + Priority + BANT row */}
          <div className="flex items-center gap-2 px-6 pb-3 flex-wrap">
            <select
              value={deal.stage}
              onChange={(e) => updateMut.mutate({ stage: e.target.value })}
              className="text-[12px] font-semibold px-3 py-1 rounded-full border-none cursor-pointer text-white outline-none"
              style={{ backgroundColor: stageInfo?.color || "#C4C4C4" }}
            >
              {Object.entries(dealStages).map(([key, val]) => (
                <option key={key} value={key}>{val.label}</option>
              ))}
            </select>
            <select
              value={deal.priority}
              onChange={(e) => updateMut.mutate({ priority: e.target.value })}
              className="text-[12px] font-semibold px-3 py-1 rounded-full border-none cursor-pointer text-white outline-none"
              style={{ backgroundColor: priorityInfo?.color || "#C4C4C4" }}
            >
              {Object.entries(priorities).map(([key, val]) => (
                <option key={key} value={key}>{val.label}</option>
              ))}
            </select>
            {deal.health && (
              <HealthBadge health={deal.health} />
            )}
          </div>

          {/* Quick action buttons (Monday-style) */}
          <div className="flex items-center gap-2 px-6 pb-3" dir="rtl">
            <button
              onClick={() => {
                setActiveTab("activity");
                setTimeout(() => activityTextareaRef.current?.focus(), 50);
              }}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-[#0073EA] hover:bg-[#0060C2] text-white text-[13px] font-semibold rounded-[6px] transition-colors shadow-sm"
            >
              <MessageSquare size={14} />
              עדכן
            </button>
            <button
              onClick={() => setActiveTab("activity")}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-[#F5F6F8] text-[#323338] text-[13px] font-medium rounded-[6px] border border-[#D0D4E4] transition-colors"
            >
              <PhoneCall size={14} className="text-[#676879]" />
              פעילות ({deal.activities?.length || 0})
            </button>
            {deal.expectedClose && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] text-[#676879]">
                <Calendar size={14} />
                {new Date(deal.expectedClose).toLocaleDateString("he-IL", { day: "numeric", month: "short", year: "numeric" })}
              </div>
            )}
          </div>

          {/* Tabs */}
          <div className="flex gap-1 px-6 border-t border-[#E6E9EF]" dir="rtl">
            {(
              [
                { key: "activity", label: "פעילות" },
                { key: "details", label: "הערות" },
                { key: "tasks", label: `משימות${deal.tasks?.length ? ` (${deal.tasks.length})` : ""}` },
              ] as const
            ).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2.5 text-[13px] font-medium border-b-2 -mb-px transition-colors ${
                  activeTab === tab.key
                    ? "border-[#0073EA] text-[#0073EA]"
                    : "border-transparent text-[#676879] hover:text-[#323338] hover:border-[#D0D4E4]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Body: 2-column layout ── */}
        <div className="flex-1 flex overflow-hidden min-h-0" dir="rtl">
          {/* LEFT: Activity/Feed column */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {activeTab === "activity" && (
              <>
                {/* Activity list */}
                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                  {isLoading ? (
                    <div className="text-center py-12 text-[#9699A6] text-[13px]">טוען...</div>
                  ) : !deal.activities || deal.activities.length === 0 ? (
                    <div className="text-center py-16 px-6">
                      <div className="w-14 h-14 bg-[#EDF3FB] rounded-full flex items-center justify-center mx-auto mb-4">
                        <Send size={22} className="text-[#0073EA]" />
                      </div>
                      <p className="text-[15px] font-semibold text-[#323338] mb-1.5">
                        עדיין אין פעילות
                      </p>
                      <p className="text-[13px] text-[#9699A6]">
                        הוסף עדכון ראשון לעסקה
                      </p>
                    </div>
                  ) : (
                    deal.activities.map((activity, idx) => {
                      const actType = activityTypes[activity.type];
                      const Icon = ACTIVITY_ICONS[activity.type] || StickyNote;
                      return (
                        <div key={activity.id} className="flex gap-3 relative">
                          {/* Timeline line */}
                          {idx < deal.activities.length - 1 && (
                            <div className="absolute right-4 top-8 bottom-0 w-px bg-[#E6E9EF]" />
                          )}
                          {/* Avatar / icon */}
                          <div
                            className="w-[34px] h-[34px] rounded-full flex items-center justify-center flex-shrink-0 z-10"
                            style={{ backgroundColor: (actType?.color || "#C4C4C4") + "20" }}
                          >
                            <Icon size={14} style={{ color: actType?.color || "#C4C4C4" }} />
                          </div>
                          {/* Bubble */}
                          <div className="flex-1 min-w-0 pb-4 group/activity">
                            <div className="bg-[#F5F6F8] rounded-xl rounded-tr-none px-4 py-3 shadow-sm relative">
                              <div className="flex items-baseline gap-2 mb-1">
                                <span className="text-[13px] font-semibold text-[#323338]">
                                  {actType?.label || activity.type}
                                </span>
                                <span className="text-[11px] text-[#9699A6]">
                                  {new Date(activity.createdAt).toLocaleDateString("he-IL", {
                                    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                                  })}
                                </span>
                                {/* Edit/Delete actions — visible on hover */}
                                {activity.type !== "STATUS_CHANGE" && activity.type !== "SYSTEM" && (
                                  <div className="flex items-center gap-1 opacity-0 group-hover/activity:opacity-100 transition-opacity mr-auto">
                                    <button
                                      onClick={() => {
                                        setEditingActivityId(activity.id);
                                        setEditingActivityText(activity.body || activity.subject || "");
                                      }}
                                      className="p-1 rounded hover:bg-[#E6E9EF] text-[#9699A6] hover:text-[#323338] transition-colors"
                                      title="ערוך"
                                    >
                                      <Pencil size={11} />
                                    </button>
                                    <button
                                      onClick={() => deleteActivityMut.mutate(activity.id)}
                                      className="p-1 rounded hover:bg-[#FFEEF0] text-[#9699A6] hover:text-[#E44258] transition-colors"
                                      title="מחק"
                                    >
                                      <Trash2 size={11} />
                                    </button>
                                  </div>
                                )}
                              </div>
                              {editingActivityId === activity.id ? (
                                <div className="space-y-2">
                                  <textarea
                                    className="w-full text-[13px] text-[#323338] bg-white border border-[#0073EA] rounded-lg px-3 py-2 outline-none resize-none leading-relaxed"
                                    rows={3}
                                    value={editingActivityText}
                                    onChange={(e) => setEditingActivityText(e.target.value)}
                                    autoFocus
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                                        e.preventDefault();
                                        editActivityMut.mutate({ id: activity.id, body: editingActivityText.trim() });
                                      }
                                      if (e.key === "Escape") setEditingActivityId(null);
                                    }}
                                  />
                                  <div className="flex items-center gap-2 justify-end">
                                    <button
                                      onClick={() => setEditingActivityId(null)}
                                      className="px-2 py-1 text-[11px] text-[#676879] hover:text-[#323338] transition-colors"
                                    >
                                      ביטול
                                    </button>
                                    <button
                                      onClick={() => editActivityMut.mutate({ id: activity.id, body: editingActivityText.trim() })}
                                      disabled={editActivityMut.isPending}
                                      className="px-3 py-1 text-[11px] font-semibold text-white bg-[#0073EA] hover:bg-[#0060C2] rounded-[4px] transition-colors disabled:opacity-50"
                                    >
                                      {editActivityMut.isPending ? "שומר..." : "שמור"}
                                    </button>
                                  </div>
                                </div>
                              ) : (activity.body || activity.subject) && (
                                <p className="text-[13px] text-[#323338] whitespace-pre-wrap leading-relaxed">
                                  {activity.body || activity.subject}
                                </p>
                              )}
                              {activity.member && (
                                <p className="text-[11px] text-[#9699A6] mt-0.5">
                                  {activity.member.user.name}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={activityEndRef} />
                </div>

                {/* New activity input */}
                <div className="flex-shrink-0 border-t border-[#E6E9EF] px-5 py-3 bg-white space-y-2">
                  {/* Activity type tabs */}
                  <div className="flex gap-1" dir="rtl">
                    {([
                      { key: "NOTE", label: "הערה", icon: StickyNote, color: "#6161FF" },
                      { key: "CALL", label: "שיחה", icon: PhoneCall, color: "#00CA72" },
                      { key: "EMAIL", label: "מייל", icon: Mail, color: "#579BFC" },
                      { key: "MEETING", label: "פגישה", icon: Calendar, color: "#A25DDC" },
                      { key: "WHATSAPP", label: "ווטסאפ", icon: MessageCircle, color: "#25D366" },
                    ] as const).map(({ key, label, icon: Icon, color }) => (
                      <button
                        key={key}
                        onClick={() => setNewActivityType(key)}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-[4px] text-[12px] font-medium transition-colors ${
                          newActivityType === key
                            ? "text-white"
                            : "text-[#676879] hover:bg-[#F5F6F8]"
                        }`}
                        style={newActivityType === key ? { backgroundColor: color } : {}}
                      >
                        <Icon size={12} />
                        {label}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-3 items-start">
                    <Avatar name={user?.name || "אני"} size={34} />
                    <div className="flex-1 bg-[#F5F6F8] rounded-xl border border-[#E6E9EF] focus-within:border-[#0073EA] focus-within:bg-white focus-within:shadow-[0_0_0_3px_rgba(0,115,234,0.12)] transition-all overflow-hidden">
                      <textarea
                        ref={activityTextareaRef}
                        className="w-full px-4 pt-3 pb-1 text-[13px] text-[#323338] bg-transparent outline-none resize-none leading-relaxed"
                        placeholder={
                          newActivityType === "CALL" ? "תאר את השיחה..." :
                          newActivityType === "EMAIL" ? "סכם את המייל..." :
                          newActivityType === "MEETING" ? "סכם את הפגישה..." :
                          newActivityType === "WHATSAPP" ? "תאר את השיחה בווטסאפ..." :
                          "כתוב הערה..."
                        }
                        rows={3}
                        value={newActivityText}
                        onChange={(e) => setNewActivityText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                            e.preventDefault();
                            postNote();
                          }
                        }}
                      />
                      <div className="flex items-center justify-between px-4 pb-3 pt-1">
                        <span className="text-[11px] text-[#C3C6D4]">Ctrl+Enter לשליחה</span>
                        <button
                          onClick={postNote}
                          disabled={!newActivityText.trim() || postingActivity}
                          className="px-5 py-1.5 bg-[#0073EA] text-white text-[13px] font-semibold rounded-[6px] hover:bg-[#0060C2] transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
                        >
                          {postingActivity ? "שולח..." : "עדכן"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {activeTab === "details" && (
              <div className="flex-1 overflow-y-auto px-5 py-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[13px] font-semibold text-[#323338]">הערות</span>
                    {!editingNotes && (
                      <button
                        onClick={() => { setEditingNotes(true); setNotes(deal?.notes || ""); }}
                        className="text-[12px] text-[#676879] hover:text-[#0073EA] transition-colors"
                      >
                        ערוך
                      </button>
                    )}
                  </div>
                  {editingNotes ? (
                    <div className="space-y-2">
                      <textarea
                        autoFocus
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        onBlur={() => {
                          if (notes === (deal?.notes || "")) setEditingNotes(false);
                        }}
                        className="w-full min-h-[180px] px-3 py-2 text-[13px] border border-[#C5C7D0] rounded-[4px] focus:outline-none focus:ring-2 focus:ring-[#0073EA]/30 focus:border-[#0073EA] resize-y"
                        placeholder="הוסף הערות..."
                      />
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-[#9699A6]">
                          {autoSaving ? "שומר..." : "נשמר אוטומטית"}
                        </span>
                        <button
                          onClick={() => setEditingNotes(false)}
                          className="px-3 py-1.5 text-[12px] text-[#676879] hover:bg-[#F5F6F8] rounded-[4px] transition-colors"
                        >
                          סגור
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p
                      className="text-[13px] text-[#676879] whitespace-pre-wrap cursor-pointer hover:bg-[#F5F6F8] rounded-[4px] p-2 -m-2 transition-colors min-h-[80px]"
                      onClick={() => { setEditingNotes(true); setNotes(deal?.notes || ""); }}
                    >
                      {deal.notes || "לחץ להוספת הערות..."}
                    </p>
                  )}
                </div>
              </div>
            )}

            {activeTab === "tasks" && (
              <div className="flex-1 overflow-y-auto px-5 py-4">
                {/* Header row with Add Task button */}
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-semibold text-[#9699A6] uppercase tracking-wide">
                    משימות ({deal.tasks?.length || 0})
                  </span>
                  {!addingTask && (
                    <button
                      onClick={() => setAddingTask(true)}
                      className="flex items-center gap-1 text-[12px] font-semibold text-[#0073EA] hover:text-[#0060C2] hover:bg-[#E8F3FF] px-2 py-1 rounded-[4px] transition-colors"
                    >
                      <Plus size={13} />
                      הוסף משימה
                    </button>
                  )}
                </div>

                {/* Inline task creation form */}
                {addingTask && (
                  <div className="mb-3 bg-white border border-[#0073EA] rounded-xl px-3 py-2.5 shadow-[0_0_0_3px_rgba(0,115,234,0.10)]">
                    <input
                      ref={newTaskInputRef}
                      type="text"
                      value={newTaskTitle}
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                      placeholder="כותרת משימה..."
                      className="w-full text-[13px] text-[#323338] bg-transparent outline-none placeholder:text-[#C3C6D4]"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && newTaskTitle.trim()) {
                          createTaskMut.mutate({ title: newTaskTitle.trim(), dueDate: newTaskDueDate || undefined });
                        }
                        if (e.key === "Escape") {
                          setAddingTask(false);
                          setNewTaskTitle("");
                          setNewTaskDueDate("");
                        }
                      }}
                    />
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#F0F0F5]">
                      <input
                        type="date"
                        value={newTaskDueDate}
                        onChange={(e) => setNewTaskDueDate(e.target.value)}
                        className="text-[11px] text-[#676879] bg-transparent border-none outline-none cursor-pointer"
                        dir="ltr"
                        title="תאריך יעד"
                      />
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => {
                            setAddingTask(false);
                            setNewTaskTitle("");
                            setNewTaskDueDate("");
                          }}
                          className="px-2 py-1 text-[11px] text-[#9699A6] hover:text-[#323338] rounded transition-colors"
                        >
                          ביטול
                        </button>
                        <button
                          onClick={() => {
                            if (newTaskTitle.trim()) {
                              createTaskMut.mutate({ title: newTaskTitle.trim(), dueDate: newTaskDueDate || undefined });
                            }
                          }}
                          disabled={!newTaskTitle.trim() || createTaskMut.isPending}
                          className="px-3 py-1 text-[11px] font-semibold text-white bg-[#0073EA] hover:bg-[#0060C2] rounded-[4px] transition-colors disabled:opacity-40"
                        >
                          {createTaskMut.isPending ? "יוצר..." : "צור"}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {deal.tasks && deal.tasks.length > 0 ? (
                  <div className="space-y-1.5">
                    {deal.tasks.map((task) => (
                      <div
                        key={task.id}
                        className="flex items-center gap-2 py-2 px-3 rounded-xl bg-white border border-[#E6E9EF] hover:border-[#C5C7D0] transition-colors group/task"
                      >
                        {/* Toggle done checkbox */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            taskToggleMut.mutate({
                              taskId: task.id,
                              status: task.status === "DONE" ? "TODO" : "DONE",
                            });
                          }}
                          className="flex-shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0073EA] rounded"
                          title={task.status === "DONE" ? "סמן כלא בוצע" : "סמן כבוצע"}
                        >
                          <CheckSquare
                            size={15}
                            className={task.status === "DONE" ? "text-[#00CA72]" : "text-[#C5C7D0] hover:text-[#00CA72] transition-colors"}
                          />
                        </button>
                        {/* Navigate to task detail */}
                        <button
                          type="button"
                          onClick={() => {
                            handleClose();
                            navigate(`/tasks?selected=${task.id}`);
                          }}
                          className={`text-[13px] flex-1 text-right hover:text-[#0073EA] transition-colors focus:outline-none ${
                            task.status === "DONE" ? "line-through text-[#C5C7D0]" : "text-[#323338]"
                          }`}
                        >
                          {task.title}
                        </button>
                        {task.dueDate && (() => {
                          const due = new Date(task.dueDate);
                          const isOverdue = task.status !== "DONE" && due < new Date();
                          return (
                            <span className={`text-[11px] flex items-center gap-0.5 flex-shrink-0 ${isOverdue ? "text-[#E44258] font-semibold" : "text-[#676879]"}`}>
                              <Calendar size={11} />
                              {due.toLocaleDateString("he-IL")}
                              {isOverdue && <span className="text-[9px] bg-[#E44258]/10 text-[#E44258] px-1 py-0.5 rounded">באיחור</span>}
                            </span>
                          );
                        })()}
                        {task.assignee && (
                          <Avatar name={task.assignee.user.name} size={20} />
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  !addingTask && (
                    <div className="text-center py-10 text-[#9699A6]">
                      <CheckSquare size={28} className="mx-auto mb-2 opacity-20" />
                      <p className="text-[13px]">אין משימות לעסקה זו</p>
                      <p className="text-[11px] mt-1 opacity-70">לחץ "הוסף משימה" למעלה</p>
                    </div>
                  )
                )}
              </div>
            )}
          </div>

          {/* RIGHT: Deal fields sidebar */}
          <div
            className="flex-shrink-0 overflow-y-auto bg-[#FAFBFC] border-r border-[#E6E9EF]"
            style={{ width: 292 }}
          >
            <div className="p-4 space-y-5">
              {/* Deal financials */}
              <div>
                <p className="text-[10px] font-semibold text-[#9699A6] uppercase tracking-widest mb-2">
                  פרטי עסקה
                </p>
                <div className="bg-white rounded-xl border border-[#E6E9EF] overflow-hidden px-3">
                  {/* Value */}
                  <FieldRow icon={<DollarSign size={14} />} label="סכום">
                    {editingField === "value" ? (
                      <input
                        autoFocus
                        type="number"
                        value={editValues.value}
                        onChange={(e) => setEditValues({ ...editValues, value: e.target.value })}
                        onBlur={() => saveField("value")}
                        onKeyDown={(e) => e.key === "Enter" && saveField("value")}
                        className="w-24 text-[13px] border-b border-[#0073EA] outline-none bg-transparent"
                        dir="ltr"
                      />
                    ) : (
                      <span
                        className="text-[13px] font-bold text-[#323338] cursor-pointer hover:text-[#0073EA]"
                        onClick={() => startEdit("value", String(deal.value || 0))}
                        dir="ltr"
                      >
                        ₪{(deal.value || 0).toLocaleString()}
                      </span>
                    )}
                  </FieldRow>

                  {/* Probability */}
                  <FieldRow icon={<span className="text-[11px] font-bold text-[#676879]">%</span>} label="סיכוי">
                    <button
                      className="flex items-center gap-2 group"
                      onClick={() => startEdit("probability", String(deal.probability || 0))}
                    >
                      {editingField === "probability" ? (
                        <input
                          autoFocus
                          type="number"
                          min={0}
                          max={100}
                          value={editValues.probability}
                          onChange={(e) => setEditValues({ ...editValues, probability: e.target.value })}
                          onBlur={() => saveField("probability")}
                          onKeyDown={(e) => e.key === "Enter" && saveField("probability")}
                          className="w-14 text-[13px] border-b border-[#0073EA] outline-none bg-transparent"
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        <>
                          <div className="w-16 h-[4px] bg-[#F5F6F8] rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${deal.probability}%`,
                                backgroundColor: deal.probability >= 70 ? "#00CA72" : deal.probability >= 40 ? "#FDAB3D" : "#C4C4C4",
                              }}
                            />
                          </div>
                          <span className="text-[13px] text-[#323338] group-hover:text-[#0073EA]">
                            {deal.probability}%
                          </span>
                        </>
                      )}
                    </button>
                  </FieldRow>

                  {/* Close date */}
                  <FieldRow icon={<Calendar size={14} />} label="תאריך סגירה">
                    <input
                      type="date"
                      value={deal.expectedClose ? new Date(deal.expectedClose).toISOString().split("T")[0] : ""}
                      onChange={(e) => updateMut.mutate({ expectedClose: e.target.value })}
                      className="text-[13px] text-[#323338] bg-transparent border-none outline-none cursor-pointer"
                      dir="ltr"
                    />
                  </FieldRow>

                  {/* Days in stage */}
                  <FieldRow icon={<Clock size={14} />} label="ימים בשלב">
                    <span
                      className={`text-[13px] font-semibold ${
                        deal.daysInStage >= 14 ? "text-[#FB275D]" : deal.daysInStage >= 7 ? "text-[#FDAB3D]" : "text-[#676879]"
                      }`}
                    >
                      {deal.daysInStage} ימים
                    </span>
                  </FieldRow>
                </div>
              </div>

              {/* Contact */}
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <User size={12} className="text-[#0073EA]" />
                  <p className="text-[10px] font-semibold text-[#9699A6] uppercase tracking-widest">
                    איש קשר
                  </p>
                </div>
                <div className="bg-white border border-[#E6E9EF] rounded-xl p-3 space-y-2.5">
                  <MondayPersonCell
                    value={
                      deal.contact
                        ? { id: deal.contact.id, name: `${deal.contact.firstName} ${deal.contact.lastName}` }
                        : null
                    }
                    options={contactOptions}
                    onChange={(id) => updateMut.mutate({ contactId: id! })}
                    placeholder="בחר איש קשר"
                  />
                  {deal.contact?.email && (
                    <a
                      href={`mailto:${deal.contact.email}`}
                      className="flex items-center gap-2 text-[12px] text-[#323338] hover:text-[#0073EA] transition-colors"
                    >
                      <Mail size={12} className="text-[#676879] flex-shrink-0" />
                      <span dir="ltr" className="truncate">{deal.contact.email}</span>
                    </a>
                  )}
                  {deal.contact?.phone && (
                    <div className="flex items-center gap-2 text-[12px] text-[#323338]">
                      <Phone size={12} className="text-[#676879] flex-shrink-0" />
                      <span dir="ltr" className="flex-1">{deal.contact.phone}</span>
                      <a
                        href={getWhatsAppUrl(deal.contact.phone)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1 rounded hover:bg-[#25D366]/10 transition-colors"
                        title="וואטסאפ"
                      >
                        <MessageSquare size={13} color="#25D366" />
                      </a>
                      <a
                        href={getTelUrl(deal.contact.phone)}
                        className="p-1 rounded hover:bg-[#00CA72]/10 transition-colors"
                        title="התקשר"
                      >
                        <Phone size={13} color="#00CA72" />
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Company */}
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <Building2 size={12} className="text-[#676879]" />
                  <p className="text-[10px] font-semibold text-[#9699A6] uppercase tracking-widest">
                    חברה
                  </p>
                </div>
                <div className="bg-white border border-[#E6E9EF] rounded-xl p-3">
                  <MondayPersonCell
                    value={deal.company ? { id: deal.company.id, name: deal.company.name } : null}
                    options={companyOptions}
                    onChange={(id) => updateMut.mutate({ companyId: id })}
                    placeholder="בחר חברה"
                  />
                </div>
              </div>

              {/* Assignee */}
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <User size={12} className="text-[#676879]" />
                  <p className="text-[10px] font-semibold text-[#9699A6] uppercase tracking-widest">
                    אחראי
                  </p>
                </div>
                <div className="bg-white border border-[#E6E9EF] rounded-xl p-3">
                  <MondayPersonCell
                    value={
                      deal.assignee
                        ? { id: deal.assignee.id, name: deal.assignee.user.name }
                        : null
                    }
                    options={memberOptions}
                    onChange={(id) => updateMut.mutate({ assigneeId: id! })}
                    placeholder="בחר אחראי"
                  />
                </div>
              </div>

              {/* Tags */}
              <div>
                <p className="text-[10px] font-semibold text-[#9699A6] uppercase tracking-widest mb-2">
                  תגיות
                </p>
                <div className="bg-white border border-[#E6E9EF] rounded-xl p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex gap-1.5 flex-wrap">
                      {deal.tags?.map((t: any) => (
                        <span
                          key={t.id}
                          className="text-[11px] font-semibold px-2 py-0.5 rounded-full text-white"
                          style={{ backgroundColor: t.color }}
                        >
                          {t.name}
                        </span>
                      ))}
                      {(!deal.tags || deal.tags.length === 0) && (
                        <span className="text-[12px] text-[#9699A6]">אין תגיות</span>
                      )}
                    </div>
                    <TagSelector
                      entityType="deal"
                      entityId={deal.id}
                      currentTags={deal.tags?.map((t: any) => ({ id: t.id, name: t.name, color: t.color })) || []}
                    />
                  </div>
                </div>
              </div>

              {/* BANT */}
              <div>
                <p className="text-[10px] font-semibold text-[#9699A6] uppercase tracking-widest mb-2">
                  BANT
                </p>
                <div className="bg-white border border-[#E6E9EF] rounded-xl p-3">
                  <BantSection
                    bantData={deal.bantData || null}
                    onUpdate={(bantData) => updateMut.mutate({ bantData })}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={showDeleteConfirm}
        onConfirm={() => {
          setShowDeleteConfirm(false);
          deleteMut.mutate();
        }}
        onCancel={() => setShowDeleteConfirm(false)}
        title="מחיקת עסקה"
        message="האם אתה בטוח שברצונך למחוק את העסקה?"
        confirmText="מחק"
        cancelText="ביטול"
        variant="danger"
      />
    </>
  );
}

// ── FieldRow helper ──────────────────────────────────────────────────────────

function FieldRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2 py-2.5 border-b border-[#F0F0F5] last:border-0">
      <div className="w-20 flex-shrink-0 flex items-center gap-1.5 text-[#9699A6] pt-0.5">
        {icon}
        <span className="text-[11px] font-medium uppercase tracking-wide truncate">{label}</span>
      </div>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}

// ── Health Score Badge ────────────────────────────────────────────────────────

function HealthBadge({ health }: { health: DealHealth }) {
  const [showBreakdown, setShowBreakdown] = useState(false);
  const b = health.breakdown;

  const breakdownRows = [
    { label: "פעילות אחרונה", detail: b.activityRecency.label, score: b.activityRecency.score, max: 30 },
    { label: "משימה הבאה", detail: b.nextTask.label, score: b.nextTask.score, max: 20 },
    { label: "BANT", detail: b.bantCompletion.label, score: b.bantCompletion.score, max: 20 },
    { label: "מהירות התקדמות", detail: b.stageVelocity.label, score: b.stageVelocity.score, max: 15 },
    { label: "מעורבות", detail: b.contactEngagement.label, score: b.contactEngagement.score, max: 15 },
  ];

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setShowBreakdown((v) => !v)}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-[4px] border transition-colors hover:bg-[#F5F6F8]"
        style={{ borderColor: health.color + "40" }}
      >
        <HeartPulse size={13} style={{ color: health.color }} />
        <span className="text-[11px] font-bold" style={{ color: health.color }}>
          {health.score}
        </span>
        <span className="text-[11px] font-semibold text-[#323338]">{health.label}</span>
      </button>

      {showBreakdown && (
        <div className="absolute top-full right-0 mt-1 w-72 bg-white rounded-xl shadow-xl border border-[#E6E9EF] p-3 z-50">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[13px] font-bold text-[#323338]">פירוט בריאות עסקה</span>
            <span className="text-sm font-bold" style={{ color: health.color }}>{health.score}/100</span>
          </div>
          <div className="space-y-2.5">
            {breakdownRows.map((row) => (
              <div key={row.label}>
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-[11px] text-[#676879]">{row.label}</span>
                  <span className="text-[11px] font-medium text-[#323338]">
                    {row.detail}{" "}
                    {row.score > 0 ? <span className="text-[#10B981]">+{row.score}</span> : <span className="text-[#DC2626]">+0</span>}
                  </span>
                </div>
                <div className="w-full h-1.5 bg-[#F5F6F8] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${(row.score / row.max) * 100}%`,
                      backgroundColor: row.score === row.max ? "#10B981" : row.score > 0 ? "#F59E0B" : "#DC2626",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── BANT Section ─────────────────────────────────────────────────────────────

const AUTHORITY_OPTIONS = [
  { value: "", label: "בחר..." },
  { value: "decision_maker", label: "מקבל החלטות" },
  { value: "influencer", label: "משפיע" },
  { value: "user", label: "משתמש" },
  { value: "unknown", label: "לא ידוע" },
];

const TIMELINE_OPTIONS = [
  { value: "", label: "בחר..." },
  { value: "urgent", label: "דחוף (חודש)" },
  { value: "quarter", label: "רבעון" },
  { value: "half_year", label: "חצי שנה" },
  { value: "year", label: "שנה" },
  { value: "unknown", label: "לא ידוע" },
];

interface BantSectionProps {
  bantData: BantData | null;
  onUpdate: (data: BantData) => void;
}

function BantSection({ bantData, onUpdate }: BantSectionProps) {
  const data: BantData = bantData || {};
  const [editingField, setEditingField] = useState<keyof BantData | null>(null);
  const [editValue, setEditValue] = useState("");

  const fields: Array<{
    key: keyof BantData;
    label: string;
    icon: React.ReactNode;
    type: "text" | "select";
    placeholder?: string;
    options?: Array<{ value: string; label: string }>;
  }> = [
    { key: "budget", label: "תקציב", icon: <Wallet size={13} />, type: "text", placeholder: "מה התקציב?" },
    { key: "authority", label: "סמכות", icon: <Shield size={13} />, type: "select", options: AUTHORITY_OPTIONS },
    { key: "need", label: "צורך", icon: <Target size={13} />, type: "text", placeholder: "מה הצורך?" },
    { key: "timeline", label: "לוח זמנים", icon: <Timer size={13} />, type: "select", options: TIMELINE_OPTIONS },
  ];

  const filledCount = fields.filter((f) => !!data[f.key]).length;

  function getDisplayValue(field: typeof fields[number]): string {
    const val = data[field.key];
    if (!val) return "";
    if (field.type === "select" && field.options) {
      return field.options.find((o) => o.value === val)?.label || val;
    }
    return val;
  }

  function startEdit(key: keyof BantData) {
    setEditingField(key);
    setEditValue(data[key] || "");
  }

  function saveField(key: keyof BantData, value: string) {
    setEditingField(null);
    const trimmed = value.trim();
    if (trimmed !== (data[key] || "")) {
      onUpdate({ ...data, [key]: trimmed || undefined });
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2.5">
        <span className="text-[12px] font-semibold text-[#323338]">הכשרת ליד</span>
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-[#676879]">{filledCount}/4</span>
          <div className="flex gap-0.5">
            {fields.map((f, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full ${data[f.key] ? "bg-[#00CA72]" : "bg-[#E6E9EF]"}`}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        {fields.map((field) => {
          const isFilled = !!data[field.key];
          const isEditing = editingField === field.key;

          return (
            <button
              key={field.key}
              className="bg-[#F7F7F9] rounded-[4px] p-2 hover:bg-[#ECEDF0] transition-colors text-right w-full"
              onClick={() => !isEditing && startEdit(field.key)}
            >
              <div className="flex items-center gap-1 mb-1">
                <span className="text-[#676879]">{field.icon}</span>
                <span className="text-[10px] font-medium text-[#676879]">{field.label}</span>
                {isFilled ? <Check size={10} className="text-[#00CA72] mr-auto" /> : <Circle size={10} className="text-[#C5C7D0] mr-auto" />}
              </div>

              {isEditing ? (
                field.type === "select" ? (
                  <select
                    autoFocus
                    value={editValue}
                    onChange={(e) => { setEditValue(e.target.value); saveField(field.key, e.target.value); }}
                    onBlur={() => saveField(field.key, editValue)}
                    className="w-full text-[11px] bg-white border border-[#C5C7D0] rounded px-1.5 py-0.5 outline-none focus:border-[#0073EA]"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {field.options?.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    autoFocus
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={() => saveField(field.key, editValue)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveField(field.key, editValue);
                      if (e.key === "Escape") setEditingField(null);
                    }}
                    placeholder={field.placeholder}
                    className="w-full text-[11px] bg-white border border-[#C5C7D0] rounded px-1.5 py-0.5 outline-none focus:border-[#0073EA]"
                    onClick={(e) => e.stopPropagation()}
                  />
                )
              ) : (
                <p className="text-[11px] text-[#323338] truncate min-h-[16px] leading-[16px]">
                  {getDisplayValue(field) || (
                    <span className="text-[#C5C7D0]">{field.placeholder || "בחר..."}</span>
                  )}
                </p>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
