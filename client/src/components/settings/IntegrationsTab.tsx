import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Calendar, ExternalLink, Unlink, CheckCircle2 } from "lucide-react";
import toast from "react-hot-toast";
import {
  getCalendarStatus,
  getCalendarAuthUrl,
  disconnectCalendar,
} from "../../api/calendar";

export default function IntegrationsTab() {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();

  // Handle OAuth callback: ?calendar=connected
  useEffect(() => {
    if (searchParams.get("calendar") === "connected") {
      toast.success("Google Calendar חובר בהצלחה!");
      queryClient.invalidateQueries({ queryKey: ["calendar-status"] });
      // Remove the query param without navigation
      const next = new URLSearchParams(searchParams);
      next.delete("calendar");
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams, queryClient]);

  return (
    <div className="space-y-4">
      {/* Page header */}
      <div className="bg-white rounded-xl shadow-card p-6">
        <h2 className="text-base font-bold text-text-primary mb-1">
          אינטגרציות
        </h2>
        <p className="text-sm text-text-secondary">
          חבר את ה-CRM לכלים שאתה כבר משתמש בהם
        </p>
      </div>

      {/* Google Calendar card */}
      <GoogleCalendarCard />
    </div>
  );
}

function GoogleCalendarCard() {
  const queryClient = useQueryClient();

  const { data: status, isLoading } = useQuery({
    queryKey: ["calendar-status"],
    queryFn: getCalendarStatus,
  });

  const connectMutation = useMutation({
    mutationFn: getCalendarAuthUrl,
    onSuccess: (data) => {
      window.location.href = data.url;
    },
    onError: () => {
      toast.error("שגיאה בהתחברות ל-Google Calendar");
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: disconnectCalendar,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar-status"] });
      toast.success("Google Calendar נותק בהצלחה");
    },
    onError: () => {
      toast.error("שגיאה בניתוק");
    },
  });

  const handleDisconnect = () => {
    if (window.confirm("לנתק את Google Calendar? הסנכרון ייעצר.")) {
      disconnectMutation.mutate();
    }
  };

  const connected = status?.connected ?? false;

  return (
    <div className="bg-white rounded-xl shadow-card p-6">
      {/* Card header */}
      <div className="flex items-center gap-3 mb-5">
        {/* Google Calendar icon colors */}
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{
            background:
              "linear-gradient(135deg, #4285F4 0%, #34A853 50%, #FBBC04 75%, #EA4335 100%)",
          }}
        >
          <Calendar size={20} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-bold text-text-primary">
              Google Calendar
            </h3>
            {!isLoading && (
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                  connected
                    ? "bg-success-light text-success"
                    : "bg-surface-tertiary text-text-secondary"
                }`}
              >
                {connected ? (
                  <>
                    <CheckCircle2 size={11} />
                    מחובר
                  </>
                ) : (
                  "לא מחובר"
                )}
              </span>
            )}
          </div>
          <p className="text-xs text-text-secondary mt-0.5">
            סנכרן משימות ואירועים עם Google Calendar שלך
          </p>
        </div>
      </div>

      {/* Loading skeleton */}
      {isLoading ? (
        <div className="flex items-center gap-2 py-2">
          <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-text-secondary">טוען...</span>
        </div>
      ) : connected ? (
        /* Connected state */
        <div className="space-y-4">
          <div className="bg-surface-secondary rounded-lg p-4 space-y-2.5">
            {status?.email && (
              <div className="flex items-center justify-between gap-4">
                <span className="text-xs text-text-secondary flex-shrink-0">
                  חשבון מחובר
                </span>
                <span
                  className="text-xs font-semibold text-text-primary truncate"
                  dir="ltr"
                >
                  {status.email}
                </span>
              </div>
            )}
            {status?.lastSyncAt && (
              <div className="flex items-center justify-between gap-4">
                <span className="text-xs text-text-secondary flex-shrink-0">
                  סנכרון אחרון
                </span>
                <span className="text-xs text-text-primary">
                  {new Date(status.lastSyncAt).toLocaleString("he-IL")}
                </span>
              </div>
            )}
          </div>

          <button
            onClick={handleDisconnect}
            disabled={disconnectMutation.isPending}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-danger/30 text-danger text-sm font-semibold rounded-lg hover:bg-danger/5 transition-all active:scale-[0.97] disabled:opacity-50"
          >
            <Unlink size={14} />
            {disconnectMutation.isPending ? "מנתק..." : "נתק"}
          </button>
        </div>
      ) : (
        /* Disconnected state */
        <div className="py-2">
          <button
            onClick={() => connectMutation.mutate()}
            disabled={connectMutation.isPending}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary-hover text-white text-sm font-semibold rounded-lg transition-all hover:shadow-md active:scale-[0.97] disabled:opacity-50"
          >
            <ExternalLink size={15} />
            {connectMutation.isPending ? "מתחבר..." : "חבר Google Calendar"}
          </button>
        </div>
      )}
    </div>
  );
}
