import { useState, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Building2, Tag } from "lucide-react";
import LeadHeatBadge, { heatFromScore } from "../components/shared/LeadHeatBadge";
import { useDebounce } from "../hooks/useDebounce";
import toast from "react-hot-toast";
import PageShell from "../components/layout/PageShell";
import DataTable from "../components/shared/DataTable";
import Modal from "../components/shared/Modal";
import StatusDropdown from "../components/shared/StatusDropdown";
import SidePanel from "../components/shared/SidePanel";
import ContactDetailPanel from "../components/contacts/ContactDetailPanel";
import KanbanBoard, {
  type KanbanColumn as KanbanCol,
} from "../components/shared/KanbanBoard";
import ViewToggle from "../components/shared/ViewToggle";
import ExportButton from "../components/shared/ExportButton";
import BulkActionBar from "../components/shared/BulkActionBar";
import {
  listContacts,
  createContact,
  updateContact,
  getContactsBoard,
  bulkDeleteContacts,
  type Contact,
} from "../api/contacts";
import { listCompanies } from "../api/companies";
import { useWorkspaceOptions } from "../hooks/useWorkspaceOptions";
import { useInlineUpdate } from "../hooks/useInlineUpdate";
import MondayTextCell from "../components/shared/MondayTextCell";
import MondayPersonCell from "../components/shared/MondayPersonCell";

// Generate consistent avatar color from name
function avatarColor(name: string) {
  const colors = [
    "#6161FF",
    "#A25DDC",
    "#00CA72",
    "#579BFC",
    "#FDAB3D",
    "#FB275D",
    "#FF642E",
    "#66CCFF",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++)
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

export default function ContactsPage() {
  const { contactStatuses } = useWorkspaceOptions();
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<"kanban" | "table">("table");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [showCreate, setShowCreate] = useState(false);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(
    null,
  );
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const { data, isLoading } = useQuery({
    queryKey: [
      "contacts",
      { search: debouncedSearch, page, statusFilter, sortBy, sortDir },
    ],
    queryFn: () =>
      listContacts({
        search: debouncedSearch || undefined,
        page,
        status: statusFilter || undefined,
        sortBy,
        sortDir,
      }),
    enabled: viewMode === "table",
  });

  // Board data
  const { data: boardData, isLoading: boardLoading } = useQuery({
    queryKey: ["contacts-board"],
    queryFn: getContactsBoard,
    enabled: viewMode === "kanban",
  });

  // Inline editing
  const inlineUpdate = useInlineUpdate(updateContact, [["contacts"]]);

  const { data: companiesData } = useQuery({
    queryKey: ["companies", { limit: 200 }],
    queryFn: () => listCompanies({ limit: 200 }),
  });
  const companyOptions = (companiesData?.data || []).map((c) => ({
    id: c.id,
    name: c.name,
  }));

  useEffect(
    () => setSelectedIds(new Set()),
    [page, debouncedSearch, statusFilter],
  );

  const bulkDeleteMutation = useMutation({
    mutationFn: () => bulkDeleteContacts(Array.from(selectedIds)),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      toast.success(`${data.deleted} אנשי קשר נמחקו`);
      setSelectedIds(new Set());
    },
    onError: () => toast.error("שגיאה במחיקה"),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      updateContact(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      queryClient.invalidateQueries({ queryKey: ["contacts-board"] });
      toast.success("סטטוס עודכן");
    },
  });

  // Kanban columns
  const kanbanColumns: KanbanCol<Contact>[] = Object.entries(
    contactStatuses,
  ).map(([key, info]) => ({
    key,
    label: info.label,
    color: info.color,
    items: boardData?.statuses[key] || [],
  }));

  function handleKanbanDragEnd(
    itemId: string,
    _fromColumn: string,
    toColumn: string,
  ) {
    statusMutation.mutate({ id: itemId, status: toColumn });
    toast.success(`איש קשר הועבר ל${contactStatuses[toColumn]?.label}`);
  }

  const handleSort = useCallback(
    (key: string) => {
      if (sortBy === key) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      } else {
        setSortBy(key);
        setSortDir("asc");
      }
    },
    [sortBy],
  );

  const columns = [
    {
      key: "__select",
      label: "",
      width: "40px",
      render: (row: Contact) => (
        <input
          type="checkbox"
          checked={selectedIds.has(row.id)}
          onChange={() => {
            const next = new Set(selectedIds);
            if (next.has(row.id)) next.delete(row.id);
            else next.add(row.id);
            setSelectedIds(next);
          }}
          onClick={(e: React.MouseEvent) => e.stopPropagation()}
          className="w-[15px] h-[15px] rounded-[3px] border-[#C3C6D4] accent-[#0073EA]"
        />
      ),
    },
    {
      key: "fullName",
      label: "שם",
      sortable: true,
      render: (row: Contact) => (
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs font-bold"
            style={{ backgroundColor: avatarColor(row.fullName) }}
            role="img"
            aria-label={row.fullName}
          >
            {row.firstName?.[0] || "?"}
          </div>
          <div className="min-w-0 flex-1">
            <MondayTextCell
              value={row.fullName}
              onChange={(val) => {
                const parts = val.split(" ");
                inlineUpdate(row.id, {
                  firstName: parts[0] || "",
                  lastName: parts.slice(1).join(" ") || "",
                });
              }}
            />
            {row.position && (
              <span className="text-text-tertiary text-[11px] block truncate">
                {row.position}
              </span>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "email",
      label: "אימייל",
      render: (row: Contact) =>
        row.email ? (
          <MondayTextCell
            value={row.email}
            onChange={(val) => inlineUpdate(row.id, { email: val })}
            dir="ltr"
          />
        ) : (
          <MondayTextCell
            value=""
            onChange={(val) => inlineUpdate(row.id, { email: val })}
            dir="ltr"
            placeholder="+ הוסף אימייל"
          />
        ),
    },
    {
      key: "phone",
      label: "טלפון",
      render: (row: Contact) => (
        <MondayTextCell
          value={row.phone || ""}
          onChange={(val) => inlineUpdate(row.id, { phone: val })}
          dir="ltr"
          placeholder="הוסף טלפון"
        />
      ),
    },
    {
      key: "company",
      label: "חברה",
      render: (row: Contact) => (
        <MondayPersonCell
          value={row.company}
          options={companyOptions}
          onChange={(id) => inlineUpdate(row.id, { companyId: id })}
          placeholder="בחר חברה"
        />
      ),
    },
    {
      key: "status",
      label: "סטטוס",
      sortable: true,
      render: (row: Contact) => (
        <StatusDropdown
          value={row.status}
          options={contactStatuses}
          onChange={(status) => statusMutation.mutate({ id: row.id, status })}
        />
      ),
    },
    {
      key: "leadScore",
      label: "חום ליד",
      sortable: true,
      width: "150px",
      render: (row: Contact) => {
        const score = row.leadScore ?? 0;
        const heat = row.leadHeat || heatFromScore(score);
        return (
          <div className="flex items-center gap-2">
            <LeadHeatBadge heat={heat} size="sm" />
            <span className="text-xs text-text-tertiary">{score}</span>
          </div>
        );
      },
    },
    {
      key: "tags",
      label: "תגיות",
      render: (row: Contact) =>
        row.tags.length > 0 ? (
          <div className="flex gap-1 flex-wrap items-center">
            {row.tags.slice(0, 2).map((t) => (
              <span
                key={t.id}
                className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full text-white shadow-sm"
                style={{ backgroundColor: t.color }}
              >
                {t.name}
              </span>
            ))}
            {row.tags.length > 2 && (
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-surface-secondary text-text-tertiary">
                +{row.tags.length - 2}
              </span>
            )}
          </div>
        ) : (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setSelectedContactId(row.id);
            }}
            className="flex items-center gap-1 text-[11px] text-text-tertiary hover:text-primary px-2 py-1 rounded-md hover:bg-primary/5 border border-dashed border-transparent hover:border-primary/30 transition-all group"
          >
            <Tag size={11} className="opacity-50 group-hover:opacity-100" />
            <span>הוסף תגית</span>
          </button>
        ),
    },
  ];

  return (
    <PageShell
      title="אנשי קשר"
      subtitle={`${data?.pagination.total || 0} אנשי קשר`}
      actions={
        <div className="flex items-center gap-2">
          <ViewToggle viewMode={viewMode} onChange={setViewMode} />
          <ExportButton
            entity="contacts"
            filters={{ status: statusFilter, search: debouncedSearch }}
          />
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary-hover text-white text-sm font-semibold rounded-lg transition-all hover:shadow-md active:scale-[0.97]"
          >
            <Plus size={16} />
            איש קשר חדש
          </button>
        </div>
      }
    >
      {viewMode === "kanban" ? (
        <KanbanBoard<Contact>
          columns={kanbanColumns}
          renderCard={(contact, isDragging) => (
            <ContactCard contact={contact} isDragging={isDragging} />
          )}
          onDragEnd={handleKanbanDragEnd}
          onCardClick={(contact) => setSelectedContactId(contact.id)}
          loading={boardLoading}
          emptyText="אין אנשי קשר"
        />
      ) : (
        <>
          {/* Status filter chips */}
          <div className="flex gap-2 flex-wrap">
            <FilterChip
              label="הכל"
              active={!statusFilter}
              onClick={() => {
                setStatusFilter("");
                setPage(1);
              }}
            />
            {Object.entries(contactStatuses).map(([key, val]) => (
              <FilterChip
                key={key}
                label={val.label}
                color={val.color}
                active={statusFilter === key}
                onClick={() => {
                  setStatusFilter(key);
                  setPage(1);
                }}
              />
            ))}
          </div>

          <DataTable
            columns={columns}
            data={data?.data || []}
            loading={isLoading}
            search={search}
            onSearchChange={(s) => {
              setSearch(s);
              setPage(1);
            }}
            searchPlaceholder="חיפוש לפי שם, אימייל או טלפון..."
            pagination={data?.pagination}
            onPageChange={setPage}
            sortBy={sortBy}
            sortDir={sortDir}
            onSortChange={handleSort}
            onRowClick={(row) => setSelectedContactId(row.id)}
          />
        </>
      )}

      {/* Side Panel - Contact Detail */}
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
        <CreateContactModal onClose={() => setShowCreate(false)} />
      )}

      <BulkActionBar
        selectedCount={selectedIds.size}
        onClear={() => setSelectedIds(new Set())}
        onDelete={() => {
          if (window.confirm(`למחוק ${selectedIds.size} אנשי קשר?`)) {
            bulkDeleteMutation.mutate();
          }
        }}
        deleting={bulkDeleteMutation.isPending}
      />
    </PageShell>
  );
}

function ContactCard({
  contact,
  isDragging,
}: {
  contact: Contact;
  isDragging?: boolean;
}) {
  const score = contact.leadScore;
  const barColor =
    score >= 70 ? "#00CA72" : score >= 40 ? "#FDAB3D" : "#C4C4C4";

  return (
    <div
      className={`bg-white rounded-xl p-3.5 shadow-sm border-l-[3px] transition-all ${
        isDragging
          ? "shadow-lg opacity-90 border-l-primary"
          : "border-l-transparent hover:shadow-md hover:border-l-primary"
      }`}
    >
      {/* Avatar + Name */}
      <div className="flex items-center gap-2.5 mb-2">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs font-bold"
          style={{ backgroundColor: avatarColor(contact.fullName) }}
          role="img"
          aria-label={contact.fullName}
        >
          {contact.firstName?.[0] || "?"}
        </div>
        <div className="min-w-0 flex-1">
          <span className="font-semibold text-sm text-text-primary block truncate">
            {contact.fullName}
          </span>
          {contact.position && (
            <span className="text-text-tertiary text-[11px] block truncate">
              {contact.position}
            </span>
          )}
        </div>
      </div>

      {/* Company */}
      {contact.company && (
        <div className="flex items-center gap-1.5 mb-1">
          <Building2 size={11} className="text-text-tertiary" />
          <span className="text-xs text-text-secondary truncate">
            {contact.company.name}
          </span>
        </div>
      )}

      {/* Email */}
      {contact.email && (
        <p
          dir="ltr"
          className="text-xs text-text-tertiary truncate mb-1 text-right"
        >
          {contact.email}
        </p>
      )}

      {/* Bottom: Lead score + tags */}
      <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-border-light">
        {/* Lead score bar */}
        <div className="flex items-center gap-1.5 flex-1">
          <div className="flex-1 h-1.5 bg-surface-secondary rounded-full overflow-hidden max-w-[60px]">
            <div
              className="h-full rounded-full"
              style={{ width: `${score}%`, backgroundColor: barColor }}
            />
          </div>
          <span className="text-[10px] font-semibold text-text-tertiary">
            {score}
          </span>
        </div>

        {/* Tags */}
        {contact.tags.length > 0 && (
          <div className="flex gap-1">
            {contact.tags.slice(0, 2).map((t) => (
              <span
                key={t.id}
                className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full text-white"
                style={{ backgroundColor: t.color }}
              >
                {t.name}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function FilterChip({
  label,
  color,
  active,
  onClick,
}: {
  label: string;
  color?: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
        active
          ? "text-white shadow-sm"
          : "bg-white border border-border text-text-secondary hover:border-primary hover:text-primary"
      }`}
      style={active ? { backgroundColor: color || "#6161FF" } : undefined}
    >
      {label}
    </button>
  );
}

function CreateContactModal({ onClose }: { onClose: () => void }) {
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
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      toast.success("איש קשר נוצר בהצלחה!");
      onClose();
    },
    onError: (err: any) => {
      toast.error(err?.message || "שגיאה ביצירת איש קשר");
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    mutation.mutate();
  }

  const setField = (key: string, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  return (
    <Modal open={true} onClose={onClose} title="איש קשר חדש">
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
            {leadSources.map((src) => (
              <option key={src} value={src}>
                {src}
              </option>
            ))}
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
            {mutation.isPending ? "יוצר..." : "צור איש קשר"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
