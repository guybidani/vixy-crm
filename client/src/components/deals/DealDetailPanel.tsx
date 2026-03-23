import { useState, useEffect } from "react";
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
} from "lucide-react";
import toast from "react-hot-toast";
import { getWhatsAppUrl, getTelUrl } from "../../utils/phone";
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

export default function DealDetailPanel({
  dealId,
  onClose,
  onDeleted,
}: DealDetailPanelProps) {
  const { dealStages, priorities, activityTypes } = useWorkspaceOptions();
  const { currentWorkspaceId } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"details" | "activity">("details");
  const [editingNotes, setEditingNotes] = useState(false);
  const [notes, setNotes] = useState("");
  const [autoSaving, setAutoSaving] = useState(false);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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

  // Sync notes state when deal loads
  useEffect(() => {
    if (deal?.notes !== undefined) setNotes(deal.notes || "");
  }, [deal?.notes]);

  // Auto-save notes 1.5s after typing stops
  useAutoSave(notes, (val) => {
    setAutoSaving(true);
    updateMut.mutate({ notes: val }, {
      onSettled: () => setAutoSaving(false),
    });
  }, { enabled: editingNotes && notes !== (deal?.notes || "") });

  function startEditNotes() {
    setEditingNotes(true);
    setNotes(deal?.notes || "");
  }

  function startEdit(field: string, value: string) {
    setEditingField(field);
    setEditValues({ ...editValues, [field]: value });
  }

  function saveField(field: string) {
    const val = editValues[field];
    if (field === "value") {
      updateMut.mutate({ value: Number(val) });
    } else if (field === "title") {
      updateMut.mutate({ title: val });
    } else if (field === "probability") {
      updateMut.mutate({ probability: Number(val) });
    } else if (field === "expectedClose") {
      updateMut.mutate({ expectedClose: val });
    }
  }

  if (isLoading) {
    return (
      <>
        <div
          className="fixed inset-0 bg-black/20 z-40 transition-opacity"
          onClick={onClose}
        />
        <div className="fixed top-0 left-0 h-full w-[480px] bg-white shadow-2xl z-50 flex items-center justify-center">
          <p className="text-text-secondary">טוען...</p>
        </div>
      </>
    );
  }

  if (!deal) {
    return (
      <>
        <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />
        <div className="fixed top-0 left-0 h-full w-[480px] bg-white shadow-2xl z-50 flex items-center justify-center">
          <p className="text-text-secondary">עסקה לא נמצאה</p>
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
        className="fixed inset-0 bg-black/20 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed top-0 left-0 h-full w-[480px] bg-white shadow-2xl z-50 flex flex-col animate-in slide-in-from-left duration-200">
        {/* Header */}
        <div className="p-4 border-b border-[#E6E9EF]">
          <div className="flex items-start justify-between mb-3">
            {editingField === "title" ? (
              <input
                autoFocus
                value={editValues.title}
                onChange={(e) =>
                  setEditValues({ ...editValues, title: e.target.value })
                }
                onBlur={() => saveField("title")}
                onKeyDown={(e) => e.key === "Enter" && saveField("title")}
                className="text-lg font-bold text-[#323338] flex-1 border-b-2 border-primary outline-none bg-transparent"
              />
            ) : (
              <h2
                className="text-lg font-bold text-[#323338] cursor-pointer hover:text-primary transition-colors flex-1"
                onClick={() => startEdit("title", deal.title)}
              >
                {deal.title}
              </h2>
            )}
            <div className="flex items-center gap-1 mr-2">
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="p-1.5 rounded-lg hover:bg-red-50 text-[#676879] hover:text-red-500 transition-colors"
              >
                <Trash2 size={16} />
              </button>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-[#F5F6F8] text-[#676879] transition-colors"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Stage + Priority pills */}
          <div className="flex items-center gap-2">
            <select
              value={deal.stage}
              onChange={(e) => updateMut.mutate({ stage: e.target.value })}
              className="text-xs font-semibold px-3 py-1.5 rounded-full border-none cursor-pointer text-white"
              style={{ backgroundColor: stageInfo?.color || "#C4C4C4" }}
            >
              {Object.entries(dealStages).map(([key, val]) => (
                <option key={key} value={key}>
                  {val.label}
                </option>
              ))}
            </select>
            <select
              value={deal.priority}
              onChange={(e) => updateMut.mutate({ priority: e.target.value })}
              className="text-xs font-semibold px-3 py-1.5 rounded-full border-none cursor-pointer text-white"
              style={{ backgroundColor: priorityInfo?.color || "#C4C4C4" }}
            >
              {Object.entries(priorities).map(([key, val]) => (
                <option key={key} value={key}>
                  {val.label}
                </option>
              ))}
            </select>
          </div>

          {/* Health Score Badge */}
          {deal.health && (
            <HealthBadge health={deal.health} />
          )}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#E6E9EF]">
          <button
            onClick={() => setActiveTab("details")}
            className={`flex-1 py-2.5 text-[13px] font-medium transition-colors ${
              activeTab === "details"
                ? "text-[#0073EA] border-b-2 border-[#0073EA]"
                : "text-[#676879] hover:text-[#323338]"
            }`}
          >
            פרטים
          </button>
          <button
            onClick={() => setActiveTab("activity")}
            className={`flex-1 py-2.5 text-[13px] font-medium transition-colors ${
              activeTab === "activity"
                ? "text-[#0073EA] border-b-2 border-[#0073EA]"
                : "text-[#676879] hover:text-[#323338]"
            }`}
          >
            פעילות ({deal.activities?.length || 0})
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === "details" ? (
            <div className="p-4 space-y-5">
              {/* Value */}
              <DetailRow icon={<DollarSign size={15} />} label="סכום">
                {editingField === "value" ? (
                  <input
                    autoFocus
                    type="number"
                    value={editValues.value}
                    onChange={(e) =>
                      setEditValues({ ...editValues, value: e.target.value })
                    }
                    onBlur={() => saveField("value")}
                    onKeyDown={(e) => e.key === "Enter" && saveField("value")}
                    className="w-24 text-sm border-b border-primary outline-none bg-transparent text-left"
                    dir="ltr"
                  />
                ) : (
                  <span
                    className="font-bold text-[#323338] cursor-pointer hover:text-primary"
                    onClick={() => startEdit("value", String(deal.value || 0))}
                    dir="ltr"
                  >
                    ₪{(deal.value || 0).toLocaleString()}
                  </span>
                )}
              </DetailRow>

              {/* Probability */}
              <DetailRow
                icon={
                  <span className="text-xs font-bold text-[#676879]">%</span>
                }
                label="סיכוי סגירה"
              >
                {editingField === "probability" ? (
                  <input
                    autoFocus
                    type="number"
                    min={0}
                    max={100}
                    value={editValues.probability}
                    onChange={(e) =>
                      setEditValues({
                        ...editValues,
                        probability: e.target.value,
                      })
                    }
                    onBlur={() => saveField("probability")}
                    onKeyDown={(e) =>
                      e.key === "Enter" && saveField("probability")
                    }
                    className="w-16 text-sm border-b border-primary outline-none bg-transparent text-left"
                    dir="ltr"
                  />
                ) : (
                  <div
                    className="flex items-center gap-2 cursor-pointer group"
                    onClick={() =>
                      startEdit("probability", String(deal.probability || 0))
                    }
                  >
                    <div className="w-20 h-[5px] bg-[#F5F6F8] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${deal.probability}%`,
                          backgroundColor:
                            deal.probability >= 70
                              ? "#00CA72"
                              : deal.probability >= 40
                                ? "#FDAB3D"
                                : "#C4C4C4",
                        }}
                      />
                    </div>
                    <span className="text-sm text-[#323338] group-hover:text-primary">
                      {deal.probability}%
                    </span>
                  </div>
                )}
              </DetailRow>

              {/* Expected Close */}
              <DetailRow icon={<Calendar size={15} />} label="תאריך סגירה צפוי">
                <input
                  type="date"
                  value={
                    deal.expectedClose
                      ? new Date(deal.expectedClose).toISOString().split("T")[0]
                      : ""
                  }
                  onChange={(e) =>
                    updateMut.mutate({ expectedClose: e.target.value })
                  }
                  className="text-sm text-[#323338] bg-transparent border-none outline-none cursor-pointer"
                  dir="ltr"
                />
              </DetailRow>

              {/* Days in stage */}
              <DetailRow icon={<Clock size={15} />} label="ימים בשלב">
                <span
                  className={`font-semibold text-sm ${
                    deal.daysInStage >= 14
                      ? "text-[#FB275D]"
                      : deal.daysInStage >= 7
                        ? "text-[#FDAB3D]"
                        : "text-[#676879]"
                  }`}
                >
                  {deal.daysInStage} ימים
                </span>
              </DetailRow>

              {/* Divider */}
              <div className="border-t border-[#E6E9EF]" />

              {/* Contact */}
              <div className="bg-[#F7F7F9] rounded-xl p-3.5 space-y-2.5">
                <div className="flex items-center gap-2 mb-2">
                  <User size={15} className="text-[#676879]" />
                  <span className="text-[13px] text-[#676879]">איש קשר</span>
                </div>
                <MondayPersonCell
                  value={
                    deal.contact
                      ? {
                          id: deal.contact.id,
                          name: `${deal.contact.firstName} ${deal.contact.lastName}`,
                        }
                      : null
                  }
                  options={contactOptions}
                  onChange={(id) => updateMut.mutate({ contactId: id! })}
                  placeholder="בחר איש קשר"
                />
                {deal.contact?.email && (
                  <a
                    href={`mailto:${deal.contact.email}`}
                    className="flex items-center gap-2 text-[13px] text-[#323338] hover:text-primary transition-colors"
                  >
                    <Mail size={13} className="text-[#676879]" />
                    <span dir="ltr">{deal.contact.email}</span>
                  </a>
                )}
                {deal.contact?.phone && (
                  <div className="flex items-center gap-2 text-[13px] text-[#323338]">
                    <Phone size={13} className="text-[#676879]" />
                    <span dir="ltr" className="flex-1">{deal.contact.phone}</span>
                    <a
                      href={getWhatsAppUrl(deal.contact.phone)}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="שלח הודעת וואטסאפ"
                      className="p-1 rounded-md hover:bg-[#25D366]/10 transition-colors"
                    >
                      <MessageSquare size={15} color="#25D366" />
                    </a>
                    <a
                      href={getTelUrl(deal.contact.phone)}
                      title="התקשר"
                      className="p-1 rounded-md hover:bg-[#00CA72]/10 transition-colors"
                    >
                      <Phone size={15} color="#00CA72" />
                    </a>
                  </div>
                )}
              </div>

              {/* Company */}
              <div className="bg-[#F7F7F9] rounded-xl p-3.5">
                <div className="flex items-center gap-2 mb-2">
                  <Building2 size={15} className="text-[#676879]" />
                  <span className="text-[13px] text-[#676879]">חברה</span>
                </div>
                <MondayPersonCell
                  value={
                    deal.company
                      ? { id: deal.company.id, name: deal.company.name }
                      : null
                  }
                  options={companyOptions}
                  onChange={(id) => updateMut.mutate({ companyId: id })}
                  placeholder="בחר חברה"
                />
              </div>

              {/* Assignee */}
              <DetailRow icon={<User size={15} />} label="אחראי">
                <MondayPersonCell
                  value={
                    deal.assignee
                      ? {
                          id: deal.assignee.id,
                          name: deal.assignee.user.name,
                        }
                      : null
                  }
                  options={memberOptions}
                  onChange={(id) => updateMut.mutate({ assigneeId: id! })}
                  placeholder="בחר אחראי"
                />
              </DetailRow>

              {/* Tags */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[13px] font-semibold text-[#323338]">
                    תגיות
                  </span>
                  <TagSelector
                    entityType="deal"
                    entityId={deal.id}
                    currentTags={
                      deal.tags?.map((t: any) => ({
                        id: t.id,
                        name: t.name,
                        color: t.color,
                      })) || []
                    }
                  />
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  {deal.tags?.map((t: any) => (
                    <span
                      key={t.id}
                      className="text-xs font-semibold px-2.5 py-0.5 rounded-full text-white"
                      style={{ backgroundColor: t.color }}
                    >
                      {t.name}
                    </span>
                  ))}
                  {(!deal.tags || deal.tags.length === 0) && (
                    <span className="text-[11px] text-[#676879]">
                      אין תגיות
                    </span>
                  )}
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-[#E6E9EF]" />

              {/* BANT Qualification */}
              <BantSection
                bantData={deal.bantData || null}
                onUpdate={(bantData) => updateMut.mutate({ bantData })}
              />

              {/* Divider */}
              <div className="border-t border-[#E6E9EF]" />

              {/* Notes */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[13px] font-semibold text-[#323338]">
                    הערות
                  </span>
                  {!editingNotes && (
                    <button
                      onClick={startEditNotes}
                      className="text-xs text-[#676879] hover:text-primary transition-colors"
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
                      className="w-full min-h-[100px] px-3 py-2 text-sm border border-[#C5C7D0] rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-y"
                      placeholder="הוסף הערות..."
                    />
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-text-tertiary">
                        {autoSaving ? "שומר..." : "נשמר אוטומטית"}
                      </span>
                      <button
                        onClick={() => setEditingNotes(false)}
                        className="px-3 py-1.5 text-xs text-[#676879] hover:bg-[#F5F6F8] rounded-lg transition-colors"
                      >
                        סגור
                      </button>
                    </div>
                  </div>
                ) : (
                  <p
                    className="text-sm text-[#676879] whitespace-pre-wrap cursor-pointer hover:bg-[#F5F6F8] rounded-lg p-2 -m-2 transition-colors min-h-[40px]"
                    onClick={startEditNotes}
                  >
                    {deal.notes || "לחץ להוספת הערות..."}
                  </p>
                )}
              </div>

              {/* Tasks */}
              {deal.tasks && deal.tasks.length > 0 && (
                <>
                  <div className="border-t border-[#E6E9EF]" />
                  <div>
                    <span className="text-[13px] font-semibold text-[#323338] block mb-2">
                      משימות
                    </span>
                    <div className="space-y-1.5">
                      {deal.tasks.map((task) => (
                        <div
                          key={task.id}
                          className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-[#F5F6F8] transition-colors"
                        >
                          <CheckSquare
                            size={14}
                            className={
                              task.status === "DONE"
                                ? "text-[#00CA72]"
                                : "text-[#C5C7D0]"
                            }
                          />
                          <span
                            className={`text-[13px] flex-1 ${
                              task.status === "DONE"
                                ? "line-through text-[#C5C7D0]"
                                : "text-[#323338]"
                            }`}
                          >
                            {task.title}
                          </span>
                          {task.dueDate && (
                            <span className="text-[11px] text-[#676879]">
                              {new Date(task.dueDate).toLocaleDateString(
                                "he-IL",
                              )}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            /* Activity Tab */
            <div className="p-4">
              {deal.activities && deal.activities.length > 0 ? (
                <div className="space-y-0">
                  {deal.activities.map((activity, idx) => {
                    const actType = activityTypes[activity.type];
                    const Icon = ACTIVITY_ICONS[activity.type] || StickyNote;
                    return (
                      <div key={activity.id} className="flex gap-3 relative">
                        {/* Timeline line */}
                        {idx < deal.activities.length - 1 && (
                          <div className="absolute right-[15px] top-8 bottom-0 w-px bg-[#E6E9EF]" />
                        )}
                        {/* Icon */}
                        <div
                          className="w-[30px] h-[30px] rounded-full flex items-center justify-center flex-shrink-0 z-10"
                          style={{
                            backgroundColor:
                              (actType?.color || "#C4C4C4") + "20",
                          }}
                        >
                          <Icon
                            size={14}
                            style={{
                              color: actType?.color || "#C4C4C4",
                            }}
                          />
                        </div>
                        {/* Content */}
                        <div className="flex-1 pb-4">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-[13px] font-medium text-[#323338]">
                              {actType?.label || activity.type}
                            </span>
                            <span className="text-[11px] text-[#676879]">
                              {new Date(activity.createdAt).toLocaleDateString(
                                "he-IL",
                                {
                                  day: "numeric",
                                  month: "short",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                },
                              )}
                            </span>
                          </div>
                          {activity.description && (
                            <p className="text-[13px] text-[#676879]">
                              {activity.description}
                            </p>
                          )}
                          {activity.member && (
                            <p className="text-[11px] text-[#9699A6] mt-0.5">
                              {activity.member.user.name}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-10">
                  <p className="text-sm text-[#676879]">אין פעילות עדיין</p>
                </div>
              )}
            </div>
          )}
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

/* Small helper row */
function DetailRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 text-[#676879]">
        {icon}
        <span className="text-[13px]">{label}</span>
      </div>
      <div>{children}</div>
    </div>
  );
}

/* Health Score Badge with breakdown tooltip */
function HealthBadge({ health }: { health: DealHealth }) {
  const [showBreakdown, setShowBreakdown] = useState(false);
  const b = health.breakdown;

  const breakdownRows = [
    {
      label: "פעילות אחרונה",
      detail: b.activityRecency.label,
      score: b.activityRecency.score,
      max: 30,
    },
    {
      label: "משימה הבאה",
      detail: b.nextTask.label,
      score: b.nextTask.score,
      max: 20,
    },
    {
      label: "BANT",
      detail: b.bantCompletion.label,
      score: b.bantCompletion.score,
      max: 20,
    },
    {
      label: "מהירות התקדמות",
      detail: b.stageVelocity.label,
      score: b.stageVelocity.score,
      max: 15,
    },
    {
      label: "מעורבות",
      detail: b.contactEngagement.label,
      score: b.contactEngagement.score,
      max: 15,
    },
  ];

  return (
    <div className="relative mt-3">
      <button
        type="button"
        onClick={() => setShowBreakdown((v) => !v)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-colors hover:bg-[#F5F6F8]"
        style={{ borderColor: health.color + "40" }}
      >
        <span
          className="w-3 h-3 rounded-full flex-shrink-0"
          style={{ backgroundColor: health.color }}
        />
        <span className="text-xs font-bold" style={{ color: health.color }}>
          {health.score}
        </span>
        <span className="text-xs font-semibold text-[#323338]">
          {health.label}
        </span>
      </button>

      {showBreakdown && (
        <div className="absolute top-full right-0 mt-1 w-72 bg-white rounded-xl shadow-xl border border-[#E6E9EF] p-3 z-50">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[13px] font-bold text-[#323338]">
              פירוט בריאות עסקה
            </span>
            <span
              className="text-sm font-bold"
              style={{ color: health.color }}
            >
              {health.score}/100
            </span>
          </div>
          <div className="space-y-2.5">
            {breakdownRows.map((row) => (
              <div key={row.label}>
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-[11px] text-[#676879]">
                    {row.label}
                  </span>
                  <span className="text-[11px] font-medium text-[#323338]">
                    {row.detail}{" "}
                    {row.score > 0 ? (
                      <span className="text-[#10B981]">+{row.score}</span>
                    ) : (
                      <span className="text-[#DC2626]">+0</span>
                    )}
                  </span>
                </div>
                <div className="w-full h-1.5 bg-[#F5F6F8] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${(row.score / row.max) * 100}%`,
                      backgroundColor:
                        row.score === row.max
                          ? "#10B981"
                          : row.score > 0
                            ? "#F59E0B"
                            : "#DC2626",
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

/* BANT Qualification Section */
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
    {
      key: "budget",
      label: "תקציב",
      icon: <Wallet size={14} />,
      type: "text",
      placeholder: "מה התקציב?",
    },
    {
      key: "authority",
      label: "סמכות",
      icon: <Shield size={14} />,
      type: "select",
      options: AUTHORITY_OPTIONS,
    },
    {
      key: "need",
      label: "צורך",
      icon: <Target size={14} />,
      type: "text",
      placeholder: "מה הצורך העסקי?",
    },
    {
      key: "timeline",
      label: "לוח זמנים",
      icon: <Timer size={14} />,
      type: "select",
      options: TIMELINE_OPTIONS,
    },
  ];

  const filledCount = fields.filter((f) => !!data[f.key]).length;

  function getDisplayValue(field: typeof fields[number]): string {
    const val = data[field.key];
    if (!val) return "";
    if (field.type === "select" && field.options) {
      const opt = field.options.find((o) => o.value === val);
      return opt?.label || val;
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
      <div className="flex items-center justify-between mb-3">
        <span className="text-[13px] font-semibold text-[#323338]">
          הכשרת ליד (BANT)
        </span>
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-[#676879]">
            {filledCount}/4 הושלם
          </span>
          <div className="flex gap-1">
            {fields.map((f, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full ${
                  data[f.key] ? "bg-[#00CA72]" : "bg-[#E6E9EF]"
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {fields.map((field) => {
          const isFilled = !!data[field.key];
          const isEditing = editingField === field.key;

          return (
            <div
              key={field.key}
              className="bg-[#F7F7F9] rounded-lg p-2.5 cursor-pointer hover:bg-[#ECEDF0] transition-colors"
              onClick={() => !isEditing && startEdit(field.key)}
            >
              <div className="flex items-center gap-1.5 mb-1.5">
                <span className="text-[#676879]">{field.icon}</span>
                <span className="text-[11px] font-medium text-[#676879]">
                  {field.label}
                </span>
                {isFilled ? (
                  <Check size={12} className="text-[#00CA72] mr-auto" />
                ) : (
                  <Circle size={12} className="text-[#C5C7D0] mr-auto" />
                )}
              </div>

              {isEditing ? (
                field.type === "select" ? (
                  <select
                    autoFocus
                    value={editValue}
                    onChange={(e) => {
                      setEditValue(e.target.value);
                      saveField(field.key, e.target.value);
                    }}
                    onBlur={() => saveField(field.key, editValue)}
                    className="w-full text-[12px] bg-white border border-[#C5C7D0] rounded px-2 py-1 outline-none focus:border-[#0073EA]"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {field.options?.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
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
                    className="w-full text-[12px] bg-white border border-[#C5C7D0] rounded px-2 py-1 outline-none focus:border-[#0073EA]"
                    onClick={(e) => e.stopPropagation()}
                  />
                )
              ) : (
                <p className="text-[12px] text-[#323338] truncate min-h-[20px] leading-[20px]">
                  {getDisplayValue(field) || (
                    <span className="text-[#C5C7D0]">
                      {field.placeholder || "בחר..."}
                    </span>
                  )}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
