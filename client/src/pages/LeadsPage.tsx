import { useState } from "react";
import { useDebounce } from "../hooks/useDebounce";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Inbox,
  Phone,
  Mail,
  Building2,
  Search,
  TrendingUp,
  Sparkles,
  Clock,
} from "lucide-react";
import toast from "react-hot-toast";
import PageShell, { EmptyState } from "../components/layout/PageShell";
import Modal from "../components/shared/Modal";
import SidePanel from "../components/shared/SidePanel";
import ContactDetailPanel from "../components/contacts/ContactDetailPanel";
import {
  listContacts,
  createContact,
  updateContact,
  type Contact,
} from "../api/contacts";
import { createDeal } from "../api/deals";
import { listCompanies } from "../api/companies";
import { useWorkspaceOptions } from "../hooks/useWorkspaceOptions";

// Pipeline stages for board view — thresholds are the single source of truth
const PIPELINE_STAGES = [
  { key: "cold", label: "קר", color: "#C4C4C4", minScore: 0, maxScore: 29 },
  { key: "warm", label: "פושר", color: "#FDAB3D", minScore: 30, maxScore: 59 },
  { key: "hot", label: "חם", color: "#FF642E", minScore: 60, maxScore: 79 },
  { key: "ready", label: "מוכן להסמכה", color: "#00CA72", minScore: 80, maxScore: 100 },
];

// Score-based colors — aligned with pipeline stage thresholds
function scoreColor(score: number) {
  if (score >= 80) return "#00CA72";
  if (score >= 60) return "#FF642E";
  if (score >= 30) return "#FDAB3D";
  return "#C4C4C4";
}

function scoreLabel(score: number) {
  if (score >= 80) return "מוכן";
  if (score >= 60) return "חם";
  if (score >= 30) return "פושר";
  return "קר";
}

function scoreBgClass(score: number) {
  if (score >= 80) return "bg-green-50 text-green-700";
  if (score >= 60) return "bg-orange-50 text-orange-700";
  if (score >= 30) return "bg-amber-50 text-amber-700";
  return "bg-gray-50 text-gray-500";
}

export default function LeadsPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search);
  const [showCreate, setShowCreate] = useState(false);
  const [qualifyingId, setQualifyingId] = useState<string | null>(null);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(
    null,
  );
  const [viewMode, setViewMode] = useState<"cards" | "pipeline">("cards");

  const { data, isLoading } = useQuery({
    queryKey: ["leads", { search: debouncedSearch }],
    queryFn: () =>
      listContacts({
        status: "LEAD",
        search: debouncedSearch || undefined,
        limit: 100,
        sortBy: "leadScore",
        sortDir: "desc",
      }),
  });

  const qualifyMutation = useMutation({
    mutationFn: async (contact: Contact) => {
      await updateContact(contact.id, { status: "QUALIFIED" });
      const deal = await createDeal({
        title: `עסקה - ${contact.fullName}`,
        contactId: contact.id,
        stage: "QUALIFIED",
      });
      return deal;
    },
    onSuccess: (deal) => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      queryClient.invalidateQueries({ queryKey: ["deals-pipeline"] });
      queryClient.invalidateQueries({ queryKey: ["deals"] });
      toast.success("ליד הוסמך ועסקה נוצרה בהצלחה!");
      setQualifyingId(null);
      navigate(`/deals?open=${deal.id}`);
    },
    onError: (err: any) => {
      toast.error(err?.message || "שגיאה בהסמכת ליד");
      setQualifyingId(null);
    },
  });

  const leads = data?.data || [];

  // Group leads by score range for pipeline view
  const pipelineData = PIPELINE_STAGES.map((stage) => ({
    ...stage,
    leads: leads.filter(
      (l) => l.leadScore >= stage.minScore && l.leadScore <= stage.maxScore,
    ),
  }));

  return (
    <PageShell
      boardStyle
      emoji="🎯"
      title="לידים"
      subtitle={`${data?.pagination.total || 0} לידים ממתינים`}
      views={[
        { key: "cards", label: "כרטיסים" },
        { key: "pipeline", label: "משפך" },
      ]}
      activeView={viewMode}
      onViewChange={(key) => setViewMode(key as "cards" | "pipeline")}
      actions={
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-3 py-[6px] bg-[#0073EA] hover:bg-[#0060C2] text-white text-[13px] font-medium rounded-[4px] transition-colors"
          >
            <Plus size={15} strokeWidth={2.5} />
            ליד חדש
          </button>
        </div>
      }
    >
      {/* Search */}
      <div className="relative max-w-sm">
        <Search
          size={16}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9699A6]"
        />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="חיפוש לידים..."
          className="w-full pr-9 pl-4 py-2 bg-white border border-[#E6E9EF] rounded-[4px] text-[13px] text-[#323338] placeholder:text-[#9699A6] focus:outline-none focus:ring-2 focus:ring-[#0073EA]/20 focus:border-[#0073EA] transition-colors"
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-5 h-5 border-2 border-[#0073EA] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : leads.length === 0 ? (
        <EmptyState
          icon={
            <div className="w-16 h-16 rounded-2xl bg-[#0073EA]/10 flex items-center justify-center mb-2">
              <Inbox size={28} className="text-[#0073EA]" />
            </div>
          }
          title="אין לידים חדשים"
          description="לידים חדשים יופיעו כאן. הוסיפו ליד ידנית או חכו ללידים מ-Vixy."
          action={
            <button
              onClick={() => setShowCreate(true)}
              className="px-5 py-2.5 bg-[#0073EA] hover:bg-[#0060C2] text-white text-[13px] font-semibold rounded-[4px] transition-all hover:shadow-md active:scale-[0.97] flex items-center gap-2"
            >
              <Plus size={16} />
              הוסף ליד ראשון
            </button>
          }
        />
      ) : viewMode === "pipeline" ? (
        /* Pipeline / Funnel Board View */
        <div className="flex gap-4 overflow-x-auto pb-4">
          {pipelineData.map((stage) => (
            <div key={stage.key} className="flex-shrink-0 w-[280px]">
              {/* Column header */}
              <div className="flex items-center gap-2 mb-3 px-1">
                <div
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: stage.color }}
                />
                <span className="text-[13px] font-bold text-[#323338]">
                  {stage.label}
                </span>
                <span className="text-[12px] text-[#9699A6] bg-[#F5F6F8] rounded-full px-2 py-0.5">
                  {stage.leads.length}
                </span>
              </div>
              {/* Column body */}
              <div className="space-y-2.5 min-h-[200px] bg-[#F5F6F8]/40 rounded-xl p-2.5">
                {stage.leads.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-[#9699A6]">
                    <Inbox size={20} className="mb-1.5 opacity-40" />
                    <span className="text-xs">אין לידים</span>
                  </div>
                ) : (
                  stage.leads.map((lead) => (
                    <PipelineCard
                      key={lead.id}
                      lead={lead}
                      isQualifying={qualifyingId === lead.id}
                      onQualify={() => {
                        setQualifyingId(lead.id);
                        qualifyMutation.mutate(lead);
                      }}
                      onClick={() => setSelectedContactId(lead.id)}
                    />
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Cards Grid View */
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {leads.map((lead) => (
            <LeadCard
              key={lead.id}
              lead={lead}
              isQualifying={qualifyingId === lead.id}
              onQualify={() => {
                setQualifyingId(lead.id);
                qualifyMutation.mutate(lead);
              }}
              onClick={() => setSelectedContactId(lead.id)}
            />
          ))}
        </div>
      )}

      {/* Side Panel */}
      <SidePanel
        open={!!selectedContactId}
        onClose={() => setSelectedContactId(null)}
        width="lg"
      >
        {selectedContactId && (
          <ContactDetailPanel
            contactId={selectedContactId}
            onClose={() => setSelectedContactId(null)}
          />
        )}
      </SidePanel>

      {showCreate && (
        <CreateLeadModal
          onClose={() => setShowCreate(false)}
          onCreated={(id) => {
            setShowCreate(false);
            setSelectedContactId(id);
          }}
        />
      )}
    </PageShell>
  );
}

function LeadCard({
  lead,
  isQualifying,
  onQualify,
  onClick,
}: {
  lead: Contact;
  isQualifying: boolean;
  onQualify: () => void;
  onClick: () => void;
}) {
  const sc = scoreColor(lead.leadScore);
  const label = scoreLabel(lead.leadScore);
  const bgClass = scoreBgClass(lead.leadScore);

  return (
    <div
      className="group bg-white rounded-xl shadow-[0_1px_6px_rgba(0,0,0,0.08)] border border-transparent hover:shadow-[0_4px_16px_rgba(0,0,0,0.1)] hover:border-[#0073EA]/20 hover:-translate-y-0.5 transition-all duration-200 p-5 relative overflow-hidden"
    >
      {/* Score accent bar at top */}
      <div
        className="absolute top-0 left-0 right-0 h-1 transition-all duration-300 group-hover:h-1.5"
        style={{ backgroundColor: sc }}
      />

      {/* Header: Name + Score ring */}
      <div className="flex items-start justify-between mb-4 mt-1">
        <button
          className="cursor-pointer flex-1 min-w-0 text-right focus:outline-none"
          onClick={onClick}
        >
          <h3 className="font-bold text-[#323338] text-[15px] truncate group-hover:text-[#0073EA] transition-colors">
            {lead.fullName}
          </h3>
          {lead.position && (
            <p className="text-[12px] text-[#9699A6] mt-0.5 truncate">{lead.position}</p>
          )}
        </button>
        {/* Circular score with label */}
        <div className="flex flex-col items-center gap-1 flex-shrink-0 mr-3">
          <div className="relative w-11 h-11">
            <svg className="w-11 h-11 -rotate-90" viewBox="0 0 36 36">
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="#F0F0F5"
                strokeWidth="3"
              />
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke={sc}
                strokeWidth="3"
                strokeDasharray={`${lead.leadScore}, 100`}
                strokeLinecap="round"
                className="transition-all duration-500"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-[12px] font-bold text-[#323338]">
              {lead.leadScore}
            </span>
          </div>
          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${bgClass}`}>
            {label}
          </span>
        </div>
      </div>

      {/* Contact info */}
      <div className="space-y-2 mb-4">
        {lead.email && (
          <div className="flex items-center gap-2.5 text-[12px] text-[#676879]">
            <div className="w-6 h-6 rounded-md bg-blue-50 flex items-center justify-center flex-shrink-0">
              <Mail size={12} className="text-blue-500" />
            </div>
            <a
              href={`mailto:${lead.email}`}
              dir="ltr"
              className="truncate hover:text-[#0073EA] hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0073EA] rounded-sm"
              onClick={(e) => e.stopPropagation()}
            >
              {lead.email}
            </a>
          </div>
        )}
        {lead.phone && (
          <div className="flex items-center gap-2.5 text-[12px] text-[#676879]">
            <div className="w-6 h-6 rounded-md bg-green-50 flex items-center justify-center flex-shrink-0">
              <Phone size={12} className="text-green-500" />
            </div>
            <a
              href={`tel:${lead.phone}`}
              dir="ltr"
              className="hover:text-[#0073EA] hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0073EA] rounded-sm"
              onClick={(e) => e.stopPropagation()}
            >
              {lead.phone}
            </a>
          </div>
        )}
        {lead.company && (
          <div className="flex items-center gap-2.5 text-[12px] text-[#676879]">
            <div className="w-6 h-6 rounded-md bg-purple-50 flex items-center justify-center flex-shrink-0">
              <Building2 size={12} className="text-purple-500" />
            </div>
            <span className="truncate">{lead.company.name}</span>
          </div>
        )}
      </div>

      {/* Tags */}
      {lead.tags.length > 0 && (
        <div className="flex gap-1.5 flex-wrap mb-4">
          {lead.tags.map((t) => (
            <span
              key={t.id}
              className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full text-white shadow-sm"
              style={{ backgroundColor: t.color }}
            >
              {t.name}
            </span>
          ))}
        </div>
      )}

      {/* Source + Date */}
      <div className="flex items-center justify-between text-[10px] text-[#9699A6] mb-4 pb-3 border-b border-[#E6E9EF]">
        {lead.source ? (
          <span className="flex items-center gap-1">
            <TrendingUp size={10} />
            מקור: {lead.source}
          </span>
        ) : <span />}
        <span className="flex items-center gap-1">
          <Clock size={10} />
          {new Date(lead.createdAt).toLocaleDateString("he-IL")}
        </span>
      </div>

      {/* Actions */}
      <div className="flex gap-2.5">
        <button
          onClick={onClick}
          className="flex-1 py-2.5 text-[12px] font-semibold text-[#676879] bg-[#F5F6F8] hover:bg-surface-tertiary hover:text-[#323338] rounded-[4px] transition-all flex items-center justify-center gap-1.5 border border-transparent hover:border-[#E6E9EF]"
        >
          פרטים
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onQualify();
          }}
          disabled={isQualifying}
          className="flex-1 py-2.5 text-[12px] font-bold text-white bg-[#00CA72] hover:bg-[#00B865] rounded-[4px] transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 hover:shadow-md active:scale-[0.97]"
        >
          {isQualifying ? (
            <>
              <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
              מעביר...
            </>
          ) : (
            <>
              <Sparkles size={12} />
              הסמך
            </>
          )}
        </button>
      </div>
    </div>
  );
}

/* Compact card for pipeline/board view */
function PipelineCard({
  lead,
  isQualifying,
  onQualify,
  onClick,
}: {
  lead: Contact;
  isQualifying: boolean;
  onQualify: () => void;
  onClick: () => void;
}) {
  const sc = scoreColor(lead.leadScore);

  return (
    <div
      onClick={onClick}
      className="group bg-white rounded-[4px] p-3 shadow-sm border border-transparent hover:shadow-md hover:border-[#0073EA]/20 cursor-pointer transition-all duration-150"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="font-semibold text-[13px] text-[#323338] truncate group-hover:text-[#0073EA] transition-colors">
          {lead.fullName}
        </span>
        <span
          className="text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white flex-shrink-0 mr-2"
          style={{ backgroundColor: sc }}
        >
          {lead.leadScore}
        </span>
      </div>
      {lead.company && (
        <div className="flex items-center gap-1.5 mb-1.5">
          <Building2 size={10} className="text-[#9699A6]" />
          <span className="text-[11px] text-[#9699A6] truncate">
            {lead.company.name}
          </span>
        </div>
      )}
      {(lead.email || lead.phone) && (
        <p dir="ltr" className="text-[11px] text-[#9699A6] truncate text-right mb-2">
          {lead.email || lead.phone}
        </p>
      )}
      {/* Quick qualify button */}
      {lead.leadScore >= 60 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onQualify();
          }}
          disabled={isQualifying}
          className="w-full mt-1 py-1.5 text-[11px] font-semibold text-[#00CA72] bg-green-50 hover:bg-green-100 hover:text-[#00B865] rounded-md transition-all flex items-center justify-center gap-1 disabled:opacity-50"
        >
          <Sparkles size={10} />
          {isQualifying ? "מעביר..." : "הסמך"}
        </button>
      )}
    </div>
  );
}

function CreateLeadModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated?: (id: string) => void;
}) {
  const { leadSources } = useWorkspaceOptions();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    companyId: "",
    position: "",
    source: "",
  });

  const { data: companies } = useQuery({
    queryKey: ["companies", { limit: 100 }],
    queryFn: () => listCompanies({ limit: 100 }),
  });

  const mutation = useMutation({
    mutationFn: () =>
      createContact({
        ...form,
        companyId: form.companyId || undefined,
        email: form.email || undefined,
        status: "LEAD",
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      toast.success("ליד נוצר בהצלחה!");
      if (onCreated) {
        onCreated(data.id);
      } else {
        onClose();
      }
    },
    onError: (err: any) => {
      toast.error(err?.message || "שגיאה ביצירת ליד");
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    mutation.mutate();
  }

  const setField = (key: string, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  return (
    <Modal open={true} onClose={onClose} title="ליד חדש">
      <form onSubmit={handleSubmit} className="space-y-4 p-6">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[13px] font-medium text-[#323338] mb-1">
              שם פרטי *
            </label>
            <input
              type="text"
              value={form.firstName}
              onChange={(e) => setField("firstName", e.target.value)}
              className="w-full px-3 py-2 border border-[#E6E9EF] rounded-[4px] text-[13px] focus:outline-none focus:ring-2 focus:ring-[#0073EA]/30 focus:border-[#0073EA]"
              required
            />
          </div>
          <div>
            <label className="block text-[13px] font-medium text-[#323338] mb-1">
              שם משפחה *
            </label>
            <input
              type="text"
              value={form.lastName}
              onChange={(e) => setField("lastName", e.target.value)}
              className="w-full px-3 py-2 border border-[#E6E9EF] rounded-[4px] text-[13px] focus:outline-none focus:ring-2 focus:ring-[#0073EA]/30 focus:border-[#0073EA]"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[13px] font-medium text-[#323338] mb-1">
              אימייל
            </label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setField("email", e.target.value)}
              className="w-full px-3 py-2 border border-[#E6E9EF] rounded-[4px] text-[13px] focus:outline-none focus:ring-2 focus:ring-[#0073EA]/30 focus:border-[#0073EA]"
              dir="ltr"
            />
          </div>
          <div>
            <label className="block text-[13px] font-medium text-[#323338] mb-1">
              טלפון
            </label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setField("phone", e.target.value)}
              className="w-full px-3 py-2 border border-[#E6E9EF] rounded-[4px] text-[13px] focus:outline-none focus:ring-2 focus:ring-[#0073EA]/30 focus:border-[#0073EA]"
              dir="ltr"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[13px] font-medium text-[#323338] mb-1">
              חברה
            </label>
            <select
              value={form.companyId}
              onChange={(e) => setField("companyId", e.target.value)}
              className="w-full px-3 py-2 border border-[#E6E9EF] rounded-[4px] text-[13px] focus:outline-none focus:ring-2 focus:ring-[#0073EA]/30 focus:border-[#0073EA] bg-white"
            >
              <option value="">ללא חברה</option>
              {companies?.data.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[13px] font-medium text-[#323338] mb-1">
              תפקיד
            </label>
            <input
              type="text"
              value={form.position}
              onChange={(e) => setField("position", e.target.value)}
              className="w-full px-3 py-2 border border-[#E6E9EF] rounded-[4px] text-[13px] focus:outline-none focus:ring-2 focus:ring-[#0073EA]/30 focus:border-[#0073EA]"
            />
          </div>
        </div>

        <div>
          <label className="block text-[13px] font-medium text-[#323338] mb-1">
            מקור
          </label>
          <select
            value={form.source}
            onChange={(e) => setField("source", e.target.value)}
            className="w-full px-3 py-2 border border-[#E6E9EF] rounded-[4px] text-[13px] focus:outline-none focus:ring-2 focus:ring-[#0073EA]/30 focus:border-[#0073EA] bg-white"
          >
            <option value="">בחרו מקור</option>
            {leadSources.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2 bg-surface-tertiary hover:bg-border text-[#676879] font-semibold rounded-[4px] transition-colors text-[13px]"
          >
            ביטול
          </button>
          <button
            type="submit"
            disabled={mutation.isPending}
            className="flex-1 py-2 bg-[#0073EA] hover:bg-[#0060C2] text-white font-semibold rounded-[4px] transition-colors text-[13px] disabled:opacity-50"
          >
            {mutation.isPending ? "יוצר..." : "צור ליד"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
