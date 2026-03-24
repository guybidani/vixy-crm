import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  CheckCheck,
  X,
  Zap,
  Users,
  Briefcase,
  ClipboardList,
  Headphones,
  TrendingUp,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  listNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
  type Notification,
} from "../../api/notifications";
import { getSocket } from "../../lib/socket";
import { cn } from "../../lib/utils";

const TYPE_CONFIG: Record<
  string,
  { icon: typeof Bell; color: string; label: string; bgInitial: string }
> = {
  AUTOMATION: {
    icon: Zap,
    color: "text-purple-600",
    bgInitial: "bg-purple-100",
    label: "אוטומציה",
  },
  DEAL_UPDATE: {
    icon: Briefcase,
    color: "text-blue-600",
    bgInitial: "bg-blue-100",
    label: "עסקה",
  },
  TASK_ASSIGNED: {
    icon: ClipboardList,
    color: "text-orange-600",
    bgInitial: "bg-orange-100",
    label: "משימה",
  },
  TASK_DUE: {
    icon: ClipboardList,
    color: "text-red-600",
    bgInitial: "bg-red-100",
    label: "משימה",
  },
  TICKET_UPDATE: {
    icon: Headphones,
    color: "text-green-600",
    bgInitial: "bg-green-100",
    label: "פנייה",
  },
  CONTACT_UPDATE: {
    icon: Users,
    color: "text-cyan-600",
    bgInitial: "bg-cyan-100",
    label: "איש קשר",
  },
  SYSTEM: { icon: Bell, color: "text-gray-500", bgInitial: "bg-gray-100", label: "מערכת" },
  MENTION: { icon: Bell, color: "text-yellow-600", bgInitial: "bg-yellow-100", label: "אזכור" },
  LEAD_SCORE_CHANGED: {
    icon: TrendingUp,
    color: "text-emerald-600",
    bgInitial: "bg-emerald-100",
    label: "ניקוד ליד",
  },
};

/** Map notification entityType → navigation path */
function getEntityPath(n: Notification): string | null {
  if (!n.entityId) return null;
  switch (n.entityType) {
    case "DEAL":
      return `/deals`;
    case "CONTACT":
      return `/contacts/${n.entityId}`;
    case "TICKET":
      return `/tickets/${n.entityId}`;
    case "TASK":
      return `/tasks`;
    case "BOARD":
    case "BOARD_ITEM":
      // entityId could be boardId or itemId — use boardId from metadata if available
      const boardId = n.metadata?.boardId ?? n.entityId;
      return `/boards/${boardId}`;
    default:
      return null;
  }
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "עכשיו";
  if (mins < 60) return `לפני ${mins} דק'`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `לפני ${hours} שע'`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "אתמול";
  return `לפני ${days} ימים`;
}

/** Get initials from a name string (used for avatar) */
function initials(name?: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();
}

/** Deterministic hue from string for avatar bg */
function avatarHue(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  const hues = [220, 150, 270, 30, 190, 340, 90];
  return `hsl(${hues[Math.abs(hash) % hues.length]}, 65%, 55%)`;
}

interface NotificationItemProps {
  n: Notification;
  onRead: (id: string) => void;
  onNavigate: (path: string) => void;
}

function NotificationItem({ n, onRead, onNavigate }: NotificationItemProps) {
  const cfg = TYPE_CONFIG[n.type] ?? TYPE_CONFIG.SYSTEM;
  const Icon = cfg.icon;
  const path = getEntityPath(n);

  // Avatar: use metadata.senderName if present, otherwise type icon
  const senderName: string | null = n.metadata?.senderName ?? null;
  const showAvatar = !!senderName;

  function handleClick() {
    if (!n.isRead) onRead(n.id);
    if (path) onNavigate(path);
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`${n.title}${!n.isRead ? " - לא נקרא" : ""}`}
      className={cn(
        "group flex gap-3 px-4 py-3 hover:bg-[#F6F7FB] transition-colors cursor-pointer border-b border-border-light last:border-0",
        !n.isRead && "bg-[#EEF4FF]",
      )}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      {/* Avatar / icon */}
      <div className="flex-shrink-0 mt-0.5">
        {showAvatar ? (
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[11px] font-bold"
            style={{ background: avatarHue(senderName!) }}
            title={senderName!}
          >
            {initials(senderName)}
          </div>
        ) : (
          <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", cfg.bgInitial)}>
            <Icon size={16} className={cfg.color} />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            "text-sm leading-snug",
            !n.isRead ? "text-text-primary font-semibold" : "text-text-secondary font-normal",
          )}
        >
          {n.title}
        </p>
        {n.body && (
          <p className="text-xs text-text-tertiary mt-0.5 line-clamp-2">{n.body}</p>
        )}
        <span className="text-[10px] text-text-tertiary mt-1 block">{timeAgo(n.createdAt)}</span>
      </div>

      {/* Unread dot */}
      <div className="flex-shrink-0 flex items-start pt-1">
        {!n.isRead && (
          <span className="w-2 h-2 rounded-full bg-primary block" aria-label="לא נקרא" />
        )}
      </div>
    </div>
  );
}

export default function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const qc = useQueryClient();
  const navigate = useNavigate();

  // ─── Real-time: listen for new notifications via socket ───
  const handleNewNotification = useCallback(
    (data: { title: string; body?: string }) => {
      // Show toast
      toast(data.title ?? "התראה חדשה", {
        duration: 6000,
        icon: "🔔",
        style: {
          background: "#fff",
          color: "#333",
          fontWeight: "600",
          fontSize: "13px",
          borderRadius: "10px",
          padding: "10px 14px",
          direction: "rtl",
          border: "1px solid #e5e7eb",
          boxShadow: "0 4px 16px rgba(0,0,0,0.10)",
        },
      });
      // Refresh badge + list
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
    [qc],
  );

  useEffect(() => {
    const socket = getSocket();
    socket.on("notification", handleNewNotification);
    return () => {
      socket.off("notification", handleNewNotification);
    };
  }, [handleNewNotification]);

  // ─── Real-time: board:item:updated → refresh board query ───
  useEffect(() => {
    const socket = getSocket();

    function handleBoardItemUpdated(data: { boardId?: string }) {
      if (data?.boardId) {
        qc.invalidateQueries({ queryKey: ["board", data.boardId] });
      }
    }

    socket.on("board:item:updated", handleBoardItemUpdated);
    return () => {
      socket.off("board:item:updated", handleBoardItemUpdated);
    };
  }, [qc]);

  // ─── Close on outside click ───
  useEffect(() => {
    if (!open) return;
    function handle(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  // ─── Data fetching ───
  const { data: countData } = useQuery({
    queryKey: ["notifications", "unread-count"],
    queryFn: getUnreadCount,
    refetchInterval: 15000,
  });

  const { data: notifData } = useQuery({
    queryKey: ["notifications", "list"],
    queryFn: () => listNotifications({ limit: 20 }),
    enabled: open,
    refetchInterval: open ? 10000 : false,
  });

  const markReadMut = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const markAllMut = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const unreadCount = countData?.count ?? 0;
  const notifications: Notification[] = notifData?.data ?? [];

  // Group into "חדש" (unread) and "קודם" (read)
  const unread = notifications.filter((n) => !n.isRead);
  const read = notifications.filter((n) => n.isRead);

  function handleNavigate(path: string) {
    navigate(path);
    setOpen(false);
  }

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell button */}
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg hover:bg-surface-secondary transition-colors text-text-secondary"
        title="התראות"
        aria-label={unreadCount > 0 ? `התראות (${unreadCount} חדשות)` : "התראות"}
        aria-expanded={open}
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 bg-[#D83A52] text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none"
            aria-live="polite"
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          className="absolute left-0 top-full mt-2 w-96 bg-white rounded-xl shadow-2xl border border-border-light z-50 overflow-hidden"
          role="dialog"
          aria-label="פאנל התראות"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border-light bg-white sticky top-0 z-10">
            <h3 className="font-bold text-text-primary text-sm">
              התראות
              {unreadCount > 0 && (
                <span className="mr-1.5 text-[10px] font-bold bg-[#D83A52] text-white rounded-full px-1.5 py-0.5">
                  {unreadCount}
                </span>
              )}
            </h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={() => markAllMut.mutate()}
                  disabled={markAllMut.isPending}
                  className="text-xs text-primary hover:text-primary-hover flex items-center gap-1 disabled:opacity-50"
                  title="סמן הכל כנקרא"
                >
                  <CheckCheck size={14} />
                  סמן הכל כנקרא
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="p-1 rounded hover:bg-surface-secondary text-text-tertiary"
                aria-label="סגור התראות"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-[480px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-14 text-center text-text-tertiary text-sm">
                <Bell size={32} className="mx-auto mb-3 opacity-20" />
                <p>אין התראות</p>
              </div>
            ) : (
              <>
                {/* Unread group */}
                {unread.length > 0 && (
                  <div>
                    <div className="px-4 py-2 text-[11px] font-semibold text-text-tertiary uppercase tracking-wide bg-[#F6F7FB] border-b border-border-light">
                      חדש
                    </div>
                    {unread.map((n) => (
                      <NotificationItem
                        key={n.id}
                        n={n}
                        onRead={(id) => markReadMut.mutate(id)}
                        onNavigate={handleNavigate}
                      />
                    ))}
                  </div>
                )}

                {/* Read group */}
                {read.length > 0 && (
                  <div>
                    <div className="px-4 py-2 text-[11px] font-semibold text-text-tertiary uppercase tracking-wide bg-[#F6F7FB] border-b border-border-light">
                      קודם
                    </div>
                    {read.map((n) => (
                      <NotificationItem
                        key={n.id}
                        n={n}
                        onRead={(id) => markReadMut.mutate(id)}
                        onNavigate={handleNavigate}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-2.5 border-t border-border-light bg-white text-center">
              <button
                onClick={() => {
                  navigate("/settings?tab=notifications");
                  setOpen(false);
                }}
                className="text-xs text-primary hover:text-primary-hover font-medium"
              >
                ראה הכל
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
