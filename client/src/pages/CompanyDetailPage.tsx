import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  Mail,
  Phone,
  Globe,
  Building2,
  Users,
  Handshake,
  Edit2,
  Trash2,
  X,
} from "lucide-react";
import Modal from "../components/shared/Modal";
import toast from "react-hot-toast";
import { PageCard } from "../components/layout/PageShell";
import StatusBadge from "../components/shared/StatusBadge";
import EntityDocumentsSection from "../components/shared/EntityDocumentsSection";
import { getCompany, updateCompany, deleteCompany } from "../api/companies";
import { CONTACT_STATUSES, DEAL_STAGES } from "../lib/constants";

export default function CompanyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);

  const { data: company, isLoading } = useQuery({
    queryKey: ["company", id],
    queryFn: () => getCompany(id!),
    enabled: !!id,
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteCompany(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      toast.success("חברה נמחקה");
      navigate("/companies");
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-text-secondary">טוען...</p>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-text-secondary">חברה לא נמצאה</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Breadcrumb */}
      <button
        onClick={() => navigate("/companies")}
        className="flex items-center gap-1 text-sm text-text-secondary hover:text-primary transition-colors"
      >
        <ArrowRight size={14} />
        חזרה לחברות
      </button>

      {/* Header Card */}
      <PageCard>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-primary-light rounded-xl flex items-center justify-center">
              <Building2 size={24} className="text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-text-primary">
                {company.name}
              </h1>
              <div className="flex items-center gap-4 mt-1 text-sm text-text-secondary">
                {company.industry && <span>{company.industry}</span>}
                {company.size && <span>{company.size} עובדים</span>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setEditing(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-text-secondary hover:text-primary hover:bg-primary-light rounded-lg transition-colors"
            >
              <Edit2 size={14} />
              עריכה
            </button>
            <button
              onClick={() => {
                if (confirm("האם למחוק את החברה?")) {
                  deleteMutation.mutate();
                }
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-text-secondary hover:text-danger hover:bg-red-50 rounded-lg transition-colors"
            >
              <Trash2 size={14} />
              מחיקה
            </button>
          </div>
        </div>
      </PageCard>

      <div className="grid grid-cols-3 gap-4">
        {/* Company Info Sidebar */}
        <div className="space-y-4">
          <PageCard>
            <h3 className="font-bold text-text-primary mb-3">פרטי חברה</h3>
            <div className="space-y-3">
              {company.email && (
                <InfoRow
                  icon={<Mail size={14} />}
                  label="אימייל"
                  value={company.email}
                  dir="ltr"
                />
              )}
              {company.phone && (
                <InfoRow
                  icon={<Phone size={14} />}
                  label="טלפון"
                  value={company.phone}
                  dir="ltr"
                />
              )}
              {company.website && (
                <InfoRow
                  icon={<Globe size={14} />}
                  label="אתר"
                  value={company.website}
                  dir="ltr"
                />
              )}
            </div>
          </PageCard>

          {/* Stats */}
          <PageCard>
            <h3 className="font-bold text-text-primary mb-3">סיכום</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center p-3 bg-surface-secondary rounded-lg">
                <Users size={18} className="mx-auto text-primary mb-1" />
                <p className="text-lg font-bold text-text-primary">
                  {company.contacts?.length || 0}
                </p>
                <p className="text-xs text-text-tertiary">אנשי קשר</p>
              </div>
              <div className="text-center p-3 bg-surface-secondary rounded-lg">
                <Handshake size={18} className="mx-auto text-success mb-1" />
                <p className="text-lg font-bold text-text-primary">
                  {company.deals?.length || 0}
                </p>
                <p className="text-xs text-text-tertiary">עסקאות</p>
              </div>
            </div>
          </PageCard>

          {/* Documents */}
          {id && (
            <PageCard>
              <EntityDocumentsSection entityType="company" entityId={id} />
            </PageCard>
          )}
        </div>

        {/* Main Content */}
        <div className="col-span-2 space-y-4">
          {/* Contacts */}
          <PageCard>
            <h3 className="font-bold text-text-primary mb-3 flex items-center gap-2">
              <Users size={16} className="text-primary" />
              אנשי קשר ({company.contacts?.length || 0})
            </h3>
            {company.contacts && company.contacts.length > 0 ? (
              <div className="space-y-2">
                {company.contacts.map((contact: any) => {
                  const status =
                    CONTACT_STATUSES[
                      contact.status as keyof typeof CONTACT_STATUSES
                    ];
                  return (
                    <div
                      key={contact.id}
                      className="flex items-center justify-between p-3 bg-surface-secondary rounded-lg hover:bg-surface-tertiary transition-colors cursor-pointer"
                      onClick={() => navigate(`/contacts/${contact.id}`)}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 bg-primary-light rounded-full flex items-center justify-center"
                          role="img"
                          aria-label={`${contact.firstName} ${contact.lastName}`}
                        >
                          <span className="text-primary text-xs font-bold">
                            {contact.firstName[0]}
                          </span>
                        </div>
                        <div>
                          <span className="font-medium text-sm text-text-primary">
                            {contact.firstName} {contact.lastName}
                          </span>
                          {contact.position && (
                            <span className="text-xs text-text-tertiary block">
                              {contact.position}
                            </span>
                          )}
                        </div>
                      </div>
                      {status && (
                        <StatusBadge
                          label={status.label}
                          color={status.color}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-text-tertiary text-center py-4">
                אין אנשי קשר
              </p>
            )}
          </PageCard>

          {/* Deals */}
          <PageCard>
            <h3 className="font-bold text-text-primary mb-3 flex items-center gap-2">
              <Handshake size={16} className="text-success" />
              עסקאות ({company.deals?.length || 0})
            </h3>
            {company.deals && company.deals.length > 0 ? (
              <div className="space-y-2">
                {company.deals.map((deal: any) => {
                  const stage =
                    DEAL_STAGES[deal.stage as keyof typeof DEAL_STAGES];
                  return (
                    <div
                      key={deal.id}
                      className="flex items-center justify-between p-3 bg-surface-secondary rounded-lg hover:bg-surface-tertiary transition-colors cursor-pointer"
                      onClick={() => navigate(`/deals/${deal.id}`)}
                    >
                      <div>
                        <span className="font-medium text-sm text-text-primary">
                          {deal.title}
                        </span>
                        {deal.contact && (
                          <span className="text-xs text-text-tertiary block">
                            {deal.contact.firstName} {deal.contact.lastName}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold text-text-primary">
                          ₪{deal.value?.toLocaleString() || 0}
                        </span>
                        {stage && (
                          <StatusBadge
                            label={stage.label}
                            color={stage.color}
                          />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-text-tertiary text-center py-4">
                אין עסקאות
              </p>
            )}
          </PageCard>
        </div>
      </div>

      {/* Edit Modal */}
      {editing && (
        <EditCompanyModal company={company} onClose={() => setEditing(false)} />
      )}
    </div>
  );
}

function InfoRow({
  icon,
  label,
  value,
  dir,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  dir?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-text-tertiary">{icon}</span>
      <span className="text-xs text-text-tertiary w-12">{label}</span>
      <span className="text-sm text-text-primary" dir={dir}>
        {value}
      </span>
    </div>
  );
}

function EditCompanyModal({
  company,
  onClose,
}: {
  company: any;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    name: company.name,
    email: company.email || "",
    phone: company.phone || "",
    website: company.website || "",
    industry: company.industry || "",
    size: company.size || "",
  });

  const mutation = useMutation({
    mutationFn: () =>
      updateCompany(company.id, {
        ...form,
        email: form.email || undefined,
        phone: form.phone || undefined,
        website: form.website || undefined,
        industry: form.industry || undefined,
        size: form.size || undefined,
      } as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company", company.id] });
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      toast.success("חברה עודכנה!");
      onClose();
    },
    onError: (err: any) => {
      toast.error(err?.message || "שגיאה בעדכון");
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    mutation.mutate();
  }

  const setField = (key: string, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  return (
    <Modal open={true} onClose={onClose} title="עריכת חברה">
      <form onSubmit={handleSubmit} className="space-y-4 p-6">
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">
            שם חברה *
          </label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setField("name", e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            required
          />
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

        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">
            אתר אינטרנט
          </label>
          <input
            type="url"
            value={form.website}
            onChange={(e) => setField("website", e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            dir="ltr"
            placeholder="https://"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              תעשייה
            </label>
            <select
              value={form.industry}
              onChange={(e) => setField("industry", e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white"
            >
              <option value="">בחרו תעשייה</option>
              <option value="טכנולוגיה">טכנולוגיה</option>
              <option value="שיווק">שיווק</option>
              <option value="מסחר">מסחר</option>
              <option value="שירותים">שירותים</option>
              <option value="נדל״ן">נדל״ן</option>
              <option value="חינוך">חינוך</option>
              <option value="בריאות">בריאות</option>
              <option value="אחר">אחר</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              גודל
            </label>
            <select
              value={form.size}
              onChange={(e) => setField("size", e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white"
            >
              <option value="">בחרו גודל</option>
              <option value="1-10">1-10 עובדים</option>
              <option value="11-50">11-50 עובדים</option>
              <option value="51-200">51-200 עובדים</option>
              <option value="201-500">201-500 עובדים</option>
              <option value="500+">500+ עובדים</option>
            </select>
          </div>
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
            {mutation.isPending ? "שומר..." : "שמור שינויים"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
