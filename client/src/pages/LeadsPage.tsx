import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  X,
  Inbox,
  ArrowLeftCircle,
  Phone,
  Mail,
  Building2,
  Search,
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

// Score-based card top border color
function scoreColor(score: number) {
  if (score >= 70) return "#00CA72";
  if (score >= 40) return "#FDAB3D";
  return "#C4C4C4";
}

export default function LeadsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [qualifyingId, setQualifyingId] = useState<string | null>(null);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(
    null,
  );

  const { data, isLoading } = useQuery({
    queryKey: ["leads", { search }],
    queryFn: () =>
      listContacts({
        status: "LEAD",
        search: search || undefined,
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      queryClient.invalidateQueries({ queryKey: ["deals-pipeline"] });
      queryClient.invalidateQueries({ queryKey: ["deals"] });
      toast.success("ליד הוסמך ועסקה נוצרה בהצלחה!");
      setQualifyingId(null);
    },
    onError: (err: any) => {
      toast.error(err?.message || "שגיאה בהסמכת ליד");
      setQualifyingId(null);
    },
  });

  const leads = data?.data || [];

  return (
    <PageShell
      title="לידים"
      subtitle={`${data?.pagination.total || 0} לידים ממתינים`}
      actions={
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary-hover text-white text-sm font-semibold rounded-lg transition-all hover:shadow-md active:scale-[0.97]"
        >
          <Plus size={16} />
          ליד חדש
        </button>
      }
    >
      {/* Search */}
      <div className="relative max-w-sm">
        <Search
          size={16}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary"
        />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="חיפוש לידים..."
          className="w-full pr-9 pl-4 py-2 bg-white border border-border rounded-lg text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : leads.length === 0 ? (
        <EmptyState
          icon={<Inbox size={28} className="text-text-tertiary" />}
          title="אין לידים חדשים"
          description="לידים חדשים יופיעו כאן. הוסיפו ליד ידנית או חכו ללידים מ-Vixy."
          action={
            <button
              onClick={() => setShowCreate(true)}
              className="px-4 py-2 bg-primary hover:bg-primary-hover text-white text-sm font-semibold rounded-lg transition-colors"
            >
              הוסף ליד ראשון
            </button>
          }
        />
      ) : (
        <div className="grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
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

      {showCreate && <CreateLeadModal onClose={() => setShowCreate(false)} />}
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

  return (
    <div
      className="bg-white rounded-xl shadow-card border-t-4 hover:shadow-card-hover transition-all p-4"
      style={{ borderTopColor: sc }}
    >
      {/* Header: Name + Score ring */}
      <div className="flex items-start justify-between mb-3">
        <div className="cursor-pointer flex-1" onClick={onClick}>
          <h3 className="font-bold text-text-primary">{lead.fullName}</h3>
          {lead.position && (
            <p className="text-xs text-text-tertiary mt-0.5">{lead.position}</p>
          )}
        </div>
        {/* Circular score */}
        <div className="relative w-10 h-10 flex-shrink-0">
          <svg className="w-10 h-10 -rotate-90" viewBox="0 0 36 36">
            <path
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              stroke="#E8E8FF"
              strokeWidth="2.5"
            />
            <path
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              stroke={sc}
              strokeWidth="2.5"
              strokeDasharray={`${lead.leadScore}, 100`}
              strokeLinecap="round"
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-text-primary">
            {lead.leadScore}
          </span>
        </div>
      </div>

      {/* Contact info */}
      <div className="space-y-1.5 mb-3">
        {lead.email && (
          <div className="flex items-center gap-2 text-xs text-text-secondary">
            <Mail size={12} className="text-text-tertiary flex-shrink-0" />
            <span dir="ltr" className="truncate">
              {lead.email}
            </span>
          </div>
        )}
        {lead.phone && (
          <div className="flex items-center gap-2 text-xs text-text-secondary">
            <Phone size={12} className="text-text-tertiary flex-shrink-0" />
            <span dir="ltr">{lead.phone}</span>
          </div>
        )}
        {lead.company && (
          <div className="flex items-center gap-2 text-xs text-text-secondary">
            <Building2 size={12} className="text-text-tertiary flex-shrink-0" />
            <span>{lead.company.name}</span>
          </div>
        )}
      </div>

      {/* Tags */}
      {lead.tags.length > 0 && (
        <div className="flex gap-1 flex-wrap mb-3">
          {lead.tags.map((t) => (
            <span
              key={t.id}
              className="text-[10px] font-semibold px-2 py-0.5 rounded-full text-white"
              style={{ backgroundColor: t.color }}
            >
              {t.name}
            </span>
          ))}
        </div>
      )}

      {/* Source + Date */}
      <div className="flex items-center justify-between text-[10px] text-text-tertiary mb-3 pb-3 border-b border-border-light">
        {lead.source && <span>מקור: {lead.source}</span>}
        <span>{new Date(lead.createdAt).toLocaleDateString("he-IL")}</span>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={onClick}
          className="flex-1 py-2 text-xs font-medium text-text-secondary bg-surface-secondary hover:bg-surface-tertiary rounded-lg transition-colors"
        >
          פרטים
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onQualify();
          }}
          disabled={isQualifying}
          className="flex-1 py-2 text-xs font-semibold text-white bg-[#00CA72] hover:bg-[#00B865] rounded-lg transition-all flex items-center justify-center gap-1 disabled:opacity-50 hover:shadow-sm active:scale-[0.97]"
        >
          <ArrowLeftCircle size={12} />
          {isQualifying ? "מעביר..." : "הסמך"}
        </button>
      </div>
    </div>
  );
}

function CreateLeadModal({ onClose }: { onClose: () => void }) {
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      toast.success("ליד נוצר בהצלחה!");
      onClose();
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
            <label className="block text-sm font-medium text-text-primary mb-1">
              שם פרטי *
            </label>
            <input
              type="text"
              value={form.firstName}
              onChange={(e) => setField("firstName", e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              שם משפחה *
            </label>
            <input
              type="text"
              value={form.lastName}
              onChange={(e) => setField("lastName", e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              אימייל
            </label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setField("email", e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              dir="ltr"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              טלפון
            </label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setField("phone", e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              dir="ltr"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              חברה
            </label>
            <select
              value={form.companyId}
              onChange={(e) => setField("companyId", e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white"
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
            <label className="block text-sm font-medium text-text-primary mb-1">
              תפקיד
            </label>
            <input
              type="text"
              value={form.position}
              onChange={(e) => setField("position", e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">
            מקור
          </label>
          <select
            value={form.source}
            onChange={(e) => setField("source", e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white"
          >
            <option value="">בחרו מקור</option>
            <option value="אתר">אתר</option>
            <option value="טלפון">טלפון</option>
            <option value="הפניה">הפניה</option>
            <option value="פייסבוק">פייסבוק</option>
            <option value="vixy">Vixy</option>
            <option value="אחר">אחר</option>
          </select>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2 bg-surface-tertiary hover:bg-border text-text-secondary font-semibold rounded-lg transition-colors text-sm"
          >
            ביטול
          </button>
          <button
            type="submit"
            disabled={mutation.isPending}
            className="flex-1 py-2 bg-primary hover:bg-primary-hover text-white font-semibold rounded-lg transition-colors text-sm disabled:opacity-50"
          >
            {mutation.isPending ? "יוצר..." : "צור ליד"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
