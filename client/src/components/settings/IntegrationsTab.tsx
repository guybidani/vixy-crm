import { useEffect, useState } from "react";
import ConfirmDialog from "../shared/ConfirmDialog";
import { useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Calendar, ExternalLink, Unlink, CheckCircle2, Phone, Copy, Check, Zap } from "lucide-react";
import toast from "react-hot-toast";
import {
  getCalendarStatus,
  getCalendarAuthUrl,
  disconnectCalendar,
} from "../../api/calendar";
import { useAuth } from "../../hooks/useAuth";

export default function IntegrationsTab() {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();

  // Handle OAuth callback: ?calendar_connected=1 or ?calendar=connected
  useEffect(() => {
    const connected = searchParams.get("calendar_connected") === "1" || searchParams.get("calendar") === "connected";
    const calError = searchParams.get("calendar_error");
    if (connected) {
      toast.success("Google Calendar חובר בהצלחה! 📅");
      queryClient.invalidateQueries({ queryKey: ["calendar-status"] });
      const next = new URLSearchParams(searchParams);
      next.delete("calendar_connected");
      next.delete("calendar");
      setSearchParams(next, { replace: true });
    } else if (calError) {
      toast.error(`שגיאה בחיבור Google Calendar: ${calError}`);
      const next = new URLSearchParams(searchParams);
      next.delete("calendar_error");
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams, queryClient]);

  return (
    <div className="space-y-4">
      {/* Page header */}
      <div className="bg-white rounded-xl shadow-[0_1px_6px_rgba(0,0,0,0.08)] p-6">
        <h2 className="text-base font-bold text-[#323338] mb-1">
          אינטגרציות
        </h2>
        <p className="text-sm text-[#676879]">
          חבר את ה-CRM לכלים שאתה כבר משתמש בהם
        </p>
      </div>

      {/* Google Calendar card */}
      <GoogleCalendarCard />

      {/* Kolio card */}
      <KolioCard />

      {/* Future integrations placeholder */}
      <div className="bg-white rounded-xl shadow-[0_1px_6px_rgba(0,0,0,0.08)] p-6">
        <div className="flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: "#FFF3E0", color: "#FDAB3D" }}
          >
            <Zap size={20} />
          </div>
          <div>
            <h3 className="text-[13px] font-bold text-[#323338]">Zapier / Make / n8n</h3>
            <p className="text-[12px] text-[#676879] mt-0.5">בקרוב — חיבור לכלי אוטומציה חיצוניים</p>
          </div>
          <span className="mr-auto text-[10px] font-bold px-2 py-1 bg-[#F5F6F8] text-[#9699A6] rounded-full">
            בקרוב
          </span>
        </div>
      </div>
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded hover:bg-[#F5F6F8] transition-colors"
      title="העתק"
    >
      {copied ? <Check size={12} className="text-success" /> : <Copy size={12} className="text-[#9699A6]" />}
    </button>
  );
}

function KolioCard() {
  const { currentWorkspaceId } = useAuth();

  // In production the API is on a separate port; use the server origin
  const apiBase = import.meta.env.VITE_API_URL ?? `${window.location.protocol}//${window.location.hostname}:3001`;
  const webhookUrl = `${apiBase}/api/v1/kolio/webhook`;
  const wsId = currentWorkspaceId ?? "...";

  return (
    <div className="bg-white rounded-xl shadow-[0_1px_6px_rgba(0,0,0,0.08)] p-6">
      <div className="flex items-center gap-3 mb-5">
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: "#EDE1F5", color: "#A25DDC" }}
        >
          <Phone size={20} />
        </div>
        <div>
          <h3 className="text-[13px] font-bold text-[#323338]">Kolio – ניתוח שיחות מכירה</h3>
          <p className="text-[12px] text-[#676879] mt-0.5">
            שיחות שמנותחות ב-Kolio יתווספו אוטומטית כפעילויות ב-CRM
          </p>
        </div>
      </div>

      <div className="space-y-2.5 mb-4">
        <p className="text-[11px] font-bold uppercase tracking-wide text-[#9699A6] mb-1">
          פרטי חיבור ל-Kolio
        </p>
        {[
          { label: "Webhook URL", value: webhookUrl },
          { label: "Workspace ID", value: wsId },
        ].map(({ label, value }) => (
          <div key={label} className="flex items-center gap-3">
            <span className="text-[12px] text-[#676879] w-28 flex-shrink-0">{label}</span>
            <div className="flex-1 flex items-center gap-1 bg-[#F5F6F8] rounded-[4px] px-3 py-1.5 min-w-0">
              <code className="text-[12px] font-mono text-[#323338] truncate flex-1" dir="ltr">
                {value}
              </code>
              <CopyButton text={value} />
            </div>
          </div>
        ))}
      </div>

      <div className="p-3 bg-warning/5 border border-warning/20 rounded-[4px]">
        <p className="text-[12px] text-[#676879]">
          <span className="font-semibold text-warning">הגדרה נדרשת:</span>{" "}
          הוסף את{" "}
          <code className="font-mono bg-warning/10 px-1 rounded text-warning text-[11px]">KOLIO_WEBHOOK_SECRET</code>{" "}
          למשתני הסביבה של ה-CRM, ואת אותו ערך בהגדרות Kolio.
        </p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        {["סיכום השיחה", "ציון כולל ופירוט", "טיפים לאימון", "זיהוי לקוח אוטומטי"].map((item) => (
          <div key={item} className="flex items-center gap-1.5 text-[12px] text-[#676879]">
            <CheckCircle2 size={12} className="text-success flex-shrink-0" />
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}

function GoogleCalendarCard() {
  const queryClient = useQueryClient();
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);

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
    setShowDisconnectConfirm(true);
  };

  const connected = status?.connected ?? false;

  return (
    <div className="bg-white rounded-xl shadow-[0_1px_6px_rgba(0,0,0,0.08)] p-6">
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
            <h3 className="text-[13px] font-bold text-[#323338]">
              Google Calendar
            </h3>
            {!isLoading && (
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[12px] font-semibold ${
                  connected
                    ? "bg-success-light text-success"
                    : "bg-[#F5F6F8] text-[#676879]"
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
          <p className="text-[12px] text-[#676879] mt-0.5">
            סנכרן משימות ואירועים עם Google Calendar שלך
          </p>
        </div>
      </div>

      {/* Loading skeleton */}
      {isLoading ? (
        <div className="flex items-center gap-2 py-2">
          <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-[#676879]">טוען...</span>
        </div>
      ) : connected ? (
        /* Connected state */
        <div className="space-y-4">
          <div className="bg-[#F5F6F8] rounded-[4px] p-4 space-y-2.5">
            {status?.email && (
              <div className="flex items-center justify-between gap-4">
                <span className="text-[12px] text-[#676879] flex-shrink-0">
                  חשבון מחובר
                </span>
                <span
                  className="text-[12px] font-semibold text-[#323338] truncate"
                  dir="ltr"
                >
                  {status.email}
                </span>
              </div>
            )}
            {status?.lastSyncAt && (
              <div className="flex items-center justify-between gap-4">
                <span className="text-[12px] text-[#676879] flex-shrink-0">
                  סנכרון אחרון
                </span>
                <span className="text-[12px] text-[#323338]">
                  {new Date(status.lastSyncAt).toLocaleString("he-IL")}
                </span>
              </div>
            )}
          </div>

          <button
            onClick={handleDisconnect}
            disabled={disconnectMutation.isPending}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-danger/30 text-[#E44258] text-[13px] font-semibold rounded-[4px] hover:bg-[#E44258]/5 transition-all active:scale-[0.97] disabled:opacity-50"
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
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0073EA] hover:bg-[#0060C2] text-white text-[13px] font-semibold rounded-[4px] transition-all hover:shadow-md active:scale-[0.97] disabled:opacity-50"
          >
            <ExternalLink size={15} />
            {connectMutation.isPending ? "מתחבר..." : "חבר Google Calendar"}
          </button>
        </div>
      )}

      <ConfirmDialog
        open={showDisconnectConfirm}
        onConfirm={() => {
          setShowDisconnectConfirm(false);
          disconnectMutation.mutate();
        }}
        onCancel={() => setShowDisconnectConfirm(false)}
        title="ניתוק Google Calendar"
        message="לנתק את Google Calendar? הסנכרון ייעצר."
        confirmText="נתק"
        cancelText="ביטול"
        variant="warning"
      />
    </div>
  );
}
