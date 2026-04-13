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
  Settings2,
  Lock,
  ChevronDown,
  Check,
  X,
  Globe,
  Building2,
  CheckCircle2,
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
import {
  getWorkspaceMembers,
  inviteMember,
  changeMemberRole,
  removeMember,
  updateWorkspace,
  updateProfile,
} from "../api/auth";
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
  { key: "general", label: "כללי", icon: Settings2, color: "#6161FF", adminOnly: true },
  { key: "profile", label: "פרופיל", icon: User, color: "#6161FF" },
  { key: "members", label: "חברי צוות", icon: Users, color: "#00CA72", adminOnly: true },
  { key: "permissions", label: "הרשאות", icon: Lock, color: "#FB275D", adminOnly: true },
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
    <PageShell title="הגדרות" subtitle="ניהול מערכת" emoji="⚙️" boardStyle>
      {/* Monday-style underlined tab bar */}
      <div className="bg-white rounded-xl shadow-[0_1px_6px_rgba(0,0,0,0.08)] px-2 mb-4 relative">
        <div
          role="tablist"
          aria-label="הגדרות"
          className="flex gap-0 overflow-x-auto border-b border-[#E6E9EF] scrollbar-thin scrollbar-thumb-[#E6E9EF] scrollbar-track-transparent"
        >
          {TABS.map((t) => {
            const isActive = tab === t.key;
            return (
              <button
                key={t.key}
                role="tab"
                aria-selected={isActive}
                aria-controls={`settings-panel-${t.key}`}
                onClick={() => setTab(t.key)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-[13px] font-medium transition-colors border-b-[2px] -mb-px whitespace-nowrap ${
                  isActive
                    ? "text-[#0073EA] border-[#0073EA]"
                    : "text-[#676879] border-transparent hover:text-[#323338] hover:bg-[#F5F6F8]"
                }`}
              >
                <t.icon size={14} />
                {t.label}
              </button>
            );
          })}
        </div>
        {/* Fade hint for horizontal scroll on mobile */}
        <div className="absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-white to-transparent pointer-events-none md:hidden" />
      </div>

      {tab === "general" && <GeneralTab />}
      {tab === "profile" && <ProfileTab />}
      {tab === "members" && <MembersTab />}
      {tab === "permissions" && <WorkspacePermissionsTab />}
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

// ─── General Tab (workspace settings) ───

function GeneralTab() {
  const { workspaces, currentWorkspaceId } = useAuth();
  const queryClient = useQueryClient();
  const currentWs = workspaces.find((w) => w.id === currentWorkspaceId);

  const [name, setName] = useState(currentWs?.name || "");
  const [timezone, setTimezone] = useState("Asia/Jerusalem");
  const [editingName, setEditingName] = useState(false);

  const TIMEZONES = [
    { value: "Asia/Jerusalem", label: "ישראל (GMT+2/+3)" },
    { value: "Europe/London", label: "לונדון (GMT+0/+1)" },
    { value: "Europe/Berlin", label: "ברלין (GMT+1/+2)" },
    { value: "America/New_York", label: "ניו יורק (GMT-5/-4)" },
    { value: "America/Los_Angeles", label: "לוס אנג'לס (GMT-8/-7)" },
    { value: "Asia/Dubai", label: "דובאי (GMT+4)" },
  ];

  const updateMut = useMutation({
    mutationFn: (data: { name?: string; timezone?: string }) =>
      updateWorkspace(currentWorkspaceId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["me"] });
      toast.success("הגדרות עודכנו");
      setEditingName(false);
    },
    onError: handleMutationError,
  });

  return (
    <div className="space-y-4 max-w-2xl">
      {/* Workspace name */}
      <div className="bg-white rounded-xl shadow-[0_1px_6px_rgba(0,0,0,0.08)] p-6">
        <h2 className="text-base font-bold text-[#323338] mb-5 flex items-center gap-2">
          <Building2 size={16} className="text-[#0073EA]" />
          פרטי סביבת עבודה
        </h2>

        {/* Logo placeholder */}
        <div className="flex items-center gap-4 mb-6">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-sm text-white text-2xl font-bold"
            style={{ backgroundColor: "#6161FF" }}
          >
            {(name || currentWs?.name || "W").charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-semibold text-[#323338]">{currentWs?.name}</p>
            <p className="text-xs text-[#9699A6] font-mono">{currentWs?.slug}</p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Workspace name */}
          <div>
            <label className="block text-xs font-semibold text-[#676879] mb-1.5">
              שם סביבת עבודה
            </label>
            {editingName ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="flex-1 px-3 py-2 border border-[#0073EA] rounded-[4px] text-sm focus:outline-none focus:ring-2 focus:ring-[#0073EA]/20"
                  autoFocus
                />
                <button
                  onClick={() => updateMut.mutate({ name })}
                  disabled={updateMut.isPending || !name.trim()}
                  className="px-4 py-2 bg-[#0073EA] text-white text-[13px] font-medium rounded-[4px] hover:bg-[#0060C2] disabled:opacity-50 transition-colors"
                >
                  שמור
                </button>
                <button
                  onClick={() => { setName(currentWs?.name || ""); setEditingName(false); }}
                  className="px-3 py-2 bg-[#F5F6F8] text-[#676879] text-[13px] font-medium rounded-[4px] hover:bg-border transition-colors"
                >
                  ביטול
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <p className="text-sm font-semibold text-[#323338] flex-1">{currentWs?.name}</p>
                <button
                  onClick={() => setEditingName(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#676879] border border-[#D0D4E4] rounded-[4px] hover:border-[#0073EA] hover:text-[#0073EA] transition-colors"
                >
                  <Pencil size={12} /> ערוך
                </button>
              </div>
            )}
          </div>

          {/* Timezone */}
          <div>
            <label className="block text-xs font-semibold text-[#676879] mb-1.5">
              <Globe size={12} className="inline mr-1" />
              אזור זמן
            </label>
            <div className="flex items-center gap-2">
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="flex-1 px-3 py-2 border border-[#D0D4E4] rounded-[4px] text-sm focus:outline-none focus:ring-2 focus:ring-[#0073EA]/20 focus:border-[#0073EA] bg-white"
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz.value} value={tz.value}>{tz.label}</option>
                ))}
              </select>
              <button
                onClick={() => updateMut.mutate({ timezone })}
                disabled={updateMut.isPending}
                className="px-4 py-2 bg-[#0073EA] text-white text-[13px] font-medium rounded-[4px] hover:bg-[#0060C2] disabled:opacity-50 transition-colors"
              >
                שמור
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Profile Tab ───

function ProfileTab() {
  const { user, workspaces, currentWorkspaceId } = useAuth();
  const queryClient = useQueryClient();
  const currentWs = workspaces.find((w) => w.id === currentWorkspaceId);
  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState(user?.name || "");

  const updateMut = useMutation({
    mutationFn: (data: { name: string }) => updateProfile(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["me"] });
      toast.success("פרופיל עודכן");
      setEditingName(false);
    },
    onError: handleMutationError,
  });

  const avatarBg = avatarColor(user?.name || "");

  return (
    <div className="space-y-4 max-w-2xl">
      {/* Personal info */}
      <div className="bg-white rounded-xl shadow-[0_1px_6px_rgba(0,0,0,0.08)] p-6">
        <h2 className="text-base font-bold text-[#323338] mb-5">פרטים אישיים</h2>
        <div className="flex items-start gap-5">
          {/* Avatar */}
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center shadow-sm flex-shrink-0"
            style={{ backgroundColor: avatarBg }}
            role="img"
            aria-label={user?.name || "משתמש"}
          >
            <span className="text-white text-2xl font-bold">
              {(name || user?.name)?.charAt(0) || "?"}
            </span>
          </div>
          <div className="flex-1 space-y-4">
            {/* Name */}
            <div>
              <label className="block text-xs font-semibold text-[#676879] mb-1.5">שם מלא</label>
              {editingName ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="flex-1 px-3 py-2 border border-[#0073EA] rounded-[4px] text-sm focus:outline-none focus:ring-2 focus:ring-[#0073EA]/20"
                    autoFocus
                  />
                  <button
                    onClick={() => updateMut.mutate({ name })}
                    disabled={updateMut.isPending || !name.trim()}
                    className="px-4 py-2 bg-[#0073EA] text-white text-[13px] font-medium rounded-[4px] hover:bg-[#0060C2] disabled:opacity-50 transition-colors"
                  >
                    שמור
                  </button>
                  <button
                    onClick={() => { setName(user?.name || ""); setEditingName(false); }}
                    className="px-3 py-2 bg-[#F5F6F8] text-[#676879] text-[13px] font-medium rounded-[4px] hover:bg-border transition-colors"
                  >
                    ביטול
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <p className="text-sm font-semibold text-[#323338] flex-1">{user?.name}</p>
                  <button
                    onClick={() => setEditingName(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#676879] border border-[#D0D4E4] rounded-[4px] hover:border-[#0073EA] hover:text-[#0073EA] transition-colors"
                  >
                    <Pencil size={12} /> ערוך
                  </button>
                </div>
              )}
            </div>
            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-[#676879] mb-1.5">
                <Mail size={12} className="inline mr-1" />
                אימייל
              </label>
              <p className="text-sm text-[#323338]">{user?.email}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Workspace membership */}
      <div className="bg-white rounded-xl shadow-[0_1px_6px_rgba(0,0,0,0.08)] p-6">
        <h2 className="text-base font-bold text-[#323338] mb-4">סביבת עבודה נוכחית</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs text-[#9699A6] mb-1">שם הסביבה</label>
            <p className="text-sm font-semibold text-[#323338]">{currentWs?.name || "—"}</p>
          </div>
          <div>
            <label className="block text-xs text-[#9699A6] mb-1">סלאג</label>
            <p className="text-sm text-[#323338] font-mono">{currentWs?.slug || "—"}</p>
          </div>
          <div>
            <label className="block text-xs text-[#9699A6] mb-1">תפקיד</label>
            <RoleBadge role={currentWs?.role || ""} />
          </div>
        </div>
      </div>

      {/* All Workspaces */}
      {workspaces.length > 1 && (
        <div className="bg-white rounded-xl shadow-[0_1px_6px_rgba(0,0,0,0.08)] p-6">
          <h2 className="text-base font-bold text-[#323338] mb-4">
            סביבות עבודה ({workspaces.length})
          </h2>
          <div className="space-y-2">
            {workspaces.map((ws) => (
              <div
                key={ws.id}
                className={`flex items-center gap-3 p-3 rounded-[4px] border transition-all ${
                  ws.id === currentWorkspaceId
                    ? "border-[#0073EA] bg-[#F5F6FF] shadow-sm"
                    : "border-[#E6E9EF] hover:border-[#E6E9EF]"
                }`}
              >
                <div className="w-10 h-10 bg-[#0073EA] rounded-xl flex items-center justify-center shadow-sm">
                  <span className="text-white text-sm font-bold">{ws.name.charAt(0)}</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-[#323338]">{ws.name}</p>
                  <p className="text-xs text-[#9699A6]">
                    {ROLES[ws.role as keyof typeof ROLES] || ws.role}
                  </p>
                </div>
                {ws.id === currentWorkspaceId && (
                  <span className="text-[10px] bg-[#0073EA] text-white px-2.5 py-0.5 rounded-full font-semibold">
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

// ─── Shared role badge ───

function RoleBadge({ role }: { role: string }) {
  const ROLE_META: Record<string, { color: string; label: string }> = {
    OWNER: { color: "#FDAB3D", label: "בעלים" },
    ADMIN: { color: "#6161FF", label: "מנהל" },
    AGENT: { color: "#C4C4C4", label: "נציג" },
    MEMBER: { color: "#579BFC", label: "חבר" },
    VIEWER: { color: "#C4C4C4", label: "צופה" },
  };
  const meta = ROLE_META[role] || { color: "#C4C4C4", label: role };
  return (
    <span
      className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full text-white"
      style={{ backgroundColor: meta.color }}
    >
      {role === "OWNER" && <Crown size={10} />}
      {meta.label}
    </span>
  );
}

// ─── Members Tab ───

function MembersTab() {
  const { currentWorkspaceId, workspaces, user } = useAuth();
  const queryClient = useQueryClient();
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"ADMIN" | "AGENT">("AGENT");
  const [inviteSent, setInviteSent] = useState(false);
  const [roleDropdown, setRoleDropdown] = useState<string | null>(null);
  const [memberToRemove, setMemberToRemove] = useState<{ id: string; name: string } | null>(null);

  // Dismiss role dropdown on Escape key
  useEffect(() => {
    if (!roleDropdown) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setRoleDropdown(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [roleDropdown]);

  const currentRole = workspaces.find((w) => w.id === currentWorkspaceId)?.role;
  const isOwnerOrAdmin = currentRole === "OWNER" || currentRole === "ADMIN";

  const { data: members, isLoading } = useQuery({
    queryKey: ["workspace-members", currentWorkspaceId],
    queryFn: () => getWorkspaceMembers(currentWorkspaceId!),
    enabled: !!currentWorkspaceId,
  });

  const inviteMut = useMutation({
    mutationFn: () => inviteMember(currentWorkspaceId!, inviteEmail, inviteRole),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspace-members", currentWorkspaceId] });
      setInviteSent(true);
      setInviteEmail("");
    },
    onError: handleMutationError,
  });

  const changeRoleMut = useMutation({
    mutationFn: ({ memberId, role }: { memberId: string; role: "ADMIN" | "AGENT" }) =>
      changeMemberRole(currentWorkspaceId!, memberId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspace-members", currentWorkspaceId] });
      toast.success("תפקיד עודכן");
      setRoleDropdown(null);
    },
    onError: handleMutationError,
  });

  const removeMut = useMutation({
    mutationFn: (memberId: string) => removeMember(currentWorkspaceId!, memberId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspace-members", currentWorkspaceId] });
      toast.success("חבר צוות הוסר");
    },
    onError: handleMutationError,
  });

  function formatLastActive(date: string | undefined | null) {
    if (!date) return "—";
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return "היום";
    if (diffDays === 1) return "אתמול";
    if (diffDays < 7) return `לפני ${diffDays} ימים`;
    return d.toLocaleDateString("he-IL");
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-[#323338]">חברי צוות</h2>
          <p className="text-xs text-[#9699A6]">
            {members?.length || 0} חברים בסביבת העבודה
          </p>
        </div>
        {isOwnerOrAdmin && (
          <button
            onClick={() => { setShowInvite(true); setInviteSent(false); }}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#0073EA] hover:bg-[#0060C2] text-white text-[13px] font-medium rounded-[4px] transition-all hover:shadow-md active:scale-[0.97]"
          >
            <UserPlus size={16} />
            + הזמן חבר
          </button>
        )}
      </div>

      {/* Members table */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl shadow-[0_1px_6px_rgba(0,0,0,0.08)] p-4 h-16 animate-pulse" />
          ))}
        </div>
      ) : !members || members.length === 0 ? (
        <div className="bg-white rounded-xl shadow-[0_1px_6px_rgba(0,0,0,0.08)] text-center py-12">
          <Users size={32} className="text-[#9699A6] mx-auto mb-2" />
          <p className="text-sm text-[#9699A6]">אין חברי צוות</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-[0_1px_6px_rgba(0,0,0,0.08)] overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-[1fr_1fr_auto_auto] gap-4 px-5 py-2.5 bg-[#F5F6F8] border-b border-[#E6E9EF] text-[11px] font-semibold text-[#9699A6] uppercase tracking-wide">
            <span>חבר</span>
            <span>פעיל לאחרונה</span>
            <span>תפקיד</span>
            {isOwnerOrAdmin && <span>פעולות</span>}
          </div>
          <div className="divide-y divide-[#E6E9EF]">
            {members.map((m) => {
              const memberAvatarColor = avatarColor(m.name || "");
              const isCurrentUser = m.userId === user?.id;
              const canEdit = isOwnerOrAdmin && m.role !== "OWNER" && !isCurrentUser;
              return (
                <div
                  key={m.memberId}
                  className="grid grid-cols-[1fr_1fr_auto_auto] gap-4 items-center px-5 py-3.5 hover:bg-[#F5F6FF] transition-colors"
                >
                  {/* Member info */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center shadow-sm flex-shrink-0"
                      style={{ backgroundColor: memberAvatarColor }}
                      role="img"
                      aria-label={m.name || "חבר צוות"}
                    >
                      <span className="text-white text-sm font-bold">
                        {m.name?.charAt(0) || "?"}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[#323338] truncate">
                        {m.name} {isCurrentUser && <span className="text-[10px] text-[#9699A6] font-normal">(אתה)</span>}
                      </p>
                      <p className="text-xs text-[#9699A6] flex items-center gap-1 truncate">
                        <Mail size={10} className="flex-shrink-0" />
                        {m.email}
                      </p>
                    </div>
                  </div>

                  {/* Last active */}
                  <p className="text-xs text-[#9699A6]">
                    {formatLastActive((m as { lastActive?: string }).lastActive)}
                  </p>

                  {/* Role badge / dropdown */}
                  <div className="relative">
                    {canEdit ? (
                      <button
                        onClick={() => setRoleDropdown(roleDropdown === m.memberId ? null : m.memberId)}
                        className="flex items-center gap-1 group"
                      >
                        <RoleBadge role={m.role} />
                        <ChevronDown size={12} className="text-[#9699A6] group-hover:text-[#0073EA] transition-colors" />
                      </button>
                    ) : (
                      <RoleBadge role={m.role} />
                    )}
                    {roleDropdown === m.memberId && (
                      <div className="absolute top-full right-0 mt-1 bg-white rounded-xl shadow-lg border border-[#E6E9EF] z-50 py-1.5 min-w-[140px]">
                        {(["ADMIN", "AGENT"] as const).map((r) => (
                          <button
                            key={r}
                            onClick={() => changeRoleMut.mutate({ memberId: m.memberId, role: r })}
                            disabled={changeRoleMut.isPending}
                            className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-[#F5F6FF] transition-colors ${m.role === r ? "font-semibold text-[#0073EA]" : "text-[#323338]"}`}
                          >
                            {m.role === r && <Check size={12} className="text-[#0073EA]" />}
                            {m.role !== r && <span className="w-3" />}
                            {r === "ADMIN" ? "מנהל" : "נציג"}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  {isOwnerOrAdmin && (
                    <div>
                      {canEdit ? (
                        <button
                          onClick={() => setMemberToRemove({ id: m.memberId, name: m.name || "חבר צוות" })}
                          disabled={removeMut.isPending}
                          className="p-1.5 rounded-md hover:bg-[#FFEEF0] transition-colors group"
                          title="הסר מחבר"
                        >
                          <X size={15} className="text-[#9699A6] group-hover:text-[#E44258] transition-colors" />
                        </button>
                      ) : (
                        <span className="w-8 block" />
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Invite Modal */}
      <Modal
        open={showInvite}
        onClose={() => { setShowInvite(false); setInviteSent(false); setInviteEmail(""); }}
        title="הזמנת חבר צוות"
        maxWidth="max-w-md"
      >
        {inviteSent ? (
          <div className="p-8 flex flex-col items-center gap-4 text-center">
            <div className="w-16 h-16 bg-[#E6F9F1] rounded-full flex items-center justify-center">
              <CheckCircle2 size={32} className="text-success" />
            </div>
            <div>
              <p className="text-base font-bold text-[#323338]">ההזמנה נשלחה!</p>
              <p className="text-sm text-[#9699A6] mt-1">החבר החדש נוסף לסביבת העבודה</p>
            </div>
            <button
              onClick={() => { setInviteSent(false); }}
              className="px-5 py-2 bg-[#0073EA] text-white text-[13px] font-medium rounded-[4px] hover:bg-[#0060C2] transition-colors"
            >
              הזמן עוד
            </button>
          </div>
        ) : (
          <form
            onSubmit={(e) => { e.preventDefault(); inviteMut.mutate(); }}
            className="space-y-4 p-6"
          >
            <div>
              <label className="block text-sm font-medium text-[#323338] mb-1">אימייל *</label>
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="example@company.com"
                className="w-full px-3 py-2 border border-[#D0D4E4] rounded-[4px] text-sm focus:outline-none focus:ring-2 focus:ring-[#0073EA]/20 focus:border-[#0073EA]"
                required
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#323338] mb-1">תפקיד</label>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as "ADMIN" | "AGENT")}
                className="w-full px-3 py-2 border border-[#D0D4E4] rounded-[4px] text-sm focus:outline-none focus:ring-2 focus:ring-[#0073EA]/20 focus:border-[#0073EA]"
              >
                <option value="AGENT">נציג — גישה לנתונים בלבד</option>
                <option value="ADMIN">מנהל — גישה מלאה + הגדרות</option>
              </select>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowInvite(false)}
                className="flex-1 py-2 bg-[#F5F6F8] hover:bg-border text-[#676879] font-semibold rounded-[4px] transition-colors text-[13px]"
              >
                ביטול
              </button>
              <button
                type="submit"
                disabled={inviteMut.isPending}
                className="flex-1 py-2 bg-[#0073EA] hover:bg-[#0060C2] text-white font-semibold rounded-[4px] transition-colors text-[13px] disabled:opacity-50"
              >
                {inviteMut.isPending ? "שולח..." : "שלח הזמנה"}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Close dropdown on outside click */}
      {roleDropdown && (
        <div className="fixed inset-0 z-40" onClick={() => setRoleDropdown(null)} />
      )}

      <ConfirmDialog
        open={!!memberToRemove}
        onConfirm={() => {
          if (memberToRemove) removeMut.mutate(memberToRemove.id);
          setMemberToRemove(null);
        }}
        onCancel={() => setMemberToRemove(null)}
        title="הסרת חבר צוות"
        message={memberToRemove ? `האם אתה בטוח שברצונך להסיר את ${memberToRemove.name} מסביבת העבודה?` : ""}
        confirmText="הסר"
        cancelText="ביטול"
        variant="danger"
      />
    </div>
  );
}

// ─── Workspace Permissions Tab ───

function WorkspacePermissionsTab() {
  const { workspaces, currentWorkspaceId } = useAuth();
  const currentRole = workspaces.find((w) => w.id === currentWorkspaceId)?.role;
  const isOwnerOrAdmin = currentRole === "OWNER" || currentRole === "ADMIN";

  // Permissions state (saved locally for now — can be persisted to workspace settings)
  const [perms, setPerms] = useState({
    createBoards: ["OWNER", "ADMIN"] as string[],
    inviteMembers: ["OWNER", "ADMIN"] as string[],
    exportData: ["OWNER", "ADMIN", "AGENT"] as string[],
    deleteRecords: ["OWNER", "ADMIN"] as string[],
    viewAnalytics: ["OWNER", "ADMIN", "AGENT"] as string[],
  });

  const PERM_LABELS: Record<keyof typeof perms, string> = {
    createBoards: "יצירת בורדים חדשים",
    inviteMembers: "הזמנת חברי צוות",
    exportData: "ייצוא נתונים",
    deleteRecords: "מחיקת רשומות",
    viewAnalytics: "צפייה בדוחות",
  };

  const ALL_ROLES = ["OWNER", "ADMIN", "AGENT"] as const;
  const ROLE_LABELS: Record<string, string> = { OWNER: "בעלים", ADMIN: "מנהל", AGENT: "נציג" };

  function togglePerm(perm: keyof typeof perms, role: string) {
    if (role === "OWNER") return; // OWNER always has all permissions
    setPerms((prev) => {
      const current = prev[perm];
      const has = current.includes(role);
      return {
        ...prev,
        [perm]: has ? current.filter((r) => r !== role) : [...current, role],
      };
    });
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="bg-white rounded-xl shadow-[0_1px_6px_rgba(0,0,0,0.08)] p-6">
        <h2 className="text-base font-bold text-[#323338] mb-1">הרשאות סביבת עבודה</h2>
        <p className="text-xs text-[#9699A6] mb-6">קבע מי יכול לבצע כל פעולה לפי תפקיד</p>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="text-right text-xs font-semibold text-[#9699A6] pb-3 pr-0">פעולה</th>
                {ALL_ROLES.map((r) => (
                  <th key={r} className="text-center text-xs font-semibold text-[#9699A6] pb-3 px-4">
                    <RoleBadge role={r} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E6E9EF]">
              {(Object.keys(perms) as (keyof typeof perms)[]).map((perm) => (
                <tr key={perm} className="hover:bg-[#F5F6FF] transition-colors">
                  <td className="py-3 text-sm text-[#323338] font-medium">{PERM_LABELS[perm]}</td>
                  {ALL_ROLES.map((role) => {
                    const isChecked = perms[perm].includes(role);
                    const isLocked = role === "OWNER"; // OWNER always has permission
                    return (
                      <td key={role} className="py-3 text-center px-4">
                        <button
                          onClick={() => isOwnerOrAdmin && !isLocked && togglePerm(perm, role)}
                          disabled={isLocked || !isOwnerOrAdmin}
                          className={`w-5 h-5 rounded flex items-center justify-center mx-auto transition-colors ${
                            isChecked
                              ? "bg-[#0073EA] text-white"
                              : "border-2 border-[#E6E9EF] hover:border-[#0073EA]"
                          } ${isLocked ? "opacity-60 cursor-not-allowed" : isOwnerOrAdmin ? "cursor-pointer" : "cursor-not-allowed opacity-60"}`}
                        >
                          {isChecked && <Check size={12} />}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!isOwnerOrAdmin && (
          <p className="mt-4 text-xs text-[#9699A6] bg-[#F5F6F8] rounded-lg p-3 flex items-center gap-2">
            <Lock size={12} />
            רק בעלים ומנהלים יכולים לשנות הרשאות
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Canned Responses Tab ───

function CannedResponsesTab() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<CannedResponse | null>(null);
  const [responseToDelete, setResponseToDelete] = useState<{ id: string; title: string } | null>(null);

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
          <h2 className="text-base font-bold text-[#323338]">
            תגובות מוכנות
          </h2>
          <p className="text-xs text-[#9699A6]">
            תבניות תגובה מוכנות לשימוש מהיר בפניות. תומך במשתנים:{" "}
            {"{{contact.firstName}}"}, {"{{agent.name}}"}
          </p>
        </div>
        <button
          onClick={() => {
            setEditing(null);
            setShowForm(true);
          }}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#0073EA] hover:bg-[#0060C2] text-white text-[13px] font-medium rounded-[4px] transition-all hover:shadow-md active:scale-[0.97]"
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
              className="bg-white rounded-xl shadow-[0_1px_6px_rgba(0,0,0,0.08)] h-32 animate-pulse"
            />
          ))}
        </div>
      ) : Object.keys(grouped).length === 0 ? (
        <div className="bg-white rounded-xl shadow-[0_1px_6px_rgba(0,0,0,0.08)] text-center py-12">
          <Zap size={32} className="text-[#9699A6] mx-auto mb-2" />
          <p className="text-sm text-[#9699A6]">אין תגובות מוכנות</p>
        </div>
      ) : (
        Object.entries(grouped).map(([category, items], gIdx) => {
          const groupColor = groupColors[gIdx % groupColors.length];
          return (
            <div
              key={category}
              className="bg-white rounded-xl shadow-[0_1px_6px_rgba(0,0,0,0.08)] overflow-hidden"
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
              <div className="divide-y divide-[#E6E9EF]">
                {items.map((r) => (
                  <div
                    key={r.id}
                    className="px-4 py-3 flex items-start gap-3 hover:bg-[#F5F6FF] transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-semibold text-[#323338]">
                        {r.title}
                      </h4>
                      <p className="text-xs text-[#9699A6] mt-1 whitespace-pre-wrap line-clamp-2">
                        {r.body}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setEditing(r);
                          setShowForm(true);
                        }}
                        className="p-1.5 rounded-md hover:bg-[#F5F6F8] transition-colors"
                      >
                        <Pencil size={14} className="text-[#9699A6]" />
                      </button>
                      <button
                        onClick={() => setResponseToDelete({ id: r.id, title: r.title })}
                        className="p-1.5 rounded-md hover:bg-[#FFEEF0] transition-colors"
                      >
                        <Trash2 size={14} className="text-[#E44258]" />
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

      <ConfirmDialog
        open={!!responseToDelete}
        onConfirm={() => {
          if (responseToDelete) deleteMut.mutate(responseToDelete.id);
          setResponseToDelete(null);
        }}
        onCancel={() => setResponseToDelete(null)}
        title="מחיקת תגובה מוכנה"
        message={responseToDelete ? `האם אתה בטוח שברצונך למחוק את התגובה "${responseToDelete.title}"?` : ""}
        confirmText="מחק"
        cancelText="ביטול"
        variant="danger"
      />
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
          <label className="block text-sm font-medium text-[#323338] mb-1">
            כותרת *
          </label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            className="w-full px-3 py-2 border border-[#D0D4E4] rounded-[4px] text-sm focus:outline-none focus:ring-2 focus:ring-[#0073EA]/20 focus:border-[#0073EA]"
            required
            autoFocus
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[#323338] mb-1">
            קטגוריה
          </label>
          <input
            type="text"
            value={form.category}
            onChange={(e) =>
              setForm((f) => ({ ...f, category: e.target.value }))
            }
            className="w-full px-3 py-2 border border-[#D0D4E4] rounded-[4px] text-sm focus:outline-none focus:ring-2 focus:ring-[#0073EA]/20 focus:border-[#0073EA]"
            placeholder="כללי, סגירה, מעקב..."
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[#323338] mb-1">
            תוכן *
          </label>
          <textarea
            value={form.body}
            onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
            className="w-full px-3 py-2 border border-[#D0D4E4] rounded-[4px] text-sm focus:outline-none focus:ring-2 focus:ring-[#0073EA]/20 focus:border-[#0073EA] resize-none"
            rows={5}
            required
            placeholder={`שלום {{contact.firstName}},\n\nתוכן ההודעה...\n\nבברכה,\n{{agent.name}}`}
          />
          <p className="text-[10px] text-[#9699A6] mt-1">
            משתנים זמינים: {"{{contact.firstName}}"}, {"{{contact.lastName}}"},
            {"{{agent.name}}"}
          </p>
        </div>
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2 bg-[#F5F6F8] hover:bg-border text-[#676879] font-semibold rounded-[4px] transition-colors text-[13px]"
          >
            ביטול
          </button>
          <button
            type="submit"
            disabled={createMut.isPending || updateMut.isPending}
            className="flex-1 py-2 bg-[#0073EA] hover:bg-[#0060C2] text-white font-semibold rounded-[4px] transition-colors text-[13px] disabled:opacity-50"
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
  const [policyToDelete, setPolicyToDelete] = useState<{ id: string; name: string } | null>(null);

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
          <h2 className="text-base font-bold text-[#323338]">מדיניות SLA</h2>
          <p className="text-xs text-[#9699A6]">
            הגדרת זמני תגובה ופתרון לפניות
          </p>
        </div>
        <button
          onClick={() => {
            setEditing(null);
            setShowForm(true);
          }}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#0073EA] hover:bg-[#0060C2] text-white text-[13px] font-medium rounded-[4px] transition-all hover:shadow-md active:scale-[0.97]"
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
              className="bg-white rounded-xl shadow-[0_1px_6px_rgba(0,0,0,0.08)] h-20 animate-pulse"
            />
          ))}
        </div>
      ) : !policies || policies.length === 0 ? (
        <div className="bg-white rounded-xl shadow-[0_1px_6px_rgba(0,0,0,0.08)] text-center py-12">
          <Shield size={32} className="text-[#9699A6] mx-auto mb-2" />
          <p className="text-sm text-[#9699A6]">אין מדיניות SLA</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {policies.map((p) => (
            <div
              key={p.id}
              className="bg-white rounded-xl shadow-[0_1px_6px_rgba(0,0,0,0.08)] p-4 flex items-center gap-4 hover:shadow-md transition-all border-r-4"
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
                  <h3 className="text-sm font-bold text-[#323338]">
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
                  <div className="flex items-center gap-1.5 text-xs text-[#676879]">
                    <Clock size={12} className="text-[#0073EA]" />
                    <span>
                      תגובה ראשונה: {formatMinutes(p.firstResponseMinutes)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-[#676879]">
                    <Clock size={12} className="text-success" />
                    <span>פתרון: {formatMinutes(p.resolutionMinutes)}</span>
                  </div>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#F5F6F8] text-[#9699A6]">
                    {p.businessHoursOnly ? "שעות עבודה" : "24/7"}
                  </span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#F5F6F8] text-[#9699A6]">
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
                  className="p-1.5 rounded-md hover:bg-[#F5F6F8] transition-colors"
                >
                  <Pencil size={14} className="text-[#9699A6]" />
                </button>
                <button
                  onClick={() => setPolicyToDelete({ id: p.id, name: p.name })}
                  className="p-1.5 rounded-md hover:bg-[#FFEEF0] transition-colors"
                >
                  <Trash2 size={14} className="text-[#E44258]" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <SlaPolicyForm editing={editing} onClose={() => setShowForm(false)} />
      )}

      <ConfirmDialog
        open={!!policyToDelete}
        onConfirm={() => {
          if (policyToDelete) deleteMut.mutate(policyToDelete.id);
          setPolicyToDelete(null);
        }}
        onCancel={() => setPolicyToDelete(null)}
        title="מחיקת מדיניות SLA"
        message={policyToDelete ? `האם אתה בטוח שברצונך למחוק את המדיניות "${policyToDelete.name}"?` : ""}
        confirmText="מחק"
        cancelText="ביטול"
        variant="danger"
      />
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
          <label className="block text-sm font-medium text-[#323338] mb-1">
            שם מדיניות *
          </label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className="w-full px-3 py-2 border border-[#D0D4E4] rounded-[4px] text-sm focus:outline-none focus:ring-2 focus:ring-[#0073EA]/20 focus:border-[#0073EA]"
            required
            placeholder="סטנדרטי, פרימיום, VIP..."
            autoFocus
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-[#323338] mb-1">
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
              className="w-full px-3 py-2 border border-[#D0D4E4] rounded-[4px] text-sm focus:outline-none focus:ring-2 focus:ring-[#0073EA]/20 focus:border-[#0073EA]"
              min={1}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#323338] mb-1">
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
              className="w-full px-3 py-2 border border-[#D0D4E4] rounded-[4px] text-sm focus:outline-none focus:ring-2 focus:ring-[#0073EA]/20 focus:border-[#0073EA]"
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
              className="w-4 h-4 rounded border-[#E6E9EF] text-[#0073EA] focus:ring-[#0073EA]"
            />
            <span className="text-sm text-[#323338]">שעות עבודה בלבד</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.isDefault}
              onChange={(e) =>
                setForm((f) => ({ ...f, isDefault: e.target.checked }))
              }
              className="w-4 h-4 rounded border-[#E6E9EF] text-[#0073EA] focus:ring-[#0073EA]"
            />
            <span className="text-sm text-[#323338]">ברירת מחדל</span>
          </label>
        </div>
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2 bg-[#F5F6F8] hover:bg-border text-[#676879] font-semibold rounded-[4px] transition-colors text-[13px]"
          >
            ביטול
          </button>
          <button
            type="submit"
            disabled={createMut.isPending || updateMut.isPending}
            className="flex-1 py-2 bg-[#0073EA] hover:bg-[#0060C2] text-white font-semibold rounded-[4px] transition-colors text-[13px] disabled:opacity-50"
          >
            {editing ? "עדכן" : "צור מדיניות"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
