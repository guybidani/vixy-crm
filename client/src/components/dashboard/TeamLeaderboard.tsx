import { useQuery } from "@tanstack/react-query";
import { Trophy, UserPlus } from "lucide-react";
import { getTeamPerformance, type TeamMemberPerformance } from "../../api/dashboard";

const RANK_BADGES = ["🥇", "🥈", "🥉"];

export default function TeamLeaderboard() {
  const { data: members, isLoading } = useQuery({
    queryKey: ["team-performance"],
    queryFn: getTeamPerformance,
    refetchInterval: 30000,
  });

  if (isLoading) {
    return (
      <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-card p-5 animate-pulse h-64" />
    );
  }

  if (!members || members.length === 0) return null;

  // If only 1 member, show invite message
  if (members.length === 1) {
    return (
      <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-card hover:shadow-glass transition-shadow duration-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-[#EDE1F5]">
            <Trophy size={18} className="text-[#A25DDC]" />
          </div>
          <h2 className="font-bold text-text-primary text-base">
            ביצועי צוות השבוע
          </h2>
        </div>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="w-12 h-12 rounded-full bg-surface-secondary flex items-center justify-center mb-3">
            <UserPlus size={22} className="text-text-tertiary" />
          </div>
          <p className="text-sm text-text-secondary font-medium">
            הזמן חברי צוות
          </p>
          <p className="text-xs text-text-tertiary mt-1">
            הוסף חברי צוות כדי לראות את טבלת הביצועים
          </p>
        </div>
      </div>
    );
  }

  // Calculate team average for progress bar
  const avgActivity =
    members.reduce((sum, m) => sum + m.activitiesCount, 0) / members.length;

  return (
    <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-card hover:shadow-glass transition-shadow duration-200 p-5">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-[#EDE1F5]">
            <Trophy size={18} className="text-[#A25DDC]" />
          </div>
          <h2 className="font-bold text-text-primary text-base">
            ביצועי צוות השבוע
          </h2>
        </div>
        <span className="text-xs font-semibold px-3 py-1 rounded-full bg-surface-secondary text-text-secondary">
          {members.length} חברי צוות
        </span>
      </div>

      <div className="space-y-3">
        {members.map((member, index) => (
          <MemberRow
            key={member.memberId}
            member={member}
            rank={index}
            maxActivity={avgActivity > 0 ? avgActivity : 1}
          />
        ))}
      </div>
    </div>
  );
}

function MemberRow({
  member,
  rank,
  maxActivity,
}: {
  member: TeamMemberPerformance;
  rank: number;
  maxActivity: number;
}) {
  const initial = member.name.charAt(0).toUpperCase();
  const badge = RANK_BADGES[rank];
  // Progress relative to team average (cap at 100% for the bar visual)
  const progressPct = Math.min(
    (member.activitiesCount / (maxActivity * 2)) * 100,
    100,
  );

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-surface-secondary/50 transition-colors">
      {/* Rank */}
      <span className="w-7 text-center text-base flex-shrink-0">
        {badge || <span className="text-xs text-text-tertiary font-bold">#{rank + 1}</span>}
      </span>

      {/* Avatar */}
      <div className="w-9 h-9 rounded-full bg-[#A25DDC] flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
        {initial}
      </div>

      {/* Name + progress */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-text-primary truncate">
          {member.name}
        </p>
        <div className="w-full bg-surface-secondary rounded-full h-1.5 mt-1.5">
          <div
            className="h-1.5 rounded-full transition-all duration-500"
            style={{
              width: `${progressPct}%`,
              backgroundColor:
                rank === 0
                  ? "#00CA72"
                  : rank === 1
                    ? "#579BFC"
                    : rank === 2
                      ? "#FDAB3D"
                      : "#C4C4C4",
            }}
          />
        </div>
      </div>

      {/* Stats pills */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {member.callsCount > 0 && (
          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-[#D6F5E8] text-[#00854A]">
            {member.callsCount} שיחות
          </span>
        )}
        {member.tasksCompleted > 0 && (
          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-[#EDE1F5] text-[#7B2CB5]">
            {member.tasksCompleted} משימות
          </span>
        )}
        {member.dealsWonValue > 0 && (
          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-[#E8E8FF] text-[#4A4AE8]">
            ₪{member.dealsWonValue.toLocaleString()} עסקאות
          </span>
        )}
      </div>
    </div>
  );
}
