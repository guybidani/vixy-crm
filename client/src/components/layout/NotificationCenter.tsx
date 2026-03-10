import { useState, useRef, useEffect } from "react";
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  X,
  Zap,
  Users,
  Briefcase,
  ClipboardList,
  Headphones,
  TrendingUp,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  type Notification,
} from "../../api/notifications";
import { cn } from "../../lib/utils";

const TYPE_CONFIG: Record<
  string,
  { icon: typeof Bell; color: string; label: string }
> = {
  AUTOMATION: {
    icon: Zap,
    color: "text-purple-500 bg-purple-50",
    label: "אוטומציה",
  },
  DEAL_UPDATE: {
    icon: Briefcase,
    color: "text-blue-500 bg-blue-50",
    label: "עסקה",
  },
  TASK_ASSIGNED: {
    icon: ClipboardList,
    color: "text-orange-500 bg-orange-50",
    label: "משימה",
  },
  TASK_DUE: {
    icon: ClipboardList,
    color: "text-red-500 bg-red-50",
    label: "משימה",
  },
  TICKET_UPDATE: {
    icon: Headphones,
    color: "text-green-500 bg-green-50",
    label: "פנייה",
  },
  CONTACT_UPDATE: {
    icon: Users,
    color: "text-cyan-500 bg-cyan-50",
    label: "איש קשר",
  },
  SYSTEM: { icon: Bell, color: "text-gray-500 bg-gray-50", label: "מערכת" },
  MENTION: {
    icon: Bell,
    color: "text-yellow-500 bg-yellow-50",
    label: "אזכור",
  },
  LEAD_SCORE_CHANGED: {
    icon: TrendingUp,
    color: "text-emerald-500 bg-emerald-50",
    label: "ניקוד ליד",
  },
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "עכשיו";
  if (mins < 60) return `לפני ${mins} דק'`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `לפני ${hours} שע'`;
  const days = Math.floor(hours / 24);
  return `לפני ${days} ימים`;
}

export default function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const qc = useQueryClient();

  // Close on outside click
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

  const { data: countData } = useQuery({
    queryKey: ["notifications", "unread-count"],
    queryFn: getUnreadCount,
    refetchInterval: 15000,
  });

  const { data: notifData } = useQuery({
    queryKey: ["notifications", "list"],
    queryFn: () => listNotifications({ limit: 30 }),
    enabled: open,
    refetchInterval: open ? 10000 : false,
  });

  const markReadMut = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const markAllMut = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const deleteMut = useMutation({
    mutationFn: deleteNotification,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const unreadCount = countData?.count ?? 0;
  const notifications = notifData?.data ?? [];

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell button */}
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg hover:bg-surface-secondary transition-colors text-text-secondary"
        title="התראות"
        aria-label={
          unreadCount > 0 ? `התראות (${unreadCount} חדשות)` : "התראות"
        }
        aria-expanded={open}
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-danger rounded-full text-white text-[9px] font-bold flex items-center justify-center">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute left-0 top-full mt-2 w-96 bg-white rounded-xl shadow-xl border border-border-light z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border-light">
            <h3 className="font-bold text-text-primary text-sm">התראות</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={() => markAllMut.mutate()}
                  className="text-xs text-primary hover:text-primary-hover flex items-center gap-1"
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

          {/* Notifications list */}
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-12 text-center text-text-tertiary text-sm">
                <Bell size={32} className="mx-auto mb-2 opacity-30" />
                אין התראות חדשות
              </div>
            ) : (
              notifications.map((n: Notification) => {
                const cfg = TYPE_CONFIG[n.type] || TYPE_CONFIG.SYSTEM;
                const Icon = cfg.icon;
                return (
                  <div
                    key={n.id}
                    role="button"
                    tabIndex={0}
                    aria-label={`${n.title}${!n.isRead ? " - לא נקרא" : ""}`}
                    className={cn(
                      "flex gap-3 px-4 py-3 hover:bg-surface-secondary transition-colors cursor-pointer border-b border-border-light last:border-0",
                      !n.isRead && "bg-primary/[0.03]",
                    )}
                    onClick={() => {
                      if (!n.isRead) markReadMut.mutate(n.id);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        if (!n.isRead) markReadMut.mutate(n.id);
                      }
                    }}
                  >
                    {/* Icon */}
                    <div
                      className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5",
                        cfg.color,
                      )}
                    >
                      <Icon size={16} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p
                          className={cn(
                            "text-sm leading-snug",
                            !n.isRead
                              ? "text-text-primary font-medium"
                              : "text-text-secondary",
                          )}
                        >
                          {n.title}
                        </p>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {!n.isRead && (
                            <div className="w-2 h-2 rounded-full bg-primary" />
                          )}
                        </div>
                      </div>
                      {n.body && (
                        <p className="text-xs text-text-tertiary mt-0.5 line-clamp-2">
                          {n.body}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-text-tertiary">
                          {timeAgo(n.createdAt)}
                        </span>
                        <span
                          className={cn(
                            "text-[10px] px-1.5 py-0.5 rounded-full",
                            cfg.color,
                          )}
                        >
                          {cfg.label}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex-shrink-0 flex flex-col gap-1 opacity-0 group-hover:opacity-100">
                      {!n.isRead && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            markReadMut.mutate(n.id);
                          }}
                          className="p-1 rounded hover:bg-white text-text-tertiary"
                          title="סמן כנקרא"
                        >
                          <Check size={12} />
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteMut.mutate(n.id);
                        }}
                        className="p-1 rounded hover:bg-white text-text-tertiary hover:text-danger"
                        title="מחק"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
