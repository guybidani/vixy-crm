import { useState, useEffect } from "react";
import ConfirmDialog from "../components/shared/ConfirmDialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useDebounce } from "../hooks/useDebounce";
import { useInlineUpdate } from "../hooks/useInlineUpdate";
import {
  Plus,
  Clock,
  Building2,
  AlertTriangle,
  Table2,
  BarChart3,
  HeartPulse,
  MessageSquare,
} from "lucide-react";
import toast from "react-hot-toast";
import { getWhatsAppUrl } from "../utils/phone";
import PageShell from "../components/layout/PageShell";
import Modal from "../components/shared/Modal";
import KanbanBoard, {
  type KanbanColumn as KanbanCol,
} from "../components/shared/KanbanBoard";
import ViewToggle from "../components/shared/ViewToggle";
import ExportButton from "../components/shared/ExportButton";
import BulkActionBar from "../components/shared/BulkActionBar";
import MondayBoard, {
  MondayStatusCell,
  type MondayGroup,
  type MondayColumn,
} from "../components/shared/MondayBoard";
import { type ContextMenuItem } from "../components/shared/RowContextMenu";
import MondayTextCell from "../components/shared/MondayTextCell";
import MondayNumberCell from "../components/shared/MondayNumberCell";
import MondayPersonCell from "../components/shared/MondayPersonCell";
import DealDetailPanel from "../components/deals/DealDetailPanel";
import DealsChartView from "../components/deals/DealsChartView";
import {
  getDealsPipeline,
  listDeals,
  createDeal,
  updateDeal,
  bulkDeleteDeals,
  type Deal,
  type PipelineResponse,
} from "../api/deals";
import { listContacts } from "../api/contacts";
import { listCompanies } from "../api/companies";
import { useWorkspaceOptions } from "../hooks/useWorkspaceOptions";
import SavedViewsBar from "../components/shared/SavedViewsBar";
import { type SavedView } from "../api/views";

type ViewMode = "kanban" | "table";
type TableTab = "table" | "chart";

export default function DealsPage() {
  const { dealStages, priorities } = useWorkspaceOptions();
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [tableTab, setTableTab] = useState<TableTab>("table");
  const [showCreate, setShowCreate] = useState(false);
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState<{ ids: string[]; message: string } | null>(null);

  // Saved views filter state
  const [activeView, setActiveView] = useState<SavedView | null>(null);
  const viewFilters = (activeView?.filters ?? {}) as Record<string, string | undefined>;

  function handleSelectView(view: SavedView | null) {
    setActiveView(view);
    setPage(1);
  }

  // Kanban data
  const { data: pipelineData, isLoading: pipelineLoading } = useQuery({
    queryKey: ["deals-pipeline"],
    queryFn: getDealsPipeline,
    enabled: viewMode === "kanban",
  });

  // Table data
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search);
  const [page, setPage] = useState(1);

  useEffect(() => setSelectedIds(new Set()), [page, debouncedSearch]);

  const { data: tableData, isLoading: tableLoading } = useQuery({
    queryKey: ["deals", { search: debouncedSearch, page, stage: viewFilters.stage, sortBy: activeView?.sortBy, sortDir: activeView?.sortDir }],
    queryFn: () =>
      listDeals({
        search: debouncedSearch || undefined,
        page,
        stage: viewFilters.stage,
        sortBy: activeView?.sortBy ?? undefined,
        sortDir: activeView?.sortDir ?? undefined,
      }),
    enabled: viewMode === "table",
  });

  // Stage change mutation
  const stageMutation = useMutation({
    mutationFn: ({ id, stage }: { id: string; stage: string }) =>
      updateDeal(id, { stage }),
    onSuccess: (_data, { stage }) => {
      queryClient.invalidateQueries({ queryKey: ["deals-pipeline"] });
      queryClient.invalidateQueries({ queryKey: ["deals"] });
      toast.success(`עסקה הועברה ל${dealStages[stage]?.label}`);
    },
    onError: (err: any) => toast.error(err?.message || "שגיאה בעדכון"),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: (ids?: string[]) => bulkDeleteDeals(ids ?? Array.from(selectedIds)),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["deals"] });
      toast.success(`${data.deleted} עסקאות נמחקו`);
      setSelectedIds(new Set());
    },
    onError: () => toast.error("שגיאה במחיקה"),
  });

  // Inline update
  const inlineUpdate = useInlineUpdate(updateDeal, [
    ["deals"],
    ["deals-pipeline"],
  ]);

  // Contact & company options for person pickers
  const { data: contactsData } = useQuery({
    queryKey: ["contacts", { limit: 200 }],
    queryFn: () => listContacts({ limit: 200 }),
  });
  const { data: companiesData } = useQuery({
    queryKey: ["companies", { limit: 200 }],
    queryFn: () => listCompanies({ limit: 200 }),
  });
  const contactOptions = (contactsData?.data || []).map((c) => ({
    id: c.id,
    name: c.fullName,
  }));
  const companyOptions = (companiesData?.data || []).map((c) => ({
    id: c.id,
    name: c.name,
  }));

  // ── Kanban columns ──────────────────────────
  const kanbanColumns: KanbanCol<Deal>[] = Object.entries(dealStages).map(
    ([stageKey, stageInfo]) => ({
      key: stageKey,
      label: stageInfo.label,
      color: stageInfo.color,
      items: pipelineData?.stages[stageKey] || [],
      aggregate: `₪${(pipelineData?.totals.find((t) => t.stage === stageKey)?.totalValue || 0).toLocaleString()}`,
    }),
  );

  function handleKanbanDragEnd(
    itemId: string,
    fromColumn: string,
    toColumn: string,
  ) {
    queryClient.setQueryData(
      ["deals-pipeline"],
      (old: PipelineResponse | undefined) => {
        if (!old) return old;
        const updated = { ...old, stages: { ...old.stages } };
        updated.stages[fromColumn] = updated.stages[fromColumn].filter(
          (d) => d.id !== itemId,
        );
        const deal = old.stages[fromColumn].find((d) => d.id === itemId);
        if (deal) {
          updated.stages[toColumn] = [
            ...updated.stages[toColumn],
            { ...deal, stage: toColumn as Deal["stage"], daysInStage: 0 },
          ];
        }
        return updated;
      },
    );

    stageMutation.mutate({ id: itemId, stage: toColumn });
  }

  // ── Monday Board columns ────────────────────
  const mondayColumns: MondayColumn<Deal>[] = [
    {
      key: "title",
      label: "Item",
      sortable: true,
      render: (row) => (
        <MondayTextCell
          value={row.title}
          onChange={(val) => inlineUpdate(row.id, { title: val })}
        />
      ),
    },
    {
      key: "contact",
      label: "איש קשר",
      width: "160px",
      render: (row) => (
        <MondayPersonCell
          value={row.contact}
          options={contactOptions}
          onChange={(id) => inlineUpdate(row.id, { contactId: id! })}
          placeholder="בחר איש קשר"
        />
      ),
    },
    {
      key: "value",
      label: "סכום",
      width: "130px",
      sortable: true,
      summary: "sum",
      render: (row) => (
        <MondayNumberCell
          value={row.value}
          onChange={(val) => inlineUpdate(row.id, { value: val })}
          prefix="₪"
        />
      ),
    },
    {
      key: "stage",
      label: "סטטוס",
      width: "150px",
      sortable: true,
      render: (row) => (
        <MondayStatusCell
          value={row.stage}
          options={dealStages}
          onChange={(stage) => {
            inlineUpdate(row.id, { stage });
            toast.success(`עסקה הועברה ל${dealStages[stage]?.label}`);
          }}
        />
      ),
    },
    {
      key: "priority",
      label: "עדיפות",
      width: "120px",
      sortable: true,
      render: (row) => (
        <MondayStatusCell
          value={row.priority}
          options={priorities}
          onChange={(priority) => inlineUpdate(row.id, { priority })}
        />
      ),
    },
    {
      key: "company",
      label: "חברה",
      width: "160px",
      render: (row) => (
        <MondayPersonCell
          value={row.company}
          options={companyOptions}
          onChange={(id) => inlineUpdate(row.id, { companyId: id })}
          placeholder="בחר חברה"
        />
      ),
    },
    {
      key: "daysInStage",
      label: "ימים בשלב",
      width: "100px",
      sortable: true,
      summary: "avg",
      render: (row) => {
        const isRotting = row.daysInStage >= 7;
        const isSevere = row.daysInStage >= 14;
        return (
          <div className="flex items-center gap-1">
            {isRotting && (
              <AlertTriangle
                size={12}
                className={
                  isSevere ? "text-[#FB275D] animate-pulse" : "text-[#FDAB3D]"
                }
              />
            )}
            <span
              className={`font-semibold text-[13px] ${
                isSevere
                  ? "text-[#FB275D]"
                  : isRotting
                    ? "text-[#FDAB3D]"
                    : "text-[#676879]"
              }`}
            >
              {row.daysInStage}
            </span>
          </div>
        );
      },
    },
    {
      key: "probability",
      label: "סיכוי סגירה",
      width: "110px",
      sortable: true,
      summary: "avg",
      render: (row) => (
        <MondayNumberCell
          value={row.probability}
          onChange={(val) => inlineUpdate(row.id, { probability: val })}
          suffix="%"
          min={0}
          max={100}
        />
      ),
    },
    {
      key: "health",
      label: "בריאות",
      width: "130px",
      render: (row) => {
        const h = row.health;
        if (!h) return <span className="text-[13px] text-[#C5C7D0]">—</span>;
        return (
          <div className="flex items-center gap-1.5" title={`${h.score}/100`}>
            <span
              className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: h.color }}
            />
            <span
              className="text-[12px] font-semibold"
              style={{ color: h.color }}
            >
              {h.label}
            </span>
          </div>
        );
      },
    },
  ];

  // Monday groups — single group with all deals
  const mondayGroups: MondayGroup<Deal>[] = [
    {
      key: "all",
      label: "כל העסקאות",
      color: "#579BFC",
      items: tableData?.data || [],
    },
  ];

  // Pipeline totals
  const openStages = ["LEAD", "QUALIFIED", "PROPOSAL", "NEGOTIATION"];
  const totalPipelineValue =
    pipelineData?.totals
      .filter((t) => openStages.includes(t.stage))
      .reduce((sum, t) => sum + t.totalValue, 0) || 0;
  const totalDeals =
    pipelineData?.totals.reduce((sum, t) => sum + t.count, 0) ||
    tableData?.pagination.total ||
    0;

  return (
    <PageShell
      title="עסקאות"
      subtitle={`${totalDeals} עסקאות${viewMode === "kanban" ? ` | ₪${totalPipelineValue.toLocaleString()} בצינור` : ""}`}
      actions={
        <div className="flex items-center gap-2">
          <ViewToggle viewMode={viewMode} onChange={setViewMode} />
          <ExportButton entity="deals" filters={{ search: debouncedSearch }} />
          {viewMode === "kanban" && (
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary-hover text-white text-sm font-semibold rounded-lg transition-all hover:shadow-md active:scale-[0.97]"
            >
              <Plus size={16} />
              עסקה חדשה
            </button>
          )}
        </div>
      }
    >
      {/* Saved views bar */}
      {viewMode === "table" && (
        <SavedViewsBar
          entity="deals"
          activeViewId={activeView?.id ?? null}
          onSelectView={handleSelectView}
          currentFilters={viewFilters}
          hasActiveFilters={Object.keys(viewFilters).length > 0}
        />
      )}

      {/* Monday-style tabs */}
      {viewMode === "table" && (
        <div
          role="tablist"
          aria-label="תצוגת עסקאות"
          className="flex items-center gap-0 mb-4 border-b border-[#E6E9EF]"
        >
          <button
            role="tab"
            aria-selected={tableTab === "table"}
            onClick={() => setTableTab("table")}
            className={`px-4 py-2 text-[13px] font-medium transition-colors ${
              tableTab === "table"
                ? "text-[#0073EA] border-b-2 border-[#0073EA]"
                : "text-[#676879] hover:text-[#323338]"
            }`}
          >
            <div className="flex items-center gap-1.5">
              <Table2 size={14} />
              טבלה
            </div>
          </button>
          <button
            role="tab"
            aria-selected={tableTab === "chart"}
            onClick={() => setTableTab("chart")}
            className={`px-4 py-2 text-[13px] font-medium transition-colors ${
              tableTab === "chart"
                ? "text-[#0073EA] border-b-2 border-[#0073EA]"
                : "text-[#676879] hover:text-[#323338]"
            }`}
          >
            <div className="flex items-center gap-1.5">
              <BarChart3 size={14} />
              תרשים
            </div>
          </button>
        </div>
      )}

      {viewMode === "kanban" ? (
        <KanbanBoard<Deal>
          columns={kanbanColumns}
          renderCard={(deal, isDragging) => (
            <DealCard deal={deal} isDragging={isDragging} />
          )}
          onDragEnd={handleKanbanDragEnd}
          onCardClick={(deal) => setSelectedDealId(deal.id)}
          loading={pipelineLoading}
          emptyText="אין עסקאות"
        />
      ) : tableTab === "chart" ? (
        <DealsChartView />
      ) : (
        <MondayBoard<Deal>
          groups={mondayGroups}
          columns={mondayColumns}
          onRowClick={(row) => setSelectedDealId(row.id)}
          onNewItem={() => setShowCreate(true)}
          newItemLabel="עסקה חדשה"
          search={search}
          onSearchChange={(s) => {
            setSearch(s);
            setPage(1);
          }}
          searchPlaceholder="חיפוש עסקאות..."
          loading={tableLoading}
          pagination={tableData?.pagination}
          onPageChange={setPage}
          statusKey="stage"
          statusOptions={dealStages}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          groupByColumns={[
            { key: "stage", label: "סטטוס" },
            { key: "priority", label: "עדיפות" },
          ]}
          contextMenuItems={(row: Deal) => {
            const items: ContextMenuItem[] = [
              {
                label: "פתח עסקה",
                icon: <Clock size={14} />,
                onClick: () => setSelectedDealId(row.id),
              },
              { label: "", onClick: () => {}, divider: true },
              {
                label: "מחק",
                onClick: () => setConfirmDelete({ ids: [row.id], message: "האם אתה בטוח שברצונך למחוק עסקה זו?" }),
                danger: true,
              },
            ];
            return items;
          }}
        />
      )}

      {showCreate && <CreateDealModal onClose={() => setShowCreate(false)} />}

      {selectedDealId && (
        <DealDetailPanel
          dealId={selectedDealId}
          onClose={() => setSelectedDealId(null)}
          onDeleted={() => setSelectedDealId(null)}
        />
      )}
      <BulkActionBar
        selectedCount={selectedIds.size}
        onClear={() => setSelectedIds(new Set())}
        onDelete={() => setConfirmDelete({ ids: Array.from(selectedIds), message: `האם אתה בטוח שברצונך למחוק ${selectedIds.size} עסקאות?` })}
        deleting={bulkDeleteMutation.isPending}
      />

      <ConfirmDialog
        open={!!confirmDelete}
        onConfirm={() => {
          if (confirmDelete) bulkDeleteMutation.mutate(confirmDelete.ids);
          setConfirmDelete(null);
        }}
        onCancel={() => setConfirmDelete(null)}
        title="מחיקת עסקאות"
        message={confirmDelete?.message ?? ""}
        confirmText="מחק"
        cancelText="ביטול"
        variant="danger"
      />
    </PageShell>
  );
}

/* ── Deal Kanban Card ──────────────────────────────── */

function DealCard({ deal, isDragging }: { deal: Deal; isDragging?: boolean }) {
  const isRotting = deal.daysInStage >= 7;
  const isSeverelyRotting = deal.daysInStage >= 14;
  const isClosedStage =
    deal.stage === "CLOSED_WON" || deal.stage === "CLOSED_LOST";

  return (
    <div
      className={`bg-white rounded-xl p-3.5 shadow-sm border-l-[3px] transition-all ${
        isDragging
          ? "shadow-lg opacity-90 border-l-primary"
          : isClosedStage
            ? "border-l-border-light"
            : isSeverelyRotting
              ? "border-l-danger bg-red-50/30"
              : isRotting
                ? "border-l-warning bg-yellow-50/30"
                : "border-l-transparent hover:shadow-md hover:border-l-primary"
      }`}
    >
      {/* Title + Value */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="font-semibold text-sm text-text-primary leading-tight">
          {deal.title}
        </span>
        <span className="font-bold text-sm text-primary whitespace-nowrap">
          ₪{deal.value.toLocaleString()}
        </span>
      </div>

      {/* Contact */}
      {deal.contact && (
        <div className="flex items-center gap-1.5 mb-1">
          <div
            className="w-5 h-5 rounded-full bg-[#6161FF] flex items-center justify-center"
            role="img"
            aria-label={deal.contact.name}
          >
            <span className="text-white text-[8px] font-bold">
              {deal.contact.name[0]}
            </span>
          </div>
          <span className="text-xs text-text-secondary flex-1">
            {deal.contact.name}
          </span>
          {deal.contact.phone && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                window.open(getWhatsAppUrl(deal.contact!.phone!), "_blank");
              }}
              title="שלח הודעת וואטסאפ"
              className="p-0.5 rounded hover:bg-[#25D366]/10 transition-colors"
            >
              <MessageSquare size={13} color="#25D366" />
            </button>
          )}
        </div>
      )}

      {/* Company */}
      {deal.company && (
        <div className="flex items-center gap-1.5 mb-1">
          <Building2 size={11} className="text-text-tertiary" />
          <span className="text-xs text-text-secondary">
            {deal.company.name}
          </span>
        </div>
      )}

      {/* Bottom row */}
      <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-border-light">
        {/* Assignee */}
        <div className="flex items-center gap-1">
          {deal.assignee && (
            <div
              className="w-5 h-5 bg-primary-light rounded-full flex items-center justify-center"
              role="img"
              aria-label={deal.assignee.name}
            >
              <span className="text-primary text-[9px] font-bold">
                {deal.assignee.name[0]}
              </span>
            </div>
          )}
        </div>

        {/* Days in stage + rotting */}
        <div className="flex items-center gap-2">
          {!isClosedStage && (
            <div
              className={`flex items-center gap-0.5 text-[10px] font-semibold ${
                isSeverelyRotting
                  ? "text-danger"
                  : isRotting
                    ? "text-warning"
                    : "text-text-tertiary"
              }`}
            >
              {isRotting && (
                <AlertTriangle
                  size={10}
                  className={isSeverelyRotting ? "animate-pulse" : ""}
                />
              )}
              <Clock size={10} />
              <span>{deal.daysInStage}d</span>
            </div>
          )}

          <span className="text-[10px] text-text-tertiary font-medium">
            {deal.probability}%
          </span>

          {/* Health dot */}
          {deal.health && (
            <span
              className="inline-block w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: deal.health.color }}
              title={`${deal.health.label} (${deal.health.score})`}
            />
          )}
        </div>
      </div>

      {/* Next task indicator */}
      {deal.nextTask && (
        <div className="mt-2 px-2 py-1.5 bg-surface-secondary rounded-lg text-[10px] text-text-secondary truncate">
          <CheckSquareIcon /> {deal.nextTask.title}
        </div>
      )}
    </div>
  );
}

function CheckSquareIcon() {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="inline-block mr-0.5"
    >
      <polyline points="9 11 12 14 22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  );
}

/* ── Create Deal Modal ─────────────────────────────── */

function CreateDealModal({ onClose }: { onClose: () => void }) {
  const { dealStages, priorities } = useWorkspaceOptions();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    title: "",
    value: "",
    contactId: "",
    companyId: "",
    stage: "LEAD",
    priority: "MEDIUM",
    expectedClose: "",
    notes: "",
  });

  const { data: contacts } = useQuery({
    queryKey: ["contacts", { limit: 100 }],
    queryFn: () => listContacts({ limit: 100 }),
  });

  const { data: companies } = useQuery({
    queryKey: ["companies", { limit: 100 }],
    queryFn: () => listCompanies({ limit: 100 }),
  });

  const mutation = useMutation({
    mutationFn: () =>
      createDeal({
        title: form.title,
        value: form.value ? Number(form.value) : undefined,
        contactId: form.contactId,
        companyId: form.companyId || undefined,
        stage: form.stage,
        priority: form.priority,
        expectedClose: form.expectedClose || undefined,
        notes: form.notes || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deals-pipeline"] });
      queryClient.invalidateQueries({ queryKey: ["deals"] });
      toast.success("עסקה נוצרה בהצלחה!");
      onClose();
    },
    onError: (err: any) => {
      toast.error(err?.message || "שגיאה ביצירת עסקה");
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.contactId) {
      toast.error("יש לבחור איש קשר");
      return;
    }
    mutation.mutate();
  }

  const setField = (key: string, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  return (
    <Modal open={true} onClose={onClose} title="עסקה חדשה">
      <form onSubmit={handleSubmit} className="space-y-4 p-6">
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">
            שם עסקה *
          </label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setField("title", e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              סכום (₪)
            </label>
            <input
              type="number"
              value={form.value}
              onChange={(e) => setField("value", e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              dir="ltr"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              תאריך סגירה צפוי
            </label>
            <input
              type="date"
              value={form.expectedClose}
              onChange={(e) => setField("expectedClose", e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              dir="ltr"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              איש קשר *
            </label>
            <select
              value={form.contactId}
              onChange={(e) => setField("contactId", e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white"
              required
            >
              <option value="">בחרו איש קשר</option>
              {contacts?.data.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.fullName}
                </option>
              ))}
            </select>
          </div>
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
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              שלב
            </label>
            <select
              value={form.stage}
              onChange={(e) => setField("stage", e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white"
            >
              {Object.entries(dealStages).map(([key, val]) => (
                <option key={key} value={key}>
                  {val.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              עדיפות
            </label>
            <select
              value={form.priority}
              onChange={(e) => setField("priority", e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white"
            >
              {Object.entries(priorities).map(([key, val]) => (
                <option key={key} value={key}>
                  {val.label}
                </option>
              ))}
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
            {mutation.isPending ? "יוצר..." : "צור עסקה"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
