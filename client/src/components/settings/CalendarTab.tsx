import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Calendar, RefreshCw, Unlink, ExternalLink } from "lucide-react";
import toast from "react-hot-toast";
import {
  getCalendarStatus,
  getCalendarAuthUrl,
  syncCalendar,
  disconnectCalendar,
} from "../../api/calendar";

export default function CalendarTab() {
  const queryClient = useQueryClient();
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);

  const { data: status, isLoading } = useQuery({
    queryKey: ["calendar-status"],
    queryFn: getCalendarStatus,
  });

  const connectMutation = useMutation({
    mutationFn: getCalendarAuthUrl,
    onSuccess: (data) => {
      window.open(data.url, "_blank");
    },
    onError: () => {
      toast.error("שגיאה בהתחברות ל-Google Calendar");
    },
  });

  const syncMutation = useMutation({
    mutationFn: syncCalendar,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["calendar-status"] });
      toast.success(`סונכרנו ${data.synced} אירועים`);
    },
    onError: () => {
      toast.error("שגיאה בסנכרון");
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: disconnectCalendar,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar-status"] });
      setShowDisconnectConfirm(false);
      toast.success("Google Calendar נותק בהצלחה");
    },
    onError: () => {
      toast.error("שגיאה בניתוק");
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const connected = status?.connected ?? false;

  return (
    <div className="space-y-4">
      {/* Connection status card */}
      <div className="bg-white/70 backdrop-blur-sm rounded-xl shadow-[0_1px_6px_rgba(0,0,0,0.08)] p-6">
        <div className="flex items-center gap-3 mb-5">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{
              backgroundColor: connected ? "#D6F5E8" : "#F0F0F0",
              color: connected ? "#00CA72" : "#676879",
            }}
          >
            <Calendar size={20} />
          </div>
          <div className="flex-1">
            <h2 className="text-base font-bold text-[#323338]">
              Google Calendar
            </h2>
            <div className="flex items-center gap-2 mt-0.5">
              <span
                className={`w-2 h-2 rounded-full ${
                  connected ? "bg-success" : "bg-text-tertiary"
                }`}
              />
              <span className="text-sm text-[#676879]">
                {connected ? "מחובר" : "לא מחובר"}
              </span>
            </div>
          </div>
        </div>

        {!connected ? (
          /* Disconnected state */
          <div className="text-center py-6">
            <div className="w-16 h-16 mx-auto mb-4 bg-[#F5F6F8] rounded-2xl flex items-center justify-center">
              <Calendar size={28} className="text-[#9699A6]" />
            </div>
            <p className="text-sm text-[#676879] mb-4">
              חבר את חשבון Google Calendar שלך כדי לסנכרן משימות ואירועים
            </p>
            <button
              onClick={() => connectMutation.mutate()}
              disabled={connectMutation.isPending}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0073EA] hover:bg-[#0060C2] text-white text-[13px] font-semibold rounded-[4px] transition-all hover:shadow-md active:scale-[0.97] disabled:opacity-50"
            >
              <ExternalLink size={16} />
              {connectMutation.isPending
                ? "מתחבר..."
                : "חבר את Google Calendar"}
            </button>
          </div>
        ) : (
          /* Connected state */
          <div className="space-y-4">
            {/* Account info */}
            <div className="bg-[#F5F6F8]/50 rounded-[4px] p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#676879]">
                  חשבון מחובר
                </span>
                <span className="text-[13px] font-semibold text-[#323338]" dir="ltr">
                  {status?.email || "-"}
                </span>
              </div>
              {status?.calendarId && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#676879]">יומן</span>
                  <span
                    className="text-[13px] font-semibold text-[#323338]"
                    dir="ltr"
                  >
                    {status.calendarId}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#676879]">
                  סנכרון אוטומטי
                </span>
                <span
                  className={`text-[13px] font-semibold ${
                    status?.syncEnabled ? "text-success" : "text-[#9699A6]"
                  }`}
                >
                  {status?.syncEnabled ? "פעיל" : "כבוי"}
                </span>
              </div>
              {status?.lastSyncAt && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#676879]">
                    סנכרון אחרון
                  </span>
                  <span className="text-sm text-[#323338]">
                    {new Date(status.lastSyncAt).toLocaleString("he-IL")}
                  </span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => syncMutation.mutate()}
                disabled={syncMutation.isPending}
                className="flex items-center gap-2 px-4 py-2 bg-[#0073EA] hover:bg-[#0060C2] text-white text-[13px] font-semibold rounded-[4px] transition-all hover:shadow-md active:scale-[0.97] disabled:opacity-50"
              >
                <RefreshCw
                  size={14}
                  className={syncMutation.isPending ? "animate-spin" : ""}
                />
                {syncMutation.isPending ? "מסנכרן..." : "סנכרן עכשיו"}
              </button>

              <button
                onClick={() => setShowDisconnectConfirm(true)}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-danger/30 text-[#E44258] text-[13px] font-semibold rounded-[4px] hover:bg-[#E44258]/5 transition-all active:scale-[0.97]"
              >
                <Unlink size={14} />
                נתק חיבור
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Disconnect confirmation */}
      {showDisconnectConfirm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full">
            <h3 className="text-base font-bold text-[#323338] mb-2">
              נתק את Google Calendar?
            </h3>
            <p className="text-sm text-[#676879] mb-5">
              הסנכרון ייעצר ואירועים שסונכרנו יישארו ביומן.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDisconnectConfirm(false)}
                className="flex-1 py-2 bg-[#F5F6F8] hover:bg-border text-[#676879] font-semibold rounded-[4px] transition-colors text-sm"
              >
                ביטול
              </button>
              <button
                onClick={() => disconnectMutation.mutate()}
                disabled={disconnectMutation.isPending}
                className="flex-1 py-2 bg-[#E44258] hover:bg-[#E44258]/90 text-white font-semibold rounded-[4px] transition-colors text-sm disabled:opacity-50"
              >
                {disconnectMutation.isPending ? "מנתק..." : "נתק"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
