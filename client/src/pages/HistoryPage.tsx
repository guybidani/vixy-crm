import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Clock, Phone, Mail, Video, MessageCircle, StickyNote, AlertCircle, RefreshCw } from "lucide-react";
import PageShell, { EmptyState } from "../components/layout/PageShell";
import { getRecentContacts, type RecentContact } from "../api/history";
import { avatarColor } from "../lib/utils";

const ACTIVITY_TYPE_CONFIG: Record<
  string,
  { label: string; color: string; icon: typeof Phone }
> = {
  NOTE: { label: "הערה", color: "#F7C948", icon: StickyNote },
  CALL: { label: "שיחה", color: "#00CA72", icon: Phone },
  EMAIL: { label: "אימייל", color: "#579BFC", icon: Mail },
  MEETING: { label: "פגישה", color: "#A25DDC", icon: Video },
  WHATSAPP: { label: "ווטסאפ", color: "#25D366", icon: MessageCircle },
};

function getRelativeTime(dateStr: string): string {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diffMs = now - date;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return "עכשיו";
  if (diffMin === 1) return "לפני דקה";
  if (diffMin < 60) return `לפני ${diffMin} דקות`;
  if (diffHours === 1) return "לפני שעה";
  if (diffHours < 24) return `לפני ${diffHours} שעות`;
  if (diffDays === 1) return "אתמול";
  if (diffDays < 7) return `לפני ${diffDays} ימים`;
  const weeks = Math.floor(diffDays / 7);
  if (diffDays < 30) return weeks === 1 ? "לפני שבוע" : `לפני ${weeks} שבועות`;
  const months = Math.floor(diffDays / 30);
  if (months === 1) return "לפני חודש";
  return `לפני ${months} חודשים`;
}

function getInitials(firstName: string | null | undefined, lastName: string | null | undefined): string {
  const f = firstName?.charAt(0) || "";
  const l = lastName?.charAt(0) || "";
  return (f + l || "?").toUpperCase();
}

function ContactCard({ item }: { item: RecentContact }) {
  const navigate = useNavigate();
  const { contact, lastActivity, activityCount } = item;
  const config = ACTIVITY_TYPE_CONFIG[lastActivity.type];
  const TypeIcon = config?.icon || Phone;
  const fullName = `${contact.firstName || ""} ${contact.lastName || ""}`.trim() || "ללא שם";

  return (
    <button
      type="button"
      onClick={() => navigate(`/contacts/${contact.id}`)}
      className="w-full bg-white rounded-xl shadow-[0_1px_6px_rgba(0,0,0,0.08)] hover:shadow-md transition-all duration-200 p-4 flex items-center gap-4 text-right group hover:translate-y-[-1px]"
    >
      {/* Avatar */}
      <div
        className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: avatarColor(contact.id) }}
      >
        <span className="text-white font-bold text-sm">
          {getInitials(contact.firstName, contact.lastName)}
        </span>
      </div>

      {/* Main info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-bold text-[#323338] truncate">
            {fullName}
          </span>
          {/* Activity type badge */}
          {config && (
            <span
              className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0"
              style={{
                backgroundColor: `${config.color}15`,
                color: config.color,
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: config.color }}
              />
              {config.label}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 text-[12px] text-[#676879]">
          <span className="flex items-center gap-1">
            <Clock size={12} className="text-[#9699A6]" />
            {getRelativeTime(lastActivity.createdAt)}
          </span>
          {contact.phone && (
            <a
              href={`tel:${contact.phone}`}
              onClick={(e) => e.stopPropagation()}
              className="hover:text-[#0073EA] transition-colors"
              dir="ltr"
            >
              {contact.phone}
            </a>
          )}
          {contact.email && (
            <a
              href={`mailto:${contact.email}`}
              onClick={(e) => e.stopPropagation()}
              className="truncate hidden sm:inline hover:text-[#0073EA] transition-colors"
              dir="ltr"
            >
              {contact.email}
            </a>
          )}
        </div>
      </div>

      {/* Right side: interaction count */}
      <div className="flex flex-col items-center gap-0.5 flex-shrink-0">
        <div className="w-8 h-8 rounded-lg bg-[#F5F6F8] flex items-center justify-center">
          <TypeIcon size={16} style={{ color: config?.color || "#6161FF" }} />
        </div>
        <span className="text-[10px] text-[#9699A6] font-medium">
          {activityCount} אינטראקציות
        </span>
      </div>
    </button>
  );
}

export default function HistoryPage() {
  const [typeFilter, setTypeFilter] = useState("");
  const { data: recentContacts = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["recent-contacts"],
    queryFn: getRecentContacts,
    refetchInterval: 30000, // Auto-refresh every 30 seconds
  });

  const filteredContacts = useMemo(() => {
    if (!typeFilter) return recentContacts;
    return recentContacts.filter((item) => item.lastActivity.type === typeFilter);
  }, [recentContacts, typeFilter]);

  return (
    <PageShell
      boardStyle
      emoji="📋"
      title="היסטוריה"
      subtitle={`${filteredContacts.length} אנשי קשר אחרונים`}
    >
      {/* Activity type filter */}
      {!isLoading && !isError && recentContacts.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap" role="radiogroup" aria-label="סינון לפי סוג פעילות">
          <button
            role="radio"
            aria-checked={typeFilter === ""}
            onClick={() => setTypeFilter("")}
            className={`px-3 py-1.5 text-[12px] font-medium rounded-full transition-colors ${
              typeFilter === ""
                ? "bg-[#0073EA] text-white"
                : "bg-white text-[#676879] border border-[#E6E9EF] hover:border-[#0073EA]/30"
            }`}
          >
            הכל
          </button>
          {Object.entries(ACTIVITY_TYPE_CONFIG).map(([key, { label, color, icon: Icon }]) => (
            <button
              key={key}
              role="radio"
              aria-checked={typeFilter === key}
              onClick={() => setTypeFilter(typeFilter === key ? "" : key)}
              className={`flex items-center gap-1 px-3 py-1.5 text-[12px] font-medium rounded-full transition-colors ${
                typeFilter === key
                  ? "text-white"
                  : "bg-white text-[#676879] border border-[#E6E9EF] hover:border-[#0073EA]/30"
              }`}
              style={typeFilter === key ? { backgroundColor: color } : undefined}
            >
              <Icon size={12} />
              {label}
            </button>
          ))}
        </div>
      )}

      {isError ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-14 h-14 rounded-2xl bg-[#FFF0F0] flex items-center justify-center mb-4">
            <AlertCircle size={28} className="text-[#E44258]" />
          </div>
          <h2 className="text-base font-bold text-[#323338] mb-1">שגיאה בטעינת היסטוריה</h2>
          <p className="text-[13px] text-[#676879] mb-4">לא הצלחנו לטעון את הנתונים. נסו שוב.</p>
          <button
            onClick={() => refetch()}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#0073EA] hover:bg-[#0060C2] text-white text-[13px] font-semibold rounded-[4px] transition-colors"
          >
            <RefreshCw size={14} />
            נסה שוב
          </button>
        </div>
      ) : isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-xl shadow-[0_1px_6px_rgba(0,0,0,0.08)] p-4 animate-pulse flex items-center gap-4"
            >
              <div className="w-11 h-11 rounded-full bg-[#F5F6F8]" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-[#F5F6F8] rounded w-1/3" />
                <div className="h-3 bg-[#F5F6F8] rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredContacts.length === 0 ? (
        <EmptyState
          icon={<Clock size={32} className="text-[#9699A6]" />}
          title={typeFilter ? "אין תוצאות לסינון זה" : "אין היסטוריה עדיין"}
          description={typeFilter ? "נסו לשנות את סוג הפעילות או להסיר את הסינון" : "התחל לתקשר עם לקוחות — שיחות, אימיילים, פגישות וווטסאפ יופיעו כאן"}
        />
      ) : (
        <div className="space-y-2">
          {filteredContacts.map((item) => (
            <ContactCard key={item.contact.id} item={item} />
          ))}
        </div>
      )}
    </PageShell>
  );
}
