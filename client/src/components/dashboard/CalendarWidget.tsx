import { useQuery } from "@tanstack/react-query";
import { Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getCalendarStatus, getUpcomingEvents } from "../../api/calendar";

const EVENT_COLORS = ["#6161FF", "#00CA72", "#FDAB3D", "#A25DDC", "#579BFC"];

export default function CalendarWidget() {
  const navigate = useNavigate();

  const { data: status } = useQuery({
    queryKey: ["calendar-status"],
    queryFn: getCalendarStatus,
  });

  const { data: eventsData, isLoading } = useQuery({
    queryKey: ["calendar-upcoming"],
    queryFn: getUpcomingEvents,
    enabled: status?.connected === true,
  });

  const connected = status?.connected ?? false;
  const events = eventsData?.events ?? [];

  return (
    <div className="bg-white rounded-xl shadow-[0_1px_6px_rgba(0,0,0,0.08)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.1)] transition-shadow duration-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-[#323338] text-[15px]">
          אירועים קרובים
        </h2>
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: "#E8E8FF", color: "#6161FF" }}
        >
          <Calendar size={16} />
        </div>
      </div>

      {!connected ? (
        <div className="text-center py-4">
          <p className="text-[13px] text-[#9699A6] mb-3">
            Google Calendar לא מחובר
          </p>
          <button
            onClick={() => navigate("/settings")}
            className="text-[12px] font-medium text-[#0073EA] hover:text-[#0060C2] transition-colors"
          >
            חבר את Google Calendar
          </button>
        </div>
      ) : isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-12 bg-[#F5F6F8] rounded-[4px] animate-pulse"
            />
          ))}
        </div>
      ) : events.length === 0 ? (
        <p className="text-[13px] text-[#9699A6] text-center py-4">
          אין אירועים קרובים
        </p>
      ) : (
        <div className="space-y-1">
          {events.slice(0, 5).map((event, idx) => {
            const color =
              event.color || EVENT_COLORS[idx % EVENT_COLORS.length];
            const startDate = new Date(event.startTime);
            return (
              <div
                key={event.id}
                className="flex items-center gap-3 py-2.5 px-2 -mx-2 rounded-[4px] hover:bg-[#F5F6F8] transition-colors"
              >
                <div
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: color }}
                />
                <div className="flex-1 min-w-0">
                  <span className="text-[13px] text-[#323338] block truncate">
                    {event.title}
                  </span>
                </div>
                <span className="text-[12px] text-[#9699A6] flex-shrink-0" dir="ltr">
                  {startDate.toLocaleDateString("he-IL", {
                    day: "numeric",
                    month: "short",
                  })}{" "}
                  {startDate.toLocaleTimeString("he-IL", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
