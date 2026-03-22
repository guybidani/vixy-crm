import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  Mail,
  Phone,
  Building2,
  Briefcase,
  Calendar,
  Edit2,
  Trash2,
  X,
  StickyNote,
  PhoneCall,
  MessageCircle,
  Bot,
  Handshake,
  Ticket,
  CheckSquare,
  MessageSquare,
  Mic,
  Brain,
  Megaphone,
  Send,
  ExternalLink,
} from "lucide-react";
import toast from "react-hot-toast";
import StatusBadge from "../shared/StatusBadge";
import StatusDropdown from "../shared/StatusDropdown";
import TagSelector from "../shared/TagSelector";
import MondayPersonCell, {
  type PersonOption,
} from "../shared/MondayPersonCell";
import { getContact, updateContact, deleteContact } from "../../api/contacts";
import { listCompanies } from "../../api/companies";
import { useWorkspaceOptions } from "../../hooks/useWorkspaceOptions";

const ACTIVITY_COLORS: Record<string, string> = {
  NOTE: "#6161FF",
  CALL: "#00CA72",
  EMAIL: "#579BFC",
  MEETING: "#A25DDC",
  WHATSAPP: "#25D366",
  STATUS_CHANGE: "#FDAB3D",
  SYSTEM: "#C4C4C4",
};

interface ContactDetailPanelProps {
  contactId: string;
  onClose: () => void;
}

export default function ContactDetailPanel({
  contactId,
  onClose,
}: ContactDetailPanelProps) {
  const {
    contactStatuses,
  } = useWorkspaceOptions();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"info" | "timeline" | "related">(
    "info",
  );
  const [editing, setEditing] = useState(false);

  const { data: contact, isLoading } = useQuery({
    queryKey: ["contact", contactId],
    queryFn: () => getContact(contactId),
    enabled: !!contactId,
  });

  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState("");

  const statusMutation = useMutation({
    mutationFn: (status: string) => updateContact(contactId, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contact", contactId] });
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      toast.success("סטטוס עודכן");
    },
  });

  const nameMutation = useMutation({
    mutationFn: (data: { firstName: string; lastName: string }) =>
      updateContact(contactId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contact", contactId] });
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      toast.success("שם עודכן");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteContact(contactId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      toast.success("איש קשר נמחק");
      onClose();
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!contact) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-text-secondary">איש קשר לא נמצא</p>
      </div>
    );
  }

  const scoreColor =
    contact.leadScore >= 70
      ? "#00CA72"
      : contact.leadScore >= 40
        ? "#FDAB3D"
        : "#C4C4C4";

  return (
    <div>
      {/* Header */}
      <div className="flex items-start gap-4 mb-6">
        <div
          className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 text-white text-xl font-bold"
          style={{ backgroundColor: "#6161FF" }}
        >
          {contact.firstName?.[0] || "?"}
        </div>
        <div className="flex-1 min-w-0">
          {editingName ? (
            <input
              autoFocus
              className="text-xl font-bold text-text-primary bg-white border border-primary rounded px-2 py-0.5 outline-none w-full"
              value={nameValue}
              onChange={(e) => setNameValue(e.target.value)}
              onBlur={() => {
                const parts = nameValue.trim().split(/\s+/);
                const firstName = parts[0] || contact.firstName;
                const lastName = parts.slice(1).join(" ") || contact.lastName;
                if (
                  firstName !== contact.firstName ||
                  lastName !== contact.lastName
                ) {
                  nameMutation.mutate({ firstName, lastName });
                }
                setEditingName(false);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                if (e.key === "Escape") setEditingName(false);
              }}
            />
          ) : (
            <h2
              className="text-xl font-bold text-text-primary cursor-text hover:bg-surface-secondary/50 rounded px-1 -mx-1 transition-colors"
              onClick={() => {
                setNameValue(`${contact.firstName} ${contact.lastName}`);
                setEditingName(true);
              }}
            >
              {contact.firstName} {contact.lastName}
            </h2>
          )}
          <div className="flex items-center gap-3 mt-1.5">
            <StatusDropdown
              value={contact.status}
              options={contactStatuses}
              onChange={(s) => statusMutation.mutate(s)}
              size="md"
            />
            {/* Lead score ring - click to edit */}
            <LeadScoreRing
              score={contact.leadScore}
              scoreColor={scoreColor}
              onSave={(score) => {
                nameMutation.mutate({ leadScore: score } as any);
              }}
            />
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => setEditing(true)}
            className="p-2 rounded-lg text-text-tertiary hover:text-primary hover:bg-primary-light transition-colors"
            title="עריכה"
          >
            <Edit2 size={16} />
          </button>
          <button
            onClick={() => navigate(`/contacts/${contactId}`)}
            className="p-2 rounded-lg text-text-tertiary hover:text-primary hover:bg-primary-light transition-colors"
            title="פתח בעמוד מלא"
          >
            <ExternalLink size={16} />
          </button>
          <button
            onClick={() => {
              if (confirm("האם למחוק את איש הקשר?")) {
                deleteMutation.mutate();
              }
            }}
            className="p-2 rounded-lg text-text-tertiary hover:text-danger hover:bg-red-50 transition-colors"
            title="מחיקה"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border-light mb-5">
        {(
          [
            { key: "info", label: "פרטים" },
            { key: "timeline", label: "ציר זמן" },
            { key: "related", label: "קשורים" },
          ] as const
        ).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors relative ${
              activeTab === tab.key
                ? "text-primary"
                : "text-text-tertiary hover:text-text-primary"
            }`}
          >
            {tab.label}
            {activeTab === tab.key && (
              <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-primary rounded-t-full" />
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "info" && (
        <InfoTab contact={contact} />
      )}
      {activeTab === "timeline" && <TimelineTab contact={contact} />}
      {activeTab === "related" && (
        <RelatedTab contact={contact} navigate={navigate} />
      )}

      {/* Edit Modal */}
      {editing && (
        <EditContactModal contact={contact} onClose={() => setEditing(false)} />
      )}
    </div>
  );
}

function InfoTab({
  contact,
}: {
  contact: any;
}) {
  const queryClient = useQueryClient();

  const updateMut = useMutation({
    mutationFn: (data: Record<string, any>) => updateContact(contact.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contact", contact.id] });
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      toast.success("עודכן בהצלחה");
    },
    onError: () => toast.error("שגיאה בעדכון"),
  });

  const { data: companiesData } = useQuery({
    queryKey: ["companies", { limit: 200 }],
    queryFn: () => listCompanies({ limit: 200 }),
  });
  const companyOptions: PersonOption[] = (companiesData?.data || []).map(
    (c) => ({ id: c.id, name: c.name }),
  );

  const handleSave = (field: string, value: string) => {
    const payload: Record<string, any> = {};
    payload[field] = value || (field === "companyId" ? null : undefined);
    updateMut.mutate(payload);
  };

  return (
    <div className="grid grid-cols-2 gap-5">
      {/* Contact Details */}
      <div className="space-y-4">
        <div className="bg-surface-secondary/50 rounded-xl p-4">
          <h3 className="font-bold text-text-primary text-sm mb-3">פרטי קשר</h3>
          <div className="space-y-2.5">
            <EditableInfoRow
              icon={<Mail size={14} />}
              label="אימייל"
              value={contact.email || ""}
              placeholder="הוסף אימייל..."
              dir="ltr"
              onSave={(v) => handleSave("email", v)}
            />
            <EditableInfoRow
              icon={<Phone size={14} />}
              label="טלפון"
              value={contact.phone || ""}
              placeholder="הוסף טלפון..."
              dir="ltr"
              onSave={(v) => handleSave("phone", v)}
            />
            <div className="flex items-center gap-2">
              <span className="text-text-tertiary">
                <Building2 size={14} />
              </span>
              <span className="text-xs text-text-tertiary w-14">חברה</span>
              <div className="flex-1">
                <MondayPersonCell
                  value={
                    contact.company
                      ? { id: contact.company.id, name: contact.company.name }
                      : null
                  }
                  options={companyOptions}
                  onChange={(id) => updateMut.mutate({ companyId: id })}
                  placeholder="בחר חברה"
                />
              </div>
            </div>
            <EditableInfoRow
              icon={<Briefcase size={14} />}
              label="תפקיד"
              value={contact.position || ""}
              placeholder="הוסף תפקיד..."
              onSave={(v) => handleSave("position", v)}
            />
            <EditableInfoRow
              icon={<MessageCircle size={14} />}
              label="מקור"
              value={contact.source || ""}
              placeholder="הוסף מקור..."
              onSave={(v) => handleSave("source", v)}
            />
            <InfoRow
              icon={<Calendar size={14} />}
              label="נוצר"
              value={new Date(contact.createdAt).toLocaleDateString("he-IL")}
            />
          </div>
        </div>

        {/* Tags */}
        <div className="bg-surface-secondary/50 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-text-primary text-sm">תגיות</h3>
            <TagSelector
              entityType="contact"
              entityId={contact.id}
              currentTags={
                contact.tags?.map((t: any) => ({
                  id: t.tag?.id || t.id,
                  name: t.tag?.name || t.name,
                  color: t.tag?.color || t.color,
                })) || []
              }
            />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {contact.tags?.map((t: any) => (
              <span
                key={t.tag?.id || t.id}
                className="text-xs font-semibold px-2.5 py-0.5 rounded-full text-white"
                style={{ backgroundColor: t.tag?.color || t.color }}
              >
                {t.tag?.name || t.name}
              </span>
            ))}
            {(!contact.tags || contact.tags.length === 0) && (
              <span className="text-xs text-text-tertiary">אין תגיות</span>
            )}
          </div>
        </div>
      </div>

      {/* WhatsApp + AI */}
      <div className="space-y-4">
        {/* WhatsApp (Jony) */}
        <div className="bg-surface-secondary/50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 bg-[#25D366] rounded-lg flex items-center justify-center">
              <MessageSquare size={14} className="text-white" />
            </div>
            <h3 className="font-bold text-text-primary text-sm">WhatsApp</h3>
            <span className="text-[10px] bg-[#25D366] text-white px-1.5 py-0.5 rounded-full font-semibold">
              Jony
            </span>
          </div>
          {contact.phone ? (
            <div className="space-y-2">
              <div className="bg-white rounded-lg p-3 border border-border-light">
                <p className="text-xs text-text-secondary mb-2">
                  שלח הודעת WhatsApp ל-{contact.firstName}
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="כתוב הודעה..."
                    className="flex-1 px-2.5 py-1.5 border border-border-light rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#25D366]/30 bg-white"
                  />
                  <button className="px-3 py-1.5 bg-[#25D366] hover:bg-[#20BD5C] text-white rounded-lg transition-colors">
                    <Send size={12} />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-xs text-text-tertiary text-center py-2">
              יש להוסיף טלפון לשליחת הודעות
            </p>
          )}
        </div>

        {/* AI Call Analysis */}
        <div className="bg-surface-secondary/50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 bg-[#A25DDC] rounded-lg flex items-center justify-center">
              <Brain size={14} className="text-white" />
            </div>
            <h3 className="font-bold text-text-primary text-sm">
              ניתוח שיחות AI
            </h3>
          </div>
          <button className="w-full flex items-center gap-2 px-3 py-2.5 bg-white hover:bg-[#EDE1F5] rounded-lg transition-colors text-right border border-border-light">
            <Mic size={14} className="text-[#A25DDC]" />
            <div className="flex-1">
              <span className="text-xs font-medium text-[#A25DDC] block">
                העלה הקלטת שיחה
              </span>
              <span className="text-[10px] text-text-tertiary">
                AI ינתח את השיחה ויציע פעולות המשך
              </span>
            </div>
          </button>
        </div>

        {/* Vixy Campaigns */}
        <div className="bg-surface-secondary/50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center">
              <Megaphone size={14} className="text-white" />
            </div>
            <h3 className="font-bold text-text-primary text-sm">
              Vixy קמפיינים
            </h3>
          </div>
          <div className="bg-white rounded-lg p-3 text-center border border-border-light">
            <Megaphone size={20} className="text-primary mx-auto mb-1" />
            <p className="text-xs font-medium text-primary">
              בקרוב - חיבור ל-Vixy
            </p>
            <p className="text-[10px] text-text-tertiary mt-0.5">
              צפו בקמפיינים, הוצאות, ולידים מ-Vixy
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function TimelineTab({ contact }: { contact: any }) {
  const { activityTypes } = useWorkspaceOptions();
  if (!contact.activities || contact.activities.length === 0) {
    return (
      <p className="text-sm text-text-tertiary text-center py-8">אין פעילות</p>
    );
  }

  return (
    <div className="space-y-1">
      {contact.activities.map((activity: any) => {
        const typeInfo = activityTypes[activity.type];
        const color = ACTIVITY_COLORS[activity.type] || "#C4C4C4";
        return (
          <div
            key={activity.id}
            className="flex items-start gap-3 py-3 border-r-[3px] pr-3 rounded-sm"
            style={{ borderRightColor: color }}
          >
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-white mt-0.5"
              style={{ backgroundColor: color }}
            >
              <ActivityIcon type={activity.type} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-text-primary">
                  {typeInfo?.label || activity.type}
                </span>
                <span className="text-xs text-text-tertiary">
                  {new Date(activity.createdAt).toLocaleDateString("he-IL")}{" "}
                  {new Date(activity.createdAt).toLocaleTimeString("he-IL", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              {activity.subject && (
                <p className="text-sm text-text-secondary mt-0.5">
                  {activity.subject}
                </p>
              )}
              {activity.body && (
                <p className="text-xs text-text-tertiary mt-0.5 line-clamp-2">
                  {activity.body}
                </p>
              )}
              {activity.member?.user?.name && (
                <span className="text-xs text-text-tertiary">
                  — {activity.member.user.name}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function RelatedTab({
  contact,
  navigate,
}: {
  contact: any;
  navigate: ReturnType<typeof useNavigate>;
}) {
  const { dealStages, ticketStatuses, priorities } = useWorkspaceOptions();
  return (
    <div className="space-y-5">
      {/* Deals */}
      <div>
        <h3 className="font-bold text-text-primary text-sm mb-3 flex items-center gap-2">
          <Handshake size={16} className="text-[#00CA72]" />
          עסקאות ({contact.deals?.length || 0})
        </h3>
        {contact.deals && contact.deals.length > 0 ? (
          <div className="space-y-2">
            {contact.deals.map((deal: any) => {
              const stage = dealStages[deal.stage];
              return (
                <div
                  key={deal.id}
                  className="flex items-center justify-between p-3 bg-surface-secondary/50 rounded-xl hover:bg-surface-secondary transition-colors cursor-pointer"
                  onClick={() => navigate(`/deals`)}
                >
                  <div>
                    <span className="font-medium text-sm text-text-primary">
                      {deal.title}
                    </span>
                    {deal.assignee && (
                      <span className="text-xs text-text-tertiary block">
                        {deal.assignee.user.name}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-text-primary">
                      ₪{deal.value?.toLocaleString() || 0}
                    </span>
                    {stage && (
                      <StatusBadge label={stage.label} color={stage.color} />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-text-tertiary text-center py-3 bg-surface-secondary/30 rounded-xl">
            אין עסקאות
          </p>
        )}
      </div>

      {/* Tickets */}
      <div>
        <h3 className="font-bold text-text-primary text-sm mb-3 flex items-center gap-2">
          <Ticket size={16} className="text-[#FB275D]" />
          פניות ({contact.tickets?.length || 0})
        </h3>
        {contact.tickets && contact.tickets.length > 0 ? (
          <div className="space-y-2">
            {contact.tickets.map((ticket: any) => {
              const status = ticketStatuses[ticket.status];
              const priority = priorities[ticket.priority];
              return (
                <div
                  key={ticket.id}
                  className="flex items-center justify-between p-3 bg-surface-secondary/50 rounded-xl hover:bg-surface-secondary transition-colors cursor-pointer"
                  onClick={() => navigate(`/tickets/${ticket.id}`)}
                >
                  <span className="font-medium text-sm text-text-primary">
                    {ticket.subject}
                  </span>
                  <div className="flex items-center gap-2">
                    {priority && (
                      <StatusBadge
                        label={priority.label}
                        color={priority.color}
                      />
                    )}
                    {status && (
                      <StatusBadge label={status.label} color={status.color} />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-text-tertiary text-center py-3 bg-surface-secondary/30 rounded-xl">
            אין פניות
          </p>
        )}
      </div>

      {/* Tasks */}
      <div>
        <h3 className="font-bold text-text-primary text-sm mb-3 flex items-center gap-2">
          <CheckSquare size={16} className="text-[#00CA72]" />
          משימות ({contact.tasks?.length || 0})
        </h3>
        {contact.tasks && contact.tasks.length > 0 ? (
          <div className="space-y-2">
            {contact.tasks.map((task: any) => {
              const priority = priorities[task.priority];
              return (
                <div
                  key={task.id}
                  className="flex items-center justify-between p-3 bg-surface-secondary/50 rounded-xl"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                        task.status === "DONE"
                          ? "bg-success border-success"
                          : "border-border"
                      }`}
                    >
                      {task.status === "DONE" && (
                        <span className="text-white text-[10px]">✓</span>
                      )}
                    </div>
                    <span
                      className={`font-medium text-sm ${
                        task.status === "DONE"
                          ? "line-through text-text-tertiary"
                          : "text-text-primary"
                      }`}
                    >
                      {task.title}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {task.dueDate && (
                      <span className="text-xs text-text-tertiary">
                        {new Date(task.dueDate).toLocaleDateString("he-IL")}
                      </span>
                    )}
                    {priority && (
                      <StatusBadge
                        label={priority.label}
                        color={priority.color}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-text-tertiary text-center py-3 bg-surface-secondary/30 rounded-xl">
            אין משימות
          </p>
        )}
      </div>
    </div>
  );
}

function InfoRow({
  icon,
  label,
  value,
  dir,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  dir?: string;
  onClick?: () => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-text-tertiary">{icon}</span>
      <span className="text-xs text-text-tertiary w-14">{label}</span>
      <span
        className={`text-sm text-text-primary ${onClick ? "cursor-pointer hover:text-primary underline-offset-2 hover:underline" : ""}`}
        dir={dir}
        onClick={onClick}
      >
        {value}
      </span>
    </div>
  );
}

function EditableInfoRow({
  icon,
  label,
  value,
  placeholder,
  dir,
  onSave,
  onClick,
  readOnly,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  placeholder?: string;
  dir?: string;
  onSave: (value: string) => void;
  onClick?: () => void;
  readOnly?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [editVal, setEditVal] = useState(value);

  if (editing && !readOnly) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-text-tertiary">{icon}</span>
        <span className="text-xs text-text-tertiary w-14">{label}</span>
        <input
          autoFocus
          className="flex-1 text-sm text-text-primary bg-white border border-primary rounded px-2 py-0.5 outline-none focus:ring-1 focus:ring-primary/30"
          value={editVal}
          dir={dir}
          onChange={(e) => setEditVal(e.target.value)}
          onBlur={() => {
            if (editVal !== value) onSave(editVal);
            setEditing(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            if (e.key === "Escape") {
              setEditVal(value);
              setEditing(false);
            }
          }}
        />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 group/row">
      <span className="text-text-tertiary">{icon}</span>
      <span className="text-xs text-text-tertiary w-14">{label}</span>
      <span
        className={`text-sm flex-1 min-w-0 ${
          value
            ? onClick
              ? "text-primary cursor-pointer hover:underline"
              : "text-text-primary"
            : "text-text-tertiary"
        } ${!readOnly ? "cursor-text hover:bg-surface-secondary/80 rounded px-1 -mx-1 transition-colors" : ""}`}
        dir={dir}
        onClick={() => {
          if (onClick) {
            onClick();
          } else if (!readOnly) {
            setEditVal(value);
            setEditing(true);
          }
        }}
      >
        {value || placeholder || "—"}
      </span>
      {!readOnly && !value && (
        <button
          onClick={() => {
            setEditVal("");
            setEditing(true);
          }}
          className="opacity-0 group-hover/row:opacity-100 text-primary text-[10px] transition-opacity"
        >
          +
        </button>
      )}
    </div>
  );
}

function LeadScoreRing({
  score,
  scoreColor,
  onSave,
}: {
  score: number;
  scoreColor: string;
  onSave: (score: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(String(score));

  if (editing) {
    return (
      <div className="flex items-center gap-1.5">
        <input
          autoFocus
          type="number"
          min={0}
          max={100}
          className="w-14 text-sm text-center border border-primary rounded px-1 py-0.5 outline-none focus:ring-1 focus:ring-primary/30"
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onBlur={() => {
            const n = Math.min(100, Math.max(0, parseInt(val) || 0));
            if (n !== score) onSave(n);
            setEditing(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            if (e.key === "Escape") setEditing(false);
          }}
        />
        <span className="text-xs text-text-tertiary">ציון</span>
      </div>
    );
  }

  return (
    <div
      className="flex items-center gap-1.5 cursor-pointer hover:opacity-80 transition-opacity"
      onClick={() => {
        setVal(String(score));
        setEditing(true);
      }}
      title="לחץ לעריכה"
    >
      <div className="relative w-8 h-8">
        <svg className="w-8 h-8 -rotate-90" viewBox="0 0 36 36">
          <path
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            fill="none"
            stroke="#E8E8FF"
            strokeWidth="3"
          />
          <path
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            fill="none"
            stroke={scoreColor}
            strokeWidth="3"
            strokeDasharray={`${score}, 100`}
            strokeLinecap="round"
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-text-primary">
          {score}
        </span>
      </div>
      <span className="text-xs text-text-tertiary">ציון</span>
    </div>
  );
}

function ActivityIcon({ type }: { type: string }) {
  const size = 12;
  const cls = "text-white";
  switch (type) {
    case "NOTE":
      return <StickyNote size={size} className={cls} />;
    case "CALL":
      return <PhoneCall size={size} className={cls} />;
    case "EMAIL":
      return <Mail size={size} className={cls} />;
    case "MEETING":
      return <Calendar size={size} className={cls} />;
    case "WHATSAPP":
      return <MessageCircle size={size} className={cls} />;
    case "STATUS_CHANGE":
      return <Handshake size={size} className={cls} />;
    default:
      return <Bot size={size} className={cls} />;
  }
}

function EditContactModal({
  contact,
  onClose,
}: {
  contact: any;
  onClose: () => void;
}) {
  const { contactStatuses } = useWorkspaceOptions();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    firstName: contact.firstName,
    lastName: contact.lastName,
    email: contact.email || "",
    phone: contact.phone || "",
    position: contact.position || "",
    source: contact.source || "",
    status: contact.status,
    leadScore: contact.leadScore,
    companyId: contact.companyId || "",
  });

  const { data: companies } = useQuery({
    queryKey: ["companies", { limit: 100 }],
    queryFn: () => listCompanies({ limit: 100 }),
  });

  const mutation = useMutation({
    mutationFn: () =>
      updateContact(contact.id, {
        ...form,
        email: form.email || undefined,
        phone: form.phone || undefined,
        companyId: form.companyId || null,
        position: form.position || undefined,
        source: form.source || undefined,
        leadScore: Number(form.leadScore),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contact", contact.id] });
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      toast.success("איש קשר עודכן!");
      onClose();
    },
    onError: (err: any) => {
      toast.error(err?.message || "שגיאה בעדכון");
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    mutation.mutate();
  }

  const setField = (key: string, value: string | number) =>
    setForm((f) => ({ ...f, [key]: value }));

  return (
    <div className="fixed inset-0 bg-black/30 z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-modal w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-text-primary">עריכת איש קשר</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-surface-secondary transition-colors"
          >
            <X size={18} className="text-text-tertiary" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                שם פרטי *
              </label>
              <input
                type="text"
                value={form.firstName}
                onChange={(e) => setField("firstName", e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                שם משפחה *
              </label>
              <input
                type="text"
                value={form.lastName}
                onChange={(e) => setField("lastName", e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                אימייל
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setField("email", e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                dir="ltr"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                טלפון
              </label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setField("phone", e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                dir="ltr"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                חברה
              </label>
              <select
                value={form.companyId}
                onChange={(e) => setField("companyId", e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white"
              >
                <option value="">ללא חברה</option>
                {companies?.data.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                תפקיד
              </label>
              <input
                type="text"
                value={form.position}
                onChange={(e) => setField("position", e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                סטטוס
              </label>
              <select
                value={form.status}
                onChange={(e) => setField("status", e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white"
              >
                {Object.entries(contactStatuses).map(([key, val]) => (
                  <option key={key} value={key}>
                    {val.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                ציון ליד (0-100)
              </label>
              <input
                type="number"
                min={0}
                max={100}
                value={form.leadScore}
                onChange={(e) => setField("leadScore", e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 bg-surface-tertiary hover:bg-border text-text-secondary font-semibold rounded-lg transition-colors text-sm"
            >
              ביטול
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="flex-1 py-2 bg-primary hover:bg-primary-hover text-white font-semibold rounded-lg transition-colors text-sm disabled:opacity-50"
            >
              {mutation.isPending ? "שומר..." : "שמור שינויים"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
