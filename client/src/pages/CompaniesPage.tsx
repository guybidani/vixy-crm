import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Plus, Building2, Users, Handshake, AlertCircle, RefreshCw, Mail, Phone, Clock } from "lucide-react";
import { useDebounce } from "../hooks/useDebounce";
import toast from "react-hot-toast";
import PageShell from "../components/layout/PageShell";
import ConfirmDialog from "../components/shared/ConfirmDialog";
import Modal from "../components/shared/Modal";
import MondayTextCell from "../components/shared/MondayTextCell";
import MondayBoard, {
  MondayStatusCell,
  type MondayGroup,
  type MondayColumn,
} from "../components/shared/MondayBoard";
import { type ContextMenuItem } from "../components/shared/RowContextMenu";
import BulkActionBar from "../components/shared/BulkActionBar";
import KanbanBoard, {
  type KanbanColumn as KanbanCol,
} from "../components/shared/KanbanBoard";
import ExportButton from "../components/shared/ExportButton";
import {
  listCompanies,
  createCompany,
  updateCompany,
  deleteCompany,
  getCompaniesBoard,
  type Company,
} from "../api/companies";
import { useWorkspaceOptions } from "../hooks/useWorkspaceOptions";
import { useInlineUpdate } from "../hooks/useInlineUpdate";

const COMPANY_COLORS = [
  "#6161FF",
  "#A25DDC",
  "#00CA72",
  "#579BFC",
  "#FDAB3D",
  "#FB275D",
  "#FF642E",
  "#66CCFF",
];

function companyColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++)
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return COMPANY_COLORS[Math.abs(hash) % COMPANY_COLORS.length];
}

export default function CompaniesPage() {
  const { companyStatuses } = useWorkspaceOptions();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<"kanban" | "table">("table");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search);
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState<{ ids: string[]; message: string } | null>(null);

  // Reset selection on page/search change
  useEffect(() => setSelectedIds(new Set()), [page, debouncedSearch]);

  const inlineUpdate = useInlineUpdate(updateCompany, [
    ["companies"],
    ["companies-board"],
  ]);

  const { data, isLoading, isError: tableError, refetch: refetchTable } = useQuery({
    queryKey: ["companies", { search: debouncedSearch, page }],
    queryFn: () =>
      listCompanies({
        search: debouncedSearch || undefined,
        page,
      }),
    enabled: viewMode === "table",
  });

  // Board data
  const { data: boardData, isLoading: boardLoading, isError: boardError, refetch: refetchBoard } = useQuery({
    queryKey: ["companies-board"],
    queryFn: getCompaniesBoard,
    enabled: viewMode === "kanban",
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      updateCompany(id, { status: status as Company["status"] }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      queryClient.invalidateQueries({ queryKey: ["companies-board"] });
      toast.success("סטטוס עודכן");
    },
    onError: (err: any) => toast.error(err?.message || "שגיאה בעדכון"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(ids.map((id) => deleteCompany(id)));
      return { deleted: ids.length };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      queryClient.invalidateQueries({ queryKey: ["companies-board"] });
      toast.success(`${data.deleted} חברות נמחקו`);
      setSelectedIds(new Set());
    },
    onError: () => toast.error("שגיאה במחיקה"),
  });

  // Kanban columns
  const kanbanColumns: KanbanCol<Company>[] = Object.entries(
    companyStatuses,
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
  }

  // ── Monday Board columns ────────────────────
  const mondayColumns: MondayColumn<Company>[] = [
    {
      key: "name",
      label: "שם חברה",
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-white"
            style={{ backgroundColor: companyColor(row.name) }}
          >
            <Building2 size={14} />
          </div>
          <MondayTextCell
            value={row.name}
            onChange={(val) => inlineUpdate(row.id, { name: val })}
            placeholder="שם חברה"
          />
        </div>
      ),
    },
    {
      key: "status",
      label: "סטטוס",
      width: "150px",
      sortable: true,
      render: (row) => (
        <MondayStatusCell
          value={row.status}
          options={companyStatuses}
          onChange={(status) => {
            inlineUpdate(row.id, { status: status as Company["status"] });
            toast.success("סטטוס עודכן");
          }}
        />
      ),
    },
    {
      key: "industry",
      label: "תעשייה",
      sortable: true,
      render: (row) => (
        <MondayTextCell
          value={row.industry || ""}
          onChange={(val) => inlineUpdate(row.id, { industry: val })}
          placeholder="תעשייה"
        />
      ),
    },
    {
      key: "email",
      label: "אימייל",
      width: "180px",
      render: (row) => (
        <MondayTextCell
          value={row.email || ""}
          onChange={(val) => inlineUpdate(row.id, { email: val })}
          placeholder="אימייל"
          dir="ltr"
        />
      ),
    },
    {
      key: "phone",
      label: "טלפון",
      width: "140px",
      render: (row) => (
        <MondayTextCell
          value={row.phone || ""}
          onChange={(val) => inlineUpdate(row.id, { phone: val })}
          placeholder="טלפון"
          dir="ltr"
        />
      ),
    },
    {
      key: "contactCount",
      label: "אנשי קשר",
      width: "100px",
      sortable: true,
      summary: "sum",
      render: (row) => (
        <div className="flex items-center gap-1.5">
          <Users size={14} className="text-[#6161FF]" />
          <span className="font-semibold text-[13px] text-[#323338]">
            {row.contactCount}
          </span>
        </div>
      ),
    },
    {
      key: "dealCount",
      label: "עסקאות",
      width: "100px",
      sortable: true,
      summary: "sum",
      render: (row) => (
        <div className="flex items-center gap-1.5">
          <Handshake size={14} className="text-[#00CA72]" />
          <span className="font-semibold text-[13px] text-[#323338]">
            {row.dealCount}
          </span>
        </div>
      ),
    },
  ];

  // Monday groups — single group with all companies
  const mondayGroups: MondayGroup<Company>[] = [
    {
      key: "all",
      label: "כל החברות",
      color: "#579BFC",
      items: data?.data || [],
    },
  ];

  return (
    <PageShell
      boardStyle
      emoji="🏢"
      title="חברות"
      subtitle={`${viewMode === "kanban" ? (boardData?.totals?.reduce((s, t) => s + t.count, 0) ?? 0) : (data?.pagination.total || 0)} חברות`}
      views={[
        { key: "table", label: "טבלה" },
        { key: "kanban", label: "לוח" },
      ]}
      activeView={viewMode}
      onViewChange={(key) => setViewMode(key as "kanban" | "table")}
      actions={
        <div className="flex items-center gap-2">
          <ExportButton
            entity="companies"
            filters={{ search: debouncedSearch }}
          />
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-3 py-[6px] bg-[#0073EA] hover:bg-[#0060C2] text-white text-[13px] font-medium rounded-[4px] transition-colors"
          >
            <Plus size={15} strokeWidth={2.5} />
            חברה חדשה
          </button>
        </div>
      }
    >
      {viewMode === "kanban" ? (
        boardError ? (
          <CompaniesErrorState onRetry={() => refetchBoard()} />
        ) : (
          <KanbanBoard<Company>
            columns={kanbanColumns}
            renderCard={(company, isDragging) => (
              <CompanyCard company={company} isDragging={isDragging} />
            )}
            onDragEnd={handleKanbanDragEnd}
            onCardClick={(company) => navigate(`/companies/${company.id}`)}
            loading={boardLoading}
            emptyText="אין חברות"
          />
        )
      ) : tableError ? (
        <CompaniesErrorState onRetry={() => refetchTable()} />
      ) : (
        <MondayBoard<Company>
          groups={mondayGroups}
          columns={mondayColumns}
          onRowClick={(row) => navigate(`/companies/${row.id}`)}
          onNewItem={() => setShowCreate(true)}
          newItemLabel="חברה חדשה"
          search={search}
          onSearchChange={(s) => {
            setSearch(s);
            setPage(1);
          }}
          searchPlaceholder="חיפוש לפי שם, אימייל או טלפון..."
          loading={isLoading}
          pagination={data?.pagination}
          onPageChange={setPage}
          statusKey="status"
          statusOptions={companyStatuses}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          groupByColumns={[
            { key: "status", label: "סטטוס" },
            { key: "industry", label: "תעשייה" },
          ]}
          contextMenuItems={(row: Company) => {
            const items: ContextMenuItem[] = [
              {
                label: "פתח חברה",
                icon: <Clock size={14} />,
                onClick: () => navigate(`/companies/${row.id}`),
              },
              { label: "", onClick: () => {}, divider: true },
              {
                label: "מחק",
                onClick: () => setConfirmDelete({ ids: [row.id], message: "האם אתה בטוח שברצונך למחוק חברה זו?" }),
                danger: true,
              },
            ];
            return items;
          }}
        />
      )}

      <BulkActionBar
        selectedCount={selectedIds.size}
        onClear={() => setSelectedIds(new Set())}
        onDelete={() => setConfirmDelete({ ids: Array.from(selectedIds), message: `האם אתה בטוח שברצונך למחוק ${selectedIds.size} חברות?` })}
        deleting={deleteMutation.isPending}
      />

      <ConfirmDialog
        open={!!confirmDelete}
        onConfirm={() => {
          if (confirmDelete) deleteMutation.mutate(confirmDelete.ids);
          setConfirmDelete(null);
        }}
        onCancel={() => setConfirmDelete(null)}
        title="מחיקת חברות"
        message={confirmDelete?.message ?? ""}
        confirmText="מחק"
        cancelText="ביטול"
        variant="danger"
      />

      {showCreate && (
        <CreateCompanyModal
          onClose={() => setShowCreate(false)}
          onCreated={(id) => {
            setShowCreate(false);
            navigate(`/companies/${id}`);
          }}
        />
      )}
    </PageShell>
  );
}

function CompanyCard({
  company,
  isDragging,
}: {
  company: Company;
  isDragging?: boolean;
}) {
  return (
    <div
      className={`bg-white rounded-xl p-3.5 shadow-sm border-l-[3px] transition-all ${
        isDragging
          ? "shadow-lg opacity-90 border-l-[#0073EA]"
          : "border-l-transparent hover:shadow-md hover:border-l-[#0073EA]"
      }`}
    >
      {/* Company icon + name */}
      <div className="flex items-center gap-2.5 mb-2">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-white"
          style={{ backgroundColor: companyColor(company.name) }}
        >
          <Building2 size={14} />
        </div>
        <span className="font-semibold text-[13px] text-[#323338] truncate">
          {company.name}
        </span>
      </div>

      {/* Industry badge */}
      {company.industry && (
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#F5F6F8] text-[#676879] inline-block mb-2">
          {company.industry}
        </span>
      )}

      {/* Contact info */}
      {company.email && (
        <div className="flex items-center gap-1.5 mb-0.5">
          <Mail size={10} className="text-[#9699A6] flex-shrink-0" />
          <span className="text-[11px] text-[#676879] truncate" dir="ltr">{company.email}</span>
        </div>
      )}
      {company.phone && (
        <div className="flex items-center gap-1.5 mb-0.5">
          <Phone size={10} className="text-[#9699A6] flex-shrink-0" />
          <span className="text-[11px] text-[#676879] truncate" dir="ltr">{company.phone}</span>
        </div>
      )}

      {/* Bottom row: contacts + deals count */}
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#E6E9EF]">
        <div className="flex items-center gap-1.5">
          <Users size={12} className="text-[#6161FF]" />
          <span className="text-[11px] font-semibold text-[#676879]">
            {company.contactCount}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Handshake size={12} className="text-[#00CA72]" />
          <span className="text-[11px] font-semibold text-[#676879]">
            {company.dealCount}
          </span>
        </div>
      </div>
    </div>
  );
}

function CompaniesErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-14 h-14 rounded-2xl bg-[#FFF0F0] flex items-center justify-center mb-4">
        <AlertCircle size={28} className="text-[#E44258]" />
      </div>
      <h2 className="text-base font-bold text-[#323338] mb-1">שגיאה בטעינת חברות</h2>
      <p className="text-[13px] text-[#676879] mb-4">לא הצלחנו לטעון את הנתונים. נסו שוב.</p>
      <button
        onClick={onRetry}
        className="flex items-center gap-1.5 px-4 py-2 bg-[#0073EA] hover:bg-[#0060C2] text-white text-[13px] font-semibold rounded-[4px] transition-colors"
      >
        <RefreshCw size={14} />
        נסה שוב
      </button>
    </div>
  );
}

function CreateCompanyModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated?: (id: string) => void;
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    name: "",
    website: "",
    phone: "",
    email: "",
    industry: "",
    size: "",
  });

  const mutation = useMutation({
    mutationFn: () =>
      createCompany({
        ...form,
        website: form.website || undefined,
        phone: form.phone || undefined,
        email: form.email || undefined,
        industry: form.industry || undefined,
        size: form.size || undefined,
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      queryClient.invalidateQueries({ queryKey: ["companies-board"] });
      toast.success("חברה נוצרה בהצלחה!");
      if (onCreated) {
        onCreated(data.id);
      } else {
        onClose();
      }
    },
    onError: (err: any) => {
      toast.error(err?.message || "שגיאה ביצירת חברה");
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    mutation.mutate();
  }

  const setField = (key: string, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  return (
    <Modal open={true} onClose={onClose} title="חברה חדשה">
      <form onSubmit={handleSubmit} className="space-y-4 p-6">
        <div>
          <label className="block text-[13px] font-medium text-[#323338] mb-1">
            שם חברה *
          </label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setField("name", e.target.value)}
            className="w-full px-3 py-2 border border-[#E6E9EF] rounded-[4px] text-[13px] focus:outline-none focus:ring-2 focus:ring-[#0073EA]/30 focus:border-[#0073EA]"
            required
          />
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

        <div>
          <label className="block text-[13px] font-medium text-[#323338] mb-1">
            אתר אינטרנט
          </label>
          <input
            type="url"
            value={form.website}
            onChange={(e) => setField("website", e.target.value)}
            className="w-full px-3 py-2 border border-[#E6E9EF] rounded-[4px] text-[13px] focus:outline-none focus:ring-2 focus:ring-[#0073EA]/30 focus:border-[#0073EA]"
            dir="ltr"
            placeholder="https://"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[13px] font-medium text-[#323338] mb-1">
              תעשייה
            </label>
            <select
              value={form.industry}
              onChange={(e) => setField("industry", e.target.value)}
              className="w-full px-3 py-2 border border-[#E6E9EF] rounded-[4px] text-[13px] focus:outline-none focus:ring-2 focus:ring-[#0073EA]/30 focus:border-[#0073EA] bg-white"
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
            <label className="block text-[13px] font-medium text-[#323338] mb-1">
              גודל
            </label>
            <select
              value={form.size}
              onChange={(e) => setField("size", e.target.value)}
              className="w-full px-3 py-2 border border-[#E6E9EF] rounded-[4px] text-[13px] focus:outline-none focus:ring-2 focus:ring-[#0073EA]/30 focus:border-[#0073EA] bg-white"
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
            className="flex-1 py-2 bg-surface-tertiary hover:bg-border text-[#676879] font-semibold rounded-[4px] transition-colors text-[13px]"
          >
            ביטול
          </button>
          <button
            type="submit"
            disabled={mutation.isPending || !form.name.trim()}
            className="flex-1 py-2 bg-[#0073EA] hover:bg-[#0060C2] text-white font-semibold rounded-[4px] transition-colors text-[13px] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {mutation.isPending ? "יוצר..." : "צור חברה"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
