import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Lock, Unlock, Shield, ShieldCheck, Eye, Pencil, X } from "lucide-react";
import Modal from "../shared/Modal";
import { useAuth } from "../../hooks/useAuth";
import { getWorkspaceMembers } from "../../api/auth";
import {
  getBoardAccess,
  setBoardAccess,
  removeBoardAccess,
  toggleBoardPrivacy,
  type BoardPermission,
} from "../../api/boards";

const PERMISSION_OPTIONS: { value: BoardPermission | "NONE"; label: string; icon: typeof Eye }[] = [
  { value: "VIEWER", label: "צפייה", icon: Eye },
  { value: "EDITOR", label: "עריכה", icon: Pencil },
  { value: "ADMIN", label: "מנהל", icon: ShieldCheck },
  { value: "NONE", label: "ללא גישה", icon: X },
];

const PERMISSION_LABELS: Record<string, string> = {
  VIEWER: "צפייה",
  EDITOR: "עריכה",
  ADMIN: "מנהל",
};

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

interface BoardPermissionsModalProps {
  open: boolean;
  onClose: () => void;
  boardId: string;
  boardName: string;
  isPrivate: boolean;
}

export default function BoardPermissionsModal({
  open,
  onClose,
  boardId,
  boardName,
  isPrivate,
}: BoardPermissionsModalProps) {
  const { currentWorkspaceId } = useAuth();
  const qc = useQueryClient();
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  // Fetch board access list
  const { data: accessList = [], isLoading: accessLoading } = useQuery({
    queryKey: ["board-access", boardId],
    queryFn: () => getBoardAccess(boardId),
    enabled: open && !!boardId,
  });

  // Fetch workspace members
  const { data: members = [] } = useQuery({
    queryKey: ["workspace-members", currentWorkspaceId],
    queryFn: () => getWorkspaceMembers(currentWorkspaceId!),
    enabled: open && !!currentWorkspaceId,
  });

  // Map of memberId -> permission for quick lookup
  const accessMap = new Map<string, BoardPermission>();
  for (const entry of accessList) {
    accessMap.set(entry.memberId, entry.permission);
  }

  // Members without access (for "add" section)
  const membersWithoutAccess = members.filter(
    (m) => !accessMap.has(m.memberId),
  );

  // Toggle privacy mutation
  const togglePrivacyMut = useMutation({
    mutationFn: (newPrivate: boolean) => toggleBoardPrivacy(boardId, newPrivate),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["board", boardId] });
      qc.invalidateQueries({ queryKey: ["boards"] });
      toast.success(isPrivate ? "הבורד הפך לציבורי" : "הבורד הפך לפרטי");
    },
    onError: () => toast.error("שגיאה בעדכון פרטיות"),
  });

  // Set access mutation
  const setAccessMut = useMutation({
    mutationFn: (p: { memberId: string; permission: BoardPermission }) =>
      setBoardAccess(boardId, p.memberId, p.permission),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["board-access", boardId] });
      toast.success("הרשאה עודכנה");
    },
    onError: () => toast.error("שגיאה בעדכון הרשאה"),
  });

  // Remove access mutation
  const removeAccessMut = useMutation({
    mutationFn: (memberId: string) => removeBoardAccess(boardId, memberId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["board-access", boardId] });
      toast.success("הגישה הוסרה");
    },
    onError: () => toast.error("שגיאה בהסרת גישה"),
  });

  const handlePermissionChange = (
    memberId: string,
    newPerm: BoardPermission | "NONE",
  ) => {
    setOpenDropdown(null);
    if (newPerm === "NONE") {
      removeAccessMut.mutate(memberId);
    } else {
      setAccessMut.mutate({ memberId, permission: newPerm });
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title=""
      maxWidth="max-w-md"
    >
      {/* Custom header with lock icon */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border-light">
        <div className="flex items-center gap-2.5">
          {isPrivate ? (
            <Lock size={18} className="text-[#6161FF]" />
          ) : (
            <Unlock size={18} className="text-text-tertiary" />
          )}
          <h2 className="text-lg font-bold text-text-primary">
            הרשאות — {boardName}
          </h2>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-surface-secondary transition-colors text-text-tertiary hover:text-text-primary"
          aria-label="סגור"
        >
          <X size={18} />
        </button>
      </div>

      <div className="px-6 py-4 space-y-5">
        {/* Privacy toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield size={16} className="text-text-tertiary" />
            <span className="text-sm font-medium text-text-primary">
              בורד פרטי
            </span>
          </div>
          <button
            onClick={() => togglePrivacyMut.mutate(!isPrivate)}
            disabled={togglePrivacyMut.isPending}
            className={`
              relative w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#6161FF]/30
              ${isPrivate ? "bg-[#6161FF]" : "bg-[#D0D4E4]"}
              ${togglePrivacyMut.isPending ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}
            `}
            role="switch"
            aria-checked={isPrivate}
            aria-label="בורד פרטי"
          >
            <span
              className={`
                absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200
                ${isPrivate ? "right-0.5" : "right-[22px]"}
              `}
            />
          </button>
        </div>

        <p className="text-xs text-text-tertiary -mt-2">
          {isPrivate
            ? "רק משתמשים עם הרשאה יכולים לראות את הבורד"
            : "כל חברי סביבת העבודה יכולים לראות את הבורד"}
        </p>

        {/* Divider */}
        <div className="border-t border-border-light" />

        {/* Current members with access */}
        <div>
          <h3 className="text-sm font-semibold text-text-primary mb-3">
            חברים עם גישה
          </h3>

          {accessLoading ? (
            <div className="flex items-center justify-center py-6">
              <div className="w-5 h-5 border-2 border-[#6161FF] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : accessList.length === 0 ? (
            <p className="text-sm text-text-tertiary py-3 text-center">
              {isPrivate ? "אין חברים עם גישה" : "הבורד פתוח לכולם"}
            </p>
          ) : (
            <div className="space-y-1 max-h-[240px] overflow-y-auto">
              {accessList.map((entry) => (
                <MemberRow
                  key={entry.memberId}
                  name={entry.member.user.name}
                  email={entry.member.user.email}
                  permission={entry.permission}
                  isOpen={openDropdown === entry.memberId}
                  onToggleDropdown={() =>
                    setOpenDropdown(
                      openDropdown === entry.memberId ? null : entry.memberId,
                    )
                  }
                  onChangePermission={(perm) =>
                    handlePermissionChange(entry.memberId, perm)
                  }
                  disabled={setAccessMut.isPending || removeAccessMut.isPending}
                />
              ))}
            </div>
          )}
        </div>

        {/* Add permissions section */}
        {membersWithoutAccess.length > 0 && isPrivate && (
          <>
            <div className="border-t border-border-light" />
            <div>
              <h3 className="text-sm font-semibold text-text-primary mb-3">
                הוסף הרשאה
              </h3>
              <div className="space-y-1 max-h-[160px] overflow-y-auto">
                {membersWithoutAccess.map((member) => (
                  <div
                    key={member.memberId}
                    className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-[#F5F6F8] transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#6161FF]/20 to-[#6161FF]/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-semibold text-[#6161FF]">
                          {getInitials(member.name)}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-text-primary truncate">
                          {member.name}
                        </p>
                        <p className="text-xs text-text-tertiary truncate">
                          {member.email}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() =>
                        setAccessMut.mutate({
                          memberId: member.memberId,
                          permission: "VIEWER",
                        })
                      }
                      disabled={setAccessMut.isPending}
                      className="px-3 py-1 text-xs font-medium text-[#6161FF] bg-[#6161FF]/10 rounded-md hover:bg-[#6161FF]/20 transition-colors disabled:opacity-50"
                    >
                      + הוסף
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

/* ── Member Row with permission dropdown ── */

function MemberRow({
  name,
  email,
  permission,
  isOpen,
  onToggleDropdown,
  onChangePermission,
  disabled,
}: {
  name: string;
  email: string;
  permission: BoardPermission;
  isOpen: boolean;
  onToggleDropdown: () => void;
  onChangePermission: (perm: BoardPermission | "NONE") => void;
  disabled: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-[#F5F6F8] transition-colors">
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#6161FF]/20 to-[#6161FF]/10 flex items-center justify-center flex-shrink-0">
          <span className="text-xs font-semibold text-[#6161FF]">
            {getInitials(name)}
          </span>
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-text-primary truncate">
            {name}
          </p>
          <p className="text-xs text-text-tertiary truncate">{email}</p>
        </div>
      </div>

      {/* Permission dropdown */}
      <div className="relative">
        <button
          onClick={onToggleDropdown}
          disabled={disabled}
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-text-secondary bg-white border border-[#D0D4E4] rounded-md hover:border-[#6161FF] hover:text-[#6161FF] transition-colors disabled:opacity-50"
        >
          {PERMISSION_LABELS[permission] || permission}
          <svg
            width="10"
            height="6"
            viewBox="0 0 10 6"
            className={`transition-transform ${isOpen ? "rotate-180" : ""}`}
          >
            <path
              d="M1 1L5 5L9 1"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </svg>
        </button>

        {isOpen && (
          <div className="absolute left-0 top-full mt-1 w-36 bg-white rounded-lg shadow-lg border border-[#E6E9EF] z-50 py-1 animate-in fade-in zoom-in-95 duration-150">
            {PERMISSION_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              const isActive = opt.value === permission;
              const isRemove = opt.value === "NONE";
              return (
                <button
                  key={opt.value}
                  onClick={() => onChangePermission(opt.value)}
                  className={`
                    w-full flex items-center gap-2 px-3 py-2 text-xs text-right transition-colors
                    ${isActive ? "bg-[#6161FF]/10 text-[#6161FF] font-medium" : ""}
                    ${isRemove ? "text-red-500 hover:bg-red-50" : "hover:bg-[#F5F6F8] text-text-secondary"}
                  `}
                >
                  <Icon size={14} />
                  {opt.label}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
