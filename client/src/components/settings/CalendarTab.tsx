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
      <div className="bg-white/70 backdrop-blur-sm rounded-xl shadow-card p-6">
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
            <h2 className="text-base font-bold text-text-primary">
              Google Calendar
            </h2>
            <div className="flex items-center gap-2 mt-0.5">
              <span
                className={`w-2 h-2 rounded-full ${
                  connected ? "bg-success" : "bg-text-tertiary"
                }`}
              />
              <span className="text-sm text-text-secondary">
                {connected ? "מחובר" : "לא מחובר"}
              </span>
            </div>
          </div>
        </div>

        {!connected ? (
          /* Disconnected state */
          <div className="text-center py-6">
            <div className="w-16 h-16 mx-auto mb-4 bg-surface-secondary rounded-2xl flex items-center justify-center">
              <Calendar size={28} className="text-text-tertiary" />
            </div>
            <p className="text-sm text-text-secondary mb-4">
              חבר את חשבון Google Calendar שלך כדי לסנכרן משימות ואירועים
            </p>
            <button
              onClick={() => connectMutation.mutate()}
              disabled={connectMutation.isPending}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary-hover text-white text-sm font-semibold rounded-lg transition-all hover:shadow-md active:scale-[0.97] disabled:opacity-50"
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
            <div className="bg-surface-secondary/50 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-text-secondary">
                  חשבון מחובר
                </span>
                <span className="text-sm font-semibold text-text-primary" dir="ltr">
                  {status?.email || "-"}
                </span>
              </div>
              {status?.calendarId && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-text-secondary">יומן</span>
                  <span
                    className="text-sm font-semibold text-text-primary"
                    dir="ltr"
                  >
                    {status.calendarId}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-sm text-text-secondary">
                  סנכרון אוטומטי
                </span>
                <span
                  className={`text-sm font-semibold ${
                    status?.syncEnabled ? "text-success" : "text-text-tertiary"
                  }`}
                >
                  {status?.syncEnabled ? "פעיל" : "כבוי"}
                </span>
              </div>
              {status?.lastSyncAt && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-text-secondary">
                    סנכרון אחרון
                  </span>
                  <span className="text-sm text-text-primary">
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
                className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover text-white text-sm font-semibold rounded-lg transition-all hover:shadow-md active:scale-[0.97] disabled:opacity-50"
              >
                <RefreshCw
                  size={14}
                  className={syncMutation.isPending ? "animate-spin" : ""}
                />
                {syncMutation.isPending ? "מסנכרן..." : "סנכרן עכשיו"}
              </button>

              <button
                onClick={() => setShowDisconnectConfirm(true)}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-danger/30 text-danger text-sm font-semibold rounded-lg hover:bg-danger/5 transition-all active:scale-[0.97]"
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
            <h3 className="text-base font-bold text-text-primary mb-2">
              נתק את Google Calendar?
            </h3>
            <p className="text-sm text-text-secondary mb-5">
              הסנכרון ייעצר ואירועים שסונכרנו יישארו ביומן.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDisconnectConfirm(false)}
                className="flex-1 py-2 bg-surface-tertiary hover:bg-border text-text-secondary font-semibold rounded-lg transition-colors text-sm"
              >
                ביטול
              </button>
              <button
                onClick={() => disconnectMutation.mutate()}
                disabled={disconnectMutation.isPending}
                className="flex-1 py-2 bg-danger hover:bg-danger/90 text-white font-semibold rounded-lg transition-colors text-sm disabled:opacity-50"
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
