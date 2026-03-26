import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { handleMutationError } from "../../lib/utils";
import {
  Play,
  Square,
  Mail,
  MessageCircle,
  Phone,
  Smartphone,
  Clock,
  CheckCircle2,
  XCircle,
  ChevronDown,
  Zap,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  getSequences,
  getContactExecutions,
  startExecution,
  stopExecution,
  type FollowUpExecution,
} from "../../api/followup";

const CHANNEL_INFO: Record<
  string,
  { icon: typeof Mail; color: string; label: string }
> = {
  EMAIL: { icon: Mail, color: "#579BFC", label: "אימייל" },
  WHATSAPP: { icon: MessageCircle, color: "#25D366", label: "WhatsApp" },
  SMS: { icon: Smartphone, color: "#FDAB3D", label: "SMS" },
  CALL_TASK: { icon: Phone, color: "#A25DDC", label: "שיחה" },
};

const STATUS_INFO: Record<
  string,
  { color: string; label: string; icon: typeof CheckCircle2 }
> = {
  ACTIVE: { color: "#00CA72", label: "פעיל", icon: Play },
  COMPLETED: { color: "#579BFC", label: "הושלם", icon: CheckCircle2 },
  CANCELLED: { color: "#C4C4C4", label: "בוטל", icon: XCircle },
  PAUSED: { color: "#FDAB3D", label: "מושהה", icon: Clock },
};

export default function FollowUpCard({ contactId }: { contactId: string }) {
  const queryClient = useQueryClient();
  const [showSequencePicker, setShowSequencePicker] = useState(false);

  const { data: executions } = useQuery({
    queryKey: ["follow-up-executions", contactId],
    queryFn: () => getContactExecutions(contactId),
  });

  const { data: sequences } = useQuery({
    queryKey: ["follow-up-sequences"],
    queryFn: getSequences,
    enabled: showSequencePicker,
  });

  const startMut = useMutation({
    mutationFn: (sequenceId: string) =>
      startExecution({ sequenceId, contactId }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["follow-up-executions", contactId],
      });
      toast.success("סדרת מעקב הופעלה!");
      setShowSequencePicker(false);
    },
    onError: handleMutationError,
  });

  const stopMut = useMutation({
    mutationFn: (id: string) => stopExecution(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["follow-up-executions", contactId],
      });
      toast.success("סדרת מעקב בוטלה");
    },
    onError: handleMutationError,
  });

  const activeExecution = executions?.find((e) => e.status === "ACTIVE");
  const pastExecutions = executions?.filter((e) => e.status !== "ACTIVE") || [];
  const activeSequences = sequences?.filter((s) => s.isActive) || [];

  return (
    <div className="bg-white rounded-xl shadow-[0_1px_6px_rgba(0,0,0,0.08)] p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-6 h-6 bg-[#FF642E] rounded-full flex items-center justify-center">
          <Zap size={12} className="text-white" />
        </div>
        <h3 className="font-bold text-[#323338]">מעקב אוטומטי</h3>
      </div>

      {activeExecution ? (
        <ActiveExecutionView
          execution={activeExecution}
          onStop={() => stopMut.mutate(activeExecution.id)}
          stopping={stopMut.isPending}
        />
      ) : (
        <div className="relative">
          <button
            onClick={() => setShowSequencePicker(!showSequencePicker)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-[#FF642E]/10 hover:bg-[#FF642E]/20 text-[#FF642E] rounded-[4px] transition-colors text-[13px] font-semibold"
          >
            <Play size={14} />
            הפעל סדרת מעקב
            <ChevronDown size={14} />
          </button>

          {showSequencePicker && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-[4px] shadow-lg border border-[#E6E9EF] z-10 max-h-48 overflow-y-auto">
              {activeSequences.length === 0 ? (
                <p className="text-xs text-[#9699A6] text-center py-4">
                  אין סדרות פעילות. צור סדרה בהגדרות &rarr; אוטומציה
                </p>
              ) : (
                activeSequences.map((seq) => (
                  <button
                    key={seq.id}
                    onClick={() => startMut.mutate(seq.id)}
                    disabled={startMut.isPending}
                    className="w-full text-right px-3 py-2.5 hover:bg-[#F5F6F8] transition-colors border-b border-[#E6E9EF] last:border-b-0"
                  >
                    <span className="text-sm font-semibold text-[#323338] block">
                      {seq.name}
                    </span>
                    <span className="text-[10px] text-[#9699A6]">
                      {seq.steps.length} שלבים
                      {seq.description ? ` · ${seq.description}` : ""}
                    </span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* Past executions */}
      {pastExecutions.length > 0 && (
        <div className="mt-3 pt-3 border-t border-[#E6E9EF]">
          <p className="text-[10px] font-semibold text-[#9699A6] mb-2">
            היסטוריה
          </p>
          <div className="space-y-1.5">
            {pastExecutions.slice(0, 3).map((exec) => {
              const statusInfo =
                STATUS_INFO[exec.status] || STATUS_INFO.COMPLETED;
              const StatusIcon = statusInfo.icon;
              return (
                <div key={exec.id} className="flex items-center gap-2 text-xs">
                  <StatusIcon size={12} style={{ color: statusInfo.color }} />
                  <span className="text-[#676879] flex-1 truncate">
                    {exec.sequence.name}
                  </span>
                  <span
                    className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full text-white"
                    style={{ backgroundColor: statusInfo.color }}
                  >
                    {statusInfo.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function ActiveExecutionView({
  execution,
  onStop,
  stopping,
}: {
  execution: FollowUpExecution;
  onStop: () => void;
  stopping: boolean;
}) {
  const totalSteps = execution.sequence.steps.length;
  const currentStep = execution.currentStep;
  const progress =
    totalSteps > 0 ? Math.round((currentStep / totalSteps) * 100) : 0;

  const nextStep = execution.sequence.steps.find(
    (s) => s.stepNumber === currentStep + 1,
  );
  const nextChannelInfo = nextStep ? CHANNEL_INFO[nextStep.channel] : null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-[#323338]">
          {execution.sequence.name}
        </span>
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full text-white bg-[#00CA72]">
          פעיל
        </span>
      </div>

      {/* Progress bar */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] text-[#9699A6]">
            שלב {currentStep}/{totalSteps}
          </span>
          <span className="text-[10px] text-[#9699A6]">{progress}%</span>
        </div>
        <div className="h-2 bg-[#F5F6F8] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#FF642E] rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Step indicators */}
      <div className="flex gap-1.5">
        {execution.sequence.steps.map((step) => {
          const ch = CHANNEL_INFO[step.channel];
          const Icon = ch?.icon || Mail;
          const isDone = step.stepNumber <= currentStep;
          const isCurrent = step.stepNumber === currentStep + 1;
          return (
            <div
              key={step.id}
              className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-[4px] text-[10px] font-semibold transition-all ${
                isDone
                  ? "bg-[#00CA72]/10 text-[#00CA72]"
                  : isCurrent
                    ? "bg-[#FF642E]/10 text-[#FF642E] ring-1 ring-[#FF642E]/30"
                    : "bg-[#F5F6F8] text-[#9699A6]"
              }`}
              title={`שלב ${step.stepNumber}: ${ch?.label || step.channel}`}
            >
              <Icon size={10} />
              {step.stepNumber}
            </div>
          );
        })}
      </div>

      {/* Next action */}
      {nextChannelInfo && execution.nextRunAt && (
        <div className="flex items-center gap-2 p-2 bg-[#FF642E]/5 rounded-[4px]">
          <Clock size={12} className="text-[#FF642E]" />
          <span className="text-[10px] text-[#676879]">
            פעולה הבאה:{" "}
            <span className="font-semibold">{nextChannelInfo.label}</span> ב-
            {new Date(execution.nextRunAt).toLocaleDateString("he-IL")}
          </span>
        </div>
      )}

      {/* Stop button */}
      <button
        onClick={onStop}
        disabled={stopping}
        className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-[12px] font-semibold text-[#E44258] bg-[#FFEEF0] hover:bg-red-100 rounded-[4px] transition-colors"
      >
        <Square size={12} />
        {stopping ? "מבטל..." : "עצור סדרה"}
      </button>
    </div>
  );
}
