import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  X,
  Mail,
  Phone,
  Building2,
  Calendar,
  User,
  DollarSign,
  Save,
  Trash2,
  Clock,
  StickyNote,
  PhoneCall,
  MessageCircle,
  Bot,
  ArrowRight,
  CheckSquare,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  getDeal,
  updateDeal,
  deleteDeal,
} from "../../api/deals";
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
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, string>>({});

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

  function startEditNotes() {
    setEditingNotes(true);
    setNotes(deal?.notes || "");
  }

  function saveNotes() {
    updateMut.mutate({ notes });
    setEditingNotes(false);
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
                onClick={() => {
                  if (confirm("למחוק את העסקה?")) deleteMut.mutate();
                }}
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
                  <a
                    href={`tel:${deal.contact.phone}`}
                    className="flex items-center gap-2 text-[13px] text-[#323338] hover:text-primary transition-colors"
                  >
                    <Phone size={13} className="text-[#676879]" />
                    <span dir="ltr">{deal.contact.phone}</span>
                  </a>
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
                      className="w-full min-h-[100px] px-3 py-2 text-sm border border-[#C5C7D0] rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-y"
                      placeholder="הוסף הערות..."
                    />
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => setEditingNotes(false)}
                        className="px-3 py-1.5 text-xs text-[#676879] hover:bg-[#F5F6F8] rounded-lg transition-colors"
                      >
                        ביטול
                      </button>
                      <button
                        onClick={saveNotes}
                        className="px-3 py-1.5 text-xs text-white bg-primary hover:bg-primary-hover rounded-lg transition-colors flex items-center gap-1"
                      >
                        <Save size={12} />
                        שמור
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
