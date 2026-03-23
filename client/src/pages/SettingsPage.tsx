import { useState, useEffect } from "react";
import { avatarColor, handleMutationError } from "../lib/utils";
import { useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Zap,
  Clock,
  Plus,
  Pencil,
  Trash2,
  Shield,
  Star,
  User,
  Users,
  Mail,
  Crown,
  UserPlus,
  Workflow,
  Palette,
  Tag,
  Navigation,
  Calendar,
  Plug2,
  AlarmClock,
} from "lucide-react";
import toast from "react-hot-toast";
import PageShell from "../components/layout/PageShell";
import Modal from "../components/shared/Modal";
import AutomationTab from "../components/settings/AutomationTab";
import OptionsTab from "../components/settings/OptionsTab";
import TagsTab from "../components/settings/TagsTab";
import NavPermissionsTab from "../components/settings/NavPermissionsTab";
import CalendarTab from "../components/settings/CalendarTab";
import IntegrationsTab from "../components/settings/IntegrationsTab";
import SnoozeSettingsTab from "../components/settings/SnoozeSettingsTab";
import { useAuth } from "../hooks/useAuth";
import { getWorkspaceMembers, inviteMember } from "../api/auth";
import {
  listCannedResponses,
  createCannedResponse,
  updateCannedResponse,
  deleteCannedResponse,
  type CannedResponse,
} from "../api/canned";
import {
  listSlaPolicies,
  createSlaPolicy,
  updateSlaPolicy,
  deleteSlaPolicy,
  type SlaPolicy,
} from "../api/sla";
import { ROLES } from "../lib/constants";

interface SettingsTab {
  key: string;
  label: string;
  icon: typeof User;
  color: string;
  adminOnly?: boolean;
}

const BASE_TABS: SettingsTab[] = [
  { key: "profile", label: "פרופיל", icon: User, color: "#6161FF" },
  { key: "members", label: "חברי צוות", icon: Users, color: "#00CA72" },
  { key: "canned", label: "תגובות מוכנות", icon: Zap, color: "#FDAB3D" },
  { key: "sla", label: "מדיניות SLA", icon: Shield, color: "#A25DDC" },
  { key: "automation", label: "אוטומציה", icon: Workflow, color: "#FF642E" },
  { key: "options", label: "אפשרויות תצוגה", icon: Palette, color: "#66CCFF" },
  { key: "tags", label: "תגיות", icon: Tag, color: "#579BFC" },
  { key: "calendar", label: "Google Calendar", icon: Calendar, color: "#4285F4" },
  { key: "snooze", label: "הגדרות דחייה", icon: AlarmClock, color: "#FF642E", adminOnly: true },
  { key: "integrations", label: "אינטגרציות", icon: Plug2, color: "#00CA72" },
  { key: "nav-permissions", label: "הרשאות ניווט", icon: Navigation, color: "#FB275D", adminOnly: true },
];

type Tab = string;

export default function SettingsPage() {
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState<Tab>(
    () => searchParams.get("tab") ?? "profile",
  );
  const { workspaces, currentWorkspaceId } = useAuth();

  // Sync tab when URL changes (e.g. after OAuth redirect)
  useEffect(() => {
    const urlTab = searchParams.get("tab");
    if (urlTab) setTab(urlTab);
  }, [searchParams]);
  const currentRole = workspaces.find((w) => w.id === currentWorkspaceId)?.role;
  const isOwnerOrAdmin = currentRole === "OWNER" || currentRole === "ADMIN";

  const TABS = BASE_TABS.filter(
    (t) => !t.adminOnly || isOwnerOrAdmin,
  );

  return (
    <PageShell title="הגדרות" subtitle="ניהול מערכת">
      {/* Monday-style underlined tab bar */}
      <div className="bg-white rounded-xl shadow-card px-2">
        <div className="flex gap-1">
          {TABS.map((t) => {
            const isActive = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`relative flex items-center gap-2 px-4 py-3 text-sm font-semibold transition-all whitespace-nowrap ${
                  isActive
                    ? "text-text-primary"
                    : "text-text-tertiary hover:text-text-secondary"
                }`}
              >
                <t.icon
                  size={16}
                  style={isActive ? { color: t.color } : undefined}
                />
                {t.label}
                {isActive && (
                  <span
                    className="absolute bottom-0 left-2 right-2 h-[3px] rounded-t-full"
                    style={{ backgroundColor: t.color }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {tab === "profile" && <ProfileTab />}
      {tab === "members" && <MembersTab />}
      {tab === "canned" && <CannedResponsesTab />}
      {tab === "sla" && <SlaPoliciesTab />}
      {tab === "automation" && <AutomationTab />}
      {tab === "options" && <OptionsTab />}
      {tab === "tags" && <TagsTab />}
      {tab === "calendar" && <CalendarTab />}
      {tab === "snooze" && <SnoozeSettingsTab />}
      {tab === "integrations" && <IntegrationsTab />}
      {tab === "nav-permissions" && <NavPermissionsTab />}
    </PageShell>
  );
}

// ─── Profile Tab ───

function ProfileTab() {
  const { user, workspaces, currentWorkspaceId } = useAuth();
  const currentWs = workspaces.find((w) => w.id === currentWorkspaceId);

  return (
    <div className="space-y-4">
      {/* User Info */}
      <div className="bg-white rounded-xl shadow-card p-6">
        <h2 className="text-base font-bold text-text-primary mb-4">
          פרטים אישיים
        </h2>
        <div className="flex items-center gap-4">
          <div
            className="w-16 h-16 bg-primary rounded-full flex items-center justify-center shadow-sm"
            role="img"
            aria-label={user?.name || "משתמש"}
          >
            <span className="text-white text-2xl font-bold">
              {user?.name?.charAt(0) || "?"}
            </span>
          </div>
          <div className="flex-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-text-tertiary mb-1">
                  שם מלא
                </label>
                <p className="text-sm font-semibold text-text-primary">
                  {user?.name}
                </p>
              </div>
              <div>
                <label className="block text-xs text-text-tertiary mb-1">
                  אימייל
                </label>
                <p className="text-sm text-text-primary">{user?.email}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Workspace Info */}
      <div className="bg-white rounded-xl shadow-card p-6">
        <h2 className="text-base font-bold text-text-primary mb-4">
          סביבת עבודה
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs text-text-tertiary mb-1">
              שם הסביבה
            </label>
            <p className="text-sm font-semibold text-text-primary">
              {currentWs?.name || "—"}
            </p>
          </div>
          <div>
            <label className="block text-xs text-text-tertiary mb-1">
              סלאג
            </label>
            <p className="text-sm text-text-primary font-mono">
              {currentWs?.slug || "—"}
            </p>
          </div>
          <div>
            <label className="block text-xs text-text-tertiary mb-1">
              תפקיד
            </label>
            <p className="text-sm text-text-primary">
              {ROLES[currentWs?.role as keyof typeof ROLES] ||
                currentWs?.role ||
                "—"}
            </p>
          </div>
        </div>
      </div>

      {/* All Workspaces */}
      {workspaces.length > 1 && (
        <div className="bg-white rounded-xl shadow-card p-6">
          <h2 className="text-base font-bold text-text-primary mb-4">
            סביבות עבודה ({workspaces.length})
          </h2>
          <div className="space-y-2">
            {workspaces.map((ws) => (
              <div
                key={ws.id}
                className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                  ws.id === currentWorkspaceId
                    ? "border-primary bg-[#F5F6FF] shadow-sm"
                    : "border-border-light hover:border-border"
                }`}
              >
                <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-sm">
                  <span className="text-white text-sm font-bold">
                    {ws.name.charAt(0)}
                  </span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-text-primary">
                    {ws.name}
                  </p>
                  <p className="text-xs text-text-tertiary">
                    {ROLES[ws.role as keyof typeof ROLES] || ws.role}
                  </p>
                </div>
                {ws.id === currentWorkspaceId && (
                  <span className="text-[10px] bg-primary text-white px-2.5 py-0.5 rounded-full font-semibold">
                    פעיל
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Members Tab ───

function MembersTab() {
  const { currentWorkspaceId } = useAuth();
  const queryClient = useQueryClient();
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"ADMIN" | "AGENT">("AGENT");

  const { data: members, isLoading } = useQuery({
    queryKey: ["workspace-members", currentWorkspaceId],
    queryFn: () => getWorkspaceMembers(currentWorkspaceId!),
    enabled: !!currentWorkspaceId,
  });

  const inviteMut = useMutation({
    mutationFn: () =>
      inviteMember(currentWorkspaceId!, inviteEmail, inviteRole),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["workspace-members", currentWorkspaceId],
      });
      toast.success("הזמנה נשלחה!");
      setShowInvite(false);
      setInviteEmail("");
    },
    onError: handleMutationError,
  });

  const ROLE_COLORS: Record<string, { color: string; label: string }> = {
    OWNER: { color: "#FDAB3D", label: "בעלים" },
    ADMIN: { color: "#6161FF", label: "מנהל" },
    AGENT: { color: "#C4C4C4", label: "נציג" },
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-text-primary">חברי צוות</h2>
          <p className="text-xs text-text-tertiary">
            ניהול חברי הצוות בסביבת העבודה
          </p>
        </div>
        <button
          onClick={() => setShowInvite(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary-hover text-white text-sm font-semibold rounded-lg transition-all hover:shadow-md active:scale-[0.97]"
        >
          <UserPlus size={16} />
          הזמן חבר צוות
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white rounded-xl shadow-card p-4 h-16 animate-pulse"
            />
          ))}
        </div>
      ) : !members || members.length === 0 ? (
        <div className="bg-white rounded-xl shadow-card text-center py-12">
          <Users size={32} className="text-text-tertiary mx-auto mb-2" />
          <p className="text-sm text-text-tertiary">אין חברי צוות</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-card overflow-hidden">
          <div className="divide-y divide-border-light">
            {members.map((m) => {
              const role = ROLE_COLORS[m.role] || ROLE_COLORS.AGENT;
              const memberAvatarColor = avatarColor(m.name || "");
              return (
                <div
                  key={m.memberId}
                  className="px-5 py-3.5 flex items-center gap-3 hover:bg-[#F5F6FF] transition-colors"
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center shadow-sm"
                    style={{ backgroundColor: memberAvatarColor }}
                    role="img"
                    aria-label={m.name || "חבר צוות"}
                  >
                    <span className="text-white text-sm font-bold">
                      {m.name?.charAt(0) || "?"}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-text-primary">
                      {m.name}
                    </p>
                    <p className="text-xs text-text-tertiary flex items-center gap-1">
                      <Mail size={10} />
                      {m.email}
                    </p>
                  </div>
                  <span
                    className="text-[10px] font-semibold px-2.5 py-1 rounded-full text-white flex items-center gap-1"
                    style={{ backgroundColor: role.color }}
                  >
                    {m.role === "OWNER" && <Crown size={10} />}
                    {role.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Invite Modal */}
      <Modal
        open={showInvite}
        onClose={() => setShowInvite(false)}
        title="הזמנת חבר צוות"
        maxWidth="max-w-md"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            inviteMut.mutate();
          }}
          className="space-y-4 p-6"
        >
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              אימייל *
            </label>
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="example@company.com"
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              required
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              תפקיד
            </label>
            <select
              value={inviteRole}
              onChange={(e) =>
                setInviteRole(e.target.value as "ADMIN" | "AGENT")
              }
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            >
              <option value="AGENT">נציג</option>
              <option value="ADMIN">מנהל</option>
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowInvite(false)}
              className="flex-1 py-2 bg-surface-tertiary hover:bg-border text-text-secondary font-semibold rounded-lg transition-colors text-sm"
            >
              ביטול
            </button>
            <button
              type="submit"
              disabled={inviteMut.isPending}
              className="flex-1 py-2 bg-primary hover:bg-primary-hover text-white font-semibold rounded-lg transition-colors text-sm disabled:opacity-50"
            >
              {inviteMut.isPending ? "שולח..." : "שלח הזמנה"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

// ─── Canned Responses Tab ───

function CannedResponsesTab() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<CannedResponse | null>(null);

  const { data: responses, isLoading } = useQuery({
    queryKey: ["canned-responses"],
    queryFn: () => listCannedResponses(),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteCannedResponse(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["canned-responses"] });
      toast.success("תגובה נמחקה");
    },
  });

  // Group by category
  const grouped: Record<string, CannedResponse[]> = {};
  (responses || []).forEach((r) => {
    const cat = r.category || "ללא קטגוריה";
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(r);
  });

  const groupColors = ["#6161FF", "#00CA72", "#FDAB3D", "#A25DDC", "#579BFC"];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-text-primary">
            תגובות מוכנות
          </h2>
          <p className="text-xs text-text-tertiary">
            תבניות תגובה מוכנות לשימוש מהיר בפניות. תומך במשתנים:{" "}
            {"{{contact.firstName}}"}, {"{{agent.name}}"}
          </p>
        </div>
        <button
          onClick={() => {
            setEditing(null);
            setShowForm(true);
          }}
          className="flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary-hover text-white text-sm font-semibold rounded-lg transition-all hover:shadow-md active:scale-[0.97]"
        >
          <Plus size={16} />
          תגובה חדשה
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="bg-white rounded-xl shadow-card h-32 animate-pulse"
            />
          ))}
        </div>
      ) : Object.keys(grouped).length === 0 ? (
        <div className="bg-white rounded-xl shadow-card text-center py-12">
          <Zap size={32} className="text-text-tertiary mx-auto mb-2" />
          <p className="text-sm text-text-tertiary">אין תגובות מוכנות</p>
        </div>
      ) : (
        Object.entries(grouped).map(([category, items], gIdx) => {
          const groupColor = groupColors[gIdx % groupColors.length];
          return (
            <div
              key={category}
              className="bg-white rounded-xl shadow-card overflow-hidden"
            >
              <div
                className="px-4 py-2.5 flex items-center gap-2"
                style={{ backgroundColor: groupColor }}
              >
                <Zap size={14} className="text-white" />
                <h3 className="text-xs font-bold text-white">{category}</h3>
                <span className="text-[10px] font-semibold text-white/80 bg-white/20 px-2 py-0.5 rounded-full">
                  {items.length}
                </span>
              </div>
              <div className="divide-y divide-border-light">
                {items.map((r) => (
                  <div
                    key={r.id}
                    className="px-4 py-3 flex items-start gap-3 hover:bg-[#F5F6FF] transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-semibold text-text-primary">
                        {r.title}
                      </h4>
                      <p className="text-xs text-text-tertiary mt-1 whitespace-pre-wrap line-clamp-2">
                        {r.body}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setEditing(r);
                          setShowForm(true);
                        }}
                        className="p-1.5 rounded-md hover:bg-surface-secondary transition-colors"
                      >
                        <Pencil size={14} className="text-text-tertiary" />
                      </button>
                      <button
                        onClick={() => deleteMut.mutate(r.id)}
                        className="p-1.5 rounded-md hover:bg-red-50 transition-colors"
                      >
                        <Trash2 size={14} className="text-danger" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })
      )}

      {showForm && (
        <CannedResponseForm
          editing={editing}
          onClose={() => setShowForm(false)}
        />
      )}
    </div>
  );
}

function CannedResponseForm({
  editing,
  onClose,
}: {
  editing: CannedResponse | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    title: editing?.title || "",
    body: editing?.body || "",
    category: editing?.category || "",
  });

  const createMut = useMutation({
    mutationFn: () =>
      createCannedResponse({
        title: form.title,
        body: form.body,
        category: form.category || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["canned-responses"] });
      toast.success("תגובה נוצרה!");
      onClose();
    },
    onError: handleMutationError,
  });

  const updateMut = useMutation({
    mutationFn: () =>
      updateCannedResponse(editing!.id, {
        title: form.title,
        body: form.body,
        category: form.category || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["canned-responses"] });
      toast.success("תגובה עודכנה!");
      onClose();
    },
    onError: handleMutationError,
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (editing) {
      updateMut.mutate();
    } else {
      createMut.mutate();
    }
  }

  return (
    <Modal
      open={true}
      onClose={onClose}
      title={editing ? "עריכת תגובה" : "תגובה מוכנה חדשה"}
    >
      <form onSubmit={handleSubmit} className="space-y-4 p-6">
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">
            כותרת *
          </label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            required
            autoFocus
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">
            קטגוריה
          </label>
          <input
            type="text"
            value={form.category}
            onChange={(e) =>
              setForm((f) => ({ ...f, category: e.target.value }))
            }
            className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            placeholder="כללי, סגירה, מעקב..."
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">
            תוכן *
          </label>
          <textarea
            value={form.body}
            onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
            className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
            rows={5}
            required
            placeholder={`שלום {{contact.firstName}},\n\nתוכן ההודעה...\n\nבברכה,\n{{agent.name}}`}
          />
          <p className="text-[10px] text-text-tertiary mt-1">
            משתנים זמינים: {"{{contact.firstName}}"}, {"{{contact.lastName}}"},
            {"{{agent.name}}"}
          </p>
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
            disabled={createMut.isPending || updateMut.isPending}
            className="flex-1 py-2 bg-primary hover:bg-primary-hover text-white font-semibold rounded-lg transition-colors text-sm disabled:opacity-50"
          >
            {editing ? "עדכן" : "צור תגובה"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ─── SLA Policies Tab ───

function SlaPoliciesTab() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<SlaPolicy | null>(null);

  const { data: policies, isLoading } = useQuery({
    queryKey: ["sla-policies"],
    queryFn: () => listSlaPolicies(),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteSlaPolicy(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sla-policies"] });
      toast.success("מדיניות נמחקה");
    },
    onError: handleMutationError,
  });

  function formatMinutes(mins: number) {
    if (mins < 60) return `${mins} דקות`;
    const hours = Math.floor(mins / 60);
    const rem = mins % 60;
    if (rem === 0) return `${hours} שעות`;
    return `${hours} שעות ו-${rem} דקות`;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-text-primary">מדיניות SLA</h2>
          <p className="text-xs text-text-tertiary">
            הגדרת זמני תגובה ופתרון לפניות
          </p>
        </div>
        <button
          onClick={() => {
            setEditing(null);
            setShowForm(true);
          }}
          className="flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary-hover text-white text-sm font-semibold rounded-lg transition-all hover:shadow-md active:scale-[0.97]"
        >
          <Plus size={16} />
          מדיניות חדשה
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="bg-white rounded-xl shadow-card h-20 animate-pulse"
            />
          ))}
        </div>
      ) : !policies || policies.length === 0 ? (
        <div className="bg-white rounded-xl shadow-card text-center py-12">
          <Shield size={32} className="text-text-tertiary mx-auto mb-2" />
          <p className="text-sm text-text-tertiary">אין מדיניות SLA</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {policies.map((p) => (
            <div
              key={p.id}
              className="bg-white rounded-xl shadow-card p-4 flex items-center gap-4 hover:shadow-card-hover transition-all border-r-4"
              style={{
                borderRightColor: p.isDefault ? "#FDAB3D" : "#A25DDC",
              }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{
                  backgroundColor: p.isDefault ? "#FEF0D8" : "#EDE1F5",
                }}
              >
                <Shield
                  size={18}
                  style={{ color: p.isDefault ? "#FDAB3D" : "#A25DDC" }}
                />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-text-primary">
                    {p.name}
                  </h3>
                  {p.isDefault && (
                    <span className="flex items-center gap-0.5 text-[10px] font-semibold px-2 py-0.5 rounded-full text-white bg-[#FDAB3D]">
                      <Star size={10} />
                      ברירת מחדל
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4 mt-1.5">
                  <div className="flex items-center gap-1.5 text-xs text-text-secondary">
                    <Clock size={12} className="text-primary" />
                    <span>
                      תגובה ראשונה: {formatMinutes(p.firstResponseMinutes)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-text-secondary">
                    <Clock size={12} className="text-success" />
                    <span>פתרון: {formatMinutes(p.resolutionMinutes)}</span>
                  </div>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-surface-secondary text-text-tertiary">
                    {p.businessHoursOnly ? "שעות עבודה" : "24/7"}
                  </span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-surface-secondary text-text-tertiary">
                    {p._count.tickets} פניות
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    setEditing(p);
                    setShowForm(true);
                  }}
                  className="p-1.5 rounded-md hover:bg-surface-secondary transition-colors"
                >
                  <Pencil size={14} className="text-text-tertiary" />
                </button>
                <button
                  onClick={() => deleteMut.mutate(p.id)}
                  className="p-1.5 rounded-md hover:bg-red-50 transition-colors"
                >
                  <Trash2 size={14} className="text-danger" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <SlaPolicyForm editing={editing} onClose={() => setShowForm(false)} />
      )}
    </div>
  );
}

function SlaPolicyForm({
  editing,
  onClose,
}: {
  editing: SlaPolicy | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    name: editing?.name || "",
    firstResponseMinutes: editing?.firstResponseMinutes || 60,
    resolutionMinutes: editing?.resolutionMinutes || 480,
    businessHoursOnly: editing?.businessHoursOnly ?? true,
    isDefault: editing?.isDefault ?? false,
  });

  const createMut = useMutation({
    mutationFn: () => createSlaPolicy(form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sla-policies"] });
      toast.success("מדיניות נוצרה!");
      onClose();
    },
    onError: handleMutationError,
  });

  const updateMut = useMutation({
    mutationFn: () => updateSlaPolicy(editing!.id, form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sla-policies"] });
      toast.success("מדיניות עודכנה!");
      onClose();
    },
    onError: handleMutationError,
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (editing) {
      updateMut.mutate();
    } else {
      createMut.mutate();
    }
  }

  return (
    <Modal
      open={true}
      onClose={onClose}
      title={editing ? "עריכת מדיניות SLA" : "מדיניות SLA חדשה"}
    >
      <form onSubmit={handleSubmit} className="space-y-4 p-6">
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">
            שם מדיניות *
          </label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            required
            placeholder="סטנדרטי, פרימיום, VIP..."
            autoFocus
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              תגובה ראשונה (דקות) *
            </label>
            <input
              type="number"
              value={form.firstResponseMinutes}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  firstResponseMinutes: parseInt(e.target.value) || 0,
                }))
              }
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              min={1}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              פתרון (דקות) *
            </label>
            <input
              type="number"
              value={form.resolutionMinutes}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  resolutionMinutes: parseInt(e.target.value) || 0,
                }))
              }
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              min={1}
              required
            />
          </div>
        </div>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.businessHoursOnly}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  businessHoursOnly: e.target.checked,
                }))
              }
              className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
            />
            <span className="text-sm text-text-primary">שעות עבודה בלבד</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.isDefault}
              onChange={(e) =>
                setForm((f) => ({ ...f, isDefault: e.target.checked }))
              }
              className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
            />
            <span className="text-sm text-text-primary">ברירת מחדל</span>
          </label>
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
            disabled={createMut.isPending || updateMut.isPending}
            className="flex-1 py-2 bg-primary hover:bg-primary-hover text-white font-semibold rounded-lg transition-colors text-sm disabled:opacity-50"
          >
            {editing ? "עדכן" : "צור מדיניות"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
