import { useState, useEffect } from "react";
import { avatarColor, handleMutationError } from "../../lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  LayoutDashboard,
  Users,
  Building2,
  Handshake,
  Inbox,
  CheckSquare,
  Ticket,
  BookOpen,
  FileText,
  Zap,
  Crown,
  Shield,
  Save,
  type LucideIcon,
} from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../../hooks/useAuth";
import { getWorkspaceMembers } from "../../api/auth";
import {
  getNavPermissions,
  updateNavPermissions,
  type NavPermissions,
} from "../../api/settings";
import { NAV_ITEMS } from "../../lib/constants";

const ICON_MAP: Record<string, LucideIcon> = {
  LayoutDashboard,
  Users,
  Building2,
  Handshake,
  Inbox,
  CheckSquare,
  Ticket,
  BookOpen,
  FileText,
  Zap,
};

const ALL_NAV_KEYS = NAV_ITEMS.map((item) => item.key);

const ROLE_COLORS: Record<string, { color: string; label: string }> = {
  OWNER: { color: "#FDAB3D", label: "בעלים" },
  ADMIN: { color: "#6161FF", label: "מנהל" },
  AGENT: { color: "#C4C4C4", label: "נציג" },
};

export default function NavPermissionsTab() {
  const { currentWorkspaceId } = useAuth();
  const queryClient = useQueryClient();
  const [permissions, setPermissions] = useState<NavPermissions>({});
  const [isDirty, setIsDirty] = useState(false);

  const { data: members, isLoading: membersLoading } = useQuery({
    queryKey: ["workspace-members", currentWorkspaceId],
    queryFn: () => getWorkspaceMembers(currentWorkspaceId!),
    enabled: !!currentWorkspaceId,
  });

  const { data: permData, isLoading: permLoading } = useQuery({
    queryKey: ["nav-permissions", currentWorkspaceId],
    queryFn: getNavPermissions,
    enabled: !!currentWorkspaceId,
  });

  // Initialize local state from fetched data
  useEffect(() => {
    if (permData) {
      setPermissions(permData.navPermissions || {});
      setIsDirty(false);
    }
  }, [permData]);

  const saveMut = useMutation({
    mutationFn: () => updateNavPermissions(permissions),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["nav-permissions"] });
      toast.success("הרשאות הניווט עודכנו בהצלחה");
      setIsDirty(false);
    },
    onError: (err: unknown) => handleMutationError(err, "שגיאה בשמירה"),
  });

  const isLoading = membersLoading || permLoading;

  function getMemberPermissions(memberId: string): string[] {
    return permissions[memberId] || [...ALL_NAV_KEYS];
  }

  function togglePermission(memberId: string, navKey: string) {
    const current = getMemberPermissions(memberId);
    const updated = current.includes(navKey)
      ? current.filter((k) => k !== navKey)
      : [...current, navKey];
    setPermissions((prev) => ({ ...prev, [memberId]: updated }));
    setIsDirty(true);
  }

  function toggleAll(memberId: string) {
    const current = getMemberPermissions(memberId);
    const allChecked = ALL_NAV_KEYS.every((k) => current.includes(k));
    const updated = allChecked ? [] : [...ALL_NAV_KEYS];
    setPermissions((prev) => ({ ...prev, [memberId]: updated }));
    setIsDirty(true);
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-white rounded-xl shadow-[0_1px_6px_rgba(0,0,0,0.08)] h-16 animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (!members || members.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-[0_1px_6px_rgba(0,0,0,0.08)] text-center py-12">
        <Users size={32} className="text-[#9699A6] mx-auto mb-2" />
        <p className="text-sm text-[#9699A6]">אין חברי צוות</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-[#323338]">
            הרשאות ניווט
          </h2>
          <p className="text-[12px] text-[#9699A6]">
            קבע אילו חלקים במערכת כל חבר צוות יכול לראות בתפריט הניווט
          </p>
        </div>
        <button
          onClick={() => saveMut.mutate()}
          disabled={!isDirty || saveMut.isPending}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#0073EA] hover:bg-[#0060C2] text-white text-[13px] font-semibold rounded-[4px] transition-all hover:shadow-md active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save size={16} />
          {saveMut.isPending ? "שומר..." : "שמור שינויים"}
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-[0_1px_6px_rgba(0,0,0,0.08)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm" dir="rtl">
            <thead>
              <tr className="border-b border-[#E6E9EF] bg-[#F7F7F9]">
                <th className="text-right px-4 py-3 text-[12px] font-bold text-[#9699A6] min-w-[200px]">
                  חבר צוות
                </th>
                <th className="px-2 py-3 text-center text-[12px] font-bold text-[#9699A6] w-14">
                  הכל
                </th>
                {NAV_ITEMS.map((item) => {
                  const Icon = ICON_MAP[item.icon] || LayoutDashboard;
                  return (
                    <th
                      key={item.key}
                      className="px-2 py-3 text-center min-w-[70px]"
                    >
                      <div className="flex flex-col items-center gap-1">
                        <div
                          className="w-7 h-7 rounded-[4px] flex items-center justify-center"
                          style={{ backgroundColor: `${item.dot}20` }}
                        >
                          <Icon size={14} style={{ color: item.dot }} />
                        </div>
                        <span className="text-[10px] font-semibold text-[#9699A6] leading-tight">
                          {item.label}
                        </span>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E6E9EF]">
              {members.map((member) => {
                const isOwner = member.role === "OWNER";
                const role = ROLE_COLORS[member.role] || ROLE_COLORS.AGENT;
                const memberPerms = getMemberPermissions(member.memberId);
                const allChecked = ALL_NAV_KEYS.every((k) =>
                  memberPerms.includes(k),
                );
                const memberAvatarColor = avatarColor(member.name || "");

                return (
                  <tr
                    key={member.memberId}
                    className="hover:bg-[#F5F6FF] transition-colors"
                  >
                    {/* Member info */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: memberAvatarColor }}
                        >
                          <span className="text-white text-[12px] font-bold">
                            {member.name?.charAt(0) || "?"}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-[13px] font-semibold text-[#323338] truncate">
                            {member.name}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span
                              className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full text-white flex items-center gap-0.5"
                              style={{ backgroundColor: role.color }}
                            >
                              {isOwner && <Crown size={8} />}
                              {role.label}
                            </span>
                            <span className="text-[10px] text-[#9699A6] truncate">
                              {member.email}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Toggle all */}
                    <td className="px-2 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={isOwner || allChecked}
                        disabled={isOwner}
                        onChange={() => toggleAll(member.memberId)}
                        className="w-4 h-4 rounded border-[#E6E9EF] text-[#0073EA] focus:ring-[#0073EA] cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
                      />
                    </td>

                    {/* Per-section checkboxes */}
                    {NAV_ITEMS.map((item) => (
                      <td key={item.key} className="px-2 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={
                            isOwner || memberPerms.includes(item.key)
                          }
                          disabled={isOwner}
                          onChange={() =>
                            togglePermission(member.memberId, item.key)
                          }
                          className="w-4 h-4 rounded border-[#E6E9EF] text-[#0073EA] focus:ring-[#0073EA] cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
                        />
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Info box */}
      <div className="flex items-start gap-2 bg-[#F5F6FF] rounded-[4px] p-3 border border-[#0073EA]/10">
        <Shield size={16} className="text-[#0073EA] flex-shrink-0 mt-0.5" />
        <div className="text-[12px] text-[#676879] space-y-1">
          <p>
            <strong>בעלים</strong> תמיד רואה את כל חלקי המערכת ולא ניתן להגביל
            אותו.
          </p>
          <p>
            חבר צוות ללא הגדרת הרשאות ספציפיות יראה את כל חלקי המערכת (ברירת
            מחדל = גישה מלאה).
          </p>
        </div>
      </div>
    </div>
  );
}
