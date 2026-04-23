import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import ConfirmDialog from "../components/shared/ConfirmDialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useDebounce } from "../hooks/useDebounce";
import { useInlineUpdate } from "../hooks/useInlineUpdate";
import { useDetailPanelNavigation } from "../hooks/useDetailPanelNavigation";
import {
  Plus,
  Building2,
  AlertTriangle,
  Table2,
  BarChart3,
  MessageSquare,
  Calendar,
  User,
  TrendingUp,
  CheckCircle2,
  Layers,
  RefreshCw,
} from "lucide-react";
import toast from "react-hot-toast";
import { handleMutationError } from "../lib/utils";
import { getWhatsAppUrl } from "../utils/phone";
import { getAvatarColor } from "../utils/avatar";
import PageShell from "../components/layout/PageShell";
import { useModuleLabel } from "../hooks/useModuleLabel";
import Modal from "../components/shared/Modal";
import KanbanBoard, {
  type KanbanColumn as KanbanCol,
} from "../components/shared/KanbanBoard";
import ExportButton from "../components/shared/ExportButton";
import BulkActionBar from "../components/shared/BulkActionBar";
import BulkActionDropdown from "../components/shared/BulkActionDropdown";
import MondayBoard, {
  MondayStatusCell,
  type MondayGroup,
  type MondayColumn,
} from "../components/shared/MondayBoard";
import { buildRowContextItems } from "../components/shared/RowContextMenu";
import MondayTextCell from "../components/shared/MondayTextCell";
import MondayNumberCell from "../components/shared/MondayNumberCell";
import MondayPersonCell from "../components/shared/MondayPersonCell";
import DealDetailPanel from "../components/deals/DealDetailPanel";
import DealsChartView from "../components/deals/DealsChartView";
import DealHealthBadge from "../components/deals/DealHealthBadge";
import EmptyState from "../components/shared/EmptyState";
import Tooltip from "../components/shared/Tooltip";
import { EmptyDeals, EmptyError } from "../components/shared/illustrations";
import {
  getDealsPipeline,
  listDeals,
  createDeal,
  updateDeal,
  bulkDeleteDeals,
  bulkUpdateDeals,
  restoreDeal,
  duplicateDeal,
  type Deal,
  type PipelineResponse,
} from "../api/deals";
import { listTags } from "../api/tags";
import { listMentionableMembers } from "../api/auth";
import { sortedEntries } from "../hooks/useWorkspaceOptions";
import UndoToast from "../components/shared/UndoToast";
import { listContacts } from "../api/contacts";
import { listCompanies } from "../api/companies";
import { useWorkspaceOptions } from "../hooks/useWorkspaceOptions";
import { useCanManageWorkspace } from "../hooks/useWorkspaceRole";
import { useEditLabelsMutation } from "../hooks/useEditLabelsMutation";
import SavedViewsBar, { type ViewState } from "../components/shared/SavedViewsBar";
import { type SavedView } from "../api/views";

type ViewMode = "kanban" | "table";
type TableTab = "table" | "chart";

export default function DealsPage() {
  const { dealStages, priorities } = useWorkspaceOptions();
  const dealsLabel = useModuleLabel("deals");
  const canManage = useCanManageWorkspace();
  const editLabelsMut = useEditLabelsMutation();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [tableTab, setTableTab] = useState<TableTab>("table");
  const [showCreate, setShowCreate] = useState(() => searchParams.get("new") === "1");

  // Clear the ?new=1 param once we've opened the modal
  useEffect(() => {
    if (searchParams.get("new") === "1") {
      setShowCreate(true);
      setSearchParams((prev) => { prev.delete("new"); return prev; }, { replace: true });
    }
  }, []);
  const [selectedDealId, setSelectedDealId] = useState<string | null>(() => searchParams.get("open") || null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Clear the ?open=:id param once we've opened the panel
  useEffect(() => {
    const openId = searchParams.get("open");
    if (openId) {
      setSelectedDealId(openId);
      setSearchParams((prev) => { prev.delete("open"); return prev; }, { replace: true });
    }
  }, []);
  const [confirmDelete, setConfirmDelete] = useState<{ ids: string[]; message: string } | null>(null);
  const [confirmWonId, setConfirmWonId] = useState<string | null>(null);

  // Saved views filter state
  const [activeView, setActiveView] = useState<SavedView | null>(null);
  const viewFilters = (activeView?.filters ?? {}) as Record<string, string | undefined>;

  // Controlled board state for saved-view capture/restore
  const [boardFilters, setBoardFilters] = useState<
    Array<{ column: string; values: string[] }>
  >([]);
  const [boardSortBy, setBoardSortBy] = useState<string | null>(null);
  const [boardSortDir, setBoardSortDir] = useState<"asc" | "desc">("asc");
  const [groupByKey, setGroupByKey] = useState<string | null>(null);

  function handleSelectView(view: SavedView | null) {
    setActiveView(view);
    setPage(1);
    if (!view) {
      setBoardFilters([]);
      setBoardSortBy(null);
      setBoardSortDir("asc");
      setGroupByKey(null);
    }
  }

  function handleApplyView(state: ViewState) {
    setBoardFilters(state.boardFilters ?? []);
    setBoardSortBy(state.sortBy ?? null);
    setBoardSortDir((state.sortDir as "asc" | "desc") ?? "asc");
    setGroupByKey(state.groupByKey ?? null);
    setPage(1);
  }

  // Loss reason modal state
  const [lostModal, setLostModal] = useState<{ dealId: string } | null>(null);
  const [lossReason, setLossReason] = useState("price");
  const [lossNote, setLossNote] = useState("");

  // Won/Lost mutations
  const wonMutation = useMutation({
    mutationFn: (id: string) =>
      updateDeal(id, { stage: "CLOSED_WON" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deals-pipeline"] });
      queryClient.invalidateQueries({ queryKey: ["deals"] });
      toast.success("עסקה נסגרה בהצלחה! 🎉");
    },
    onError: (err) => handleMutationError(err, "שגיאה בעדכון"),
  });

  const lostMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      updateDeal(id, { stage: "CLOSED_LOST", lostReason: reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deals-pipeline"] });
      queryClient.invalidateQueries({ queryKey: ["deals"] });
      toast.success("עסקה סומנה כהפסד");
      setLostModal(null);
      setLossNote("");
      setLossReason("price");
    },
    onError: (err) => handleMutationError(err, "שגיאה בעדכון"),
  });

  const duplicateMut = useMutation({
    mutationFn: duplicateDeal,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deals"] });
      queryClient.invalidateQueries({ queryKey: ["deals-pipeline"] });
      toast.success("שוכפל בהצלחה");
    },
    onError: (err) => handleMutationError(err, "שגיאה בשכפול"),
  });

  const bulkDuplicateMut = useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(ids.map((id) => duplicateDeal(id)));
      return { duplicated: ids.length };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["deals"] });
      queryClient.invalidateQueries({ queryKey: ["deals-pipeline"] });
      toast.success(`שוכפלו ${result.duplicated} פריטים`);
      setSelectedIds(new Set());
    },
    onError: (err) => handleMutationError(err, "שגיאה בשכפול"),
  });

  function handleLostSubmit() {
    if (!lostModal) return;
    const reason = lossNote.trim() ? `${lossReason}: ${lossNote.trim()}` : lossReason;
    lostMutation.mutate({ id: lostModal.dealId, reason });
  }

  // Kanban data
  const { data: pipelineData, isLoading: pipelineLoading, isError: pipelineError, refetch: refetchPipeline } = useQuery({
    queryKey: ["deals-pipeline"],
    queryFn: getDealsPipeline,
  });

  // Table data
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search);
  const [page, setPage] = useState(1);

  useEffect(() => setSelectedIds(new Set()), [page, debouncedSearch]);

  const { data: tableData, isLoading: tableLoading, isError: tableError, refetch: refetchTable } = useQuery({
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
    onError: (err) => handleMutationError(err, "שגיאה בעדכון"),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids?: string[]) => {
      const resolved = ids ?? Array.from(selectedIds);
      const res = await bulkDeleteDeals(resolved);
      return { ...res, ids: resolved };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["deals"] });
      queryClient.invalidateQueries({ queryKey: ["deals-pipeline"] });
      setSelectedIds(new Set());

      const message =
        data.ids.length === 1
          ? "עסקה נמחקה"
          : `${data.deleted} עסקאות נמחקו`;

      const UNDO_DURATION = 5000;
      toast.custom(
        (t) => (
          <UndoToast
            message={message}
            duration={UNDO_DURATION}
            onDismiss={() => toast.dismiss(t.id)}
            onUndo={async () => {
              try {
                await Promise.all(data.ids.map((id) => restoreDeal(id)));
                toast.dismiss(t.id);
                toast.success(
                  data.ids.length === 1 ? "שוחזר" : `${data.ids.length} שוחזרו`,
                );
                queryClient.invalidateQueries({ queryKey: ["deals"] });
                queryClient.invalidateQueries({ queryKey: ["deals-pipeline"] });
              } catch {
                toast.dismiss(t.id);
                toast.error("שגיאה בשחזור");
              }
            }}
          />
        ),
        { duration: UNDO_DURATION },
      );
    },
    onError: () => toast.error("שגיאה במחיקה"),
  });

  const { data: allTags = [] } = useQuery({
    queryKey: ["tags"],
    queryFn: listTags,
  });

  const { data: membersData } = useQuery({
    queryKey: ["mentionable-members"],
    queryFn: listMentionableMembers,
  });
  const workspaceMembers = membersData?.members ?? [];

  const bulkUpdateMutation = useMutation({
    mutationFn: ({
      ids,
      data: updateData,
    }: {
      ids: string[];
      data: Parameters<typeof bulkUpdateDeals>[1];
    }) => bulkUpdateDeals(ids, updateData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deals"] });
      queryClient.invalidateQueries({ queryKey: ["deals-pipeline"] });
      toast.success(`${selectedIds.size} עסקאות עודכנו`);
      setSelectedIds(new Set());
    },
    onError: (err) => handleMutationError(err, "שגיאה בעדכון"),
  });

  const handleBulkStage = (stage: string) =>
    bulkUpdateMutation.mutate({ ids: Array.from(selectedIds), data: { stage } });
  const handleBulkPriority = (priority: string) =>
    bulkUpdateMutation.mutate({ ids: Array.from(selectedIds), data: { priority } });
  const handleBulkAssignee = (assigneeId: string) =>
    bulkUpdateMutation.mutate({ ids: Array.from(selectedIds), data: { assigneeId } });
  const handleBulkTag = (tagId: string) =>
    bulkUpdateMutation.mutate({ ids: Array.from(selectedIds), data: { tagId } });

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
    // Require confirmation before closing a deal via drag-and-drop
    if (toColumn === "CLOSED_WON") {
      setConfirmWonId(itemId);
      return;
    }
    if (toColumn === "CLOSED_LOST") {
      setLostModal({ dealId: itemId });
      return;
    }

    applyKanbanMove(itemId, fromColumn, toColumn);
  }

  function applyKanbanMove(itemId: string, fromColumn: string, toColumn: string) {
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
      key: "stage",
      label: "סטטוס",
      width: "150px",
      sortable: true,
      noPadding: true,
      render: (row) => (
        <MondayStatusCell
          value={row.stage}
          options={dealStages}
          onChange={(stage) => {
            if (stage === "CLOSED_WON") {
              setConfirmWonId(row.id);
              return;
            }
            if (stage === "CLOSED_LOST") {
              setLostModal({ dealId: row.id });
              return;
            }
            inlineUpdate(row.id, { stage });
            toast.success(`עסקה הועברה ל${dealStages[stage]?.label}`);
          }}
          onEditLabels={(updated) =>
            editLabelsMut.mutate({ key: "dealStages", updated })
          }
        />
      ),
    },
    {
      key: "priority",
      label: "עדיפות",
      width: "120px",
      sortable: true,
      noPadding: true,
      render: (row) => (
        <MondayStatusCell
          value={row.priority}
          options={priorities}
          onChange={(priority) => inlineUpdate(row.id, { priority })}
          onEditLabels={(updated) =>
            editLabelsMut.mutate({ key: "priorities", updated })
          }
        />
      ),
    },
    {
      key: "value",
      label: "שווי",
      width: "120px",
      sortable: true,
      summary: "sum",
      render: (row) => (
        <MondayNumberCell
          value={row.value}
          onChange={(val) => inlineUpdate(row.id, { value: val })}
          prefix="₪"
          min={0}
        />
      ),
    },
    {
      key: "contact",
      label: "איש קשר",
      width: "160px",
      render: (row) => (
        <MondayPersonCell
          value={row.contact ? { id: row.contact.id, name: row.contact.name } : null}
          options={contactOptions}
          onChange={(id) => inlineUpdate(row.id, { contactId: id || undefined })}
          placeholder="בחר איש קשר"
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
                  isSevere ? "text-[#E2445C] animate-pulse" : "text-[#FDAB3D]"
                }
              />
            )}
            <span
              className={`font-semibold text-[13px] ${
                isSevere
                  ? "text-[#E2445C]"
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
      key: "expectedClose",
      label: "תאריך סגירה",
      width: "130px",
      sortable: true,
      render: (row) => {
        if (!row.expectedClose) return <span className="text-[13px] text-[#C5C7D0]">—</span>;
        const date = new Date(row.expectedClose);
        const isOverdue = row.stage !== "CLOSED_WON" && row.stage !== "CLOSED_LOST" && date < new Date();
        return (
          <div className="flex items-center gap-1">
            <Calendar size={12} className={isOverdue ? "text-[#E2445C]" : "text-[#9699A6]"} />
            <span className={`text-[13px] ${isOverdue ? "text-[#E2445C] font-semibold" : "text-[#676879]"}`}>
              {date.toLocaleDateString("he-IL", { day: "numeric", month: "short" })}
            </span>
          </div>
        );
      },
    },
    {
      key: "health",
      label: "בריאות",
      width: "130px",
      render: (row) => {
        const h = row.health;
        if (!h) return <span className="text-[13px] text-[#C5C7D0]">—</span>;
        return <DealHealthBadge health={h} showScore />;
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
  const totalDeals =
    pipelineData?.totals.reduce((sum, t) => sum + t.count, 0) ||
    tableData?.pagination.total ||
    0;

  // J/K navigation between deals while the detail panel is open.
  // In kanban view we walk the pipeline stage-by-stage (same order the user
  // sees); otherwise we walk the table rows.
  const navigableDeals: Deal[] =
    viewMode === "kanban"
      ? Object.keys(dealStages).flatMap(
          (stageKey) => pipelineData?.stages[stageKey] || [],
        )
      : tableData?.data || [];
  useDetailPanelNavigation<Deal>({
    items: navigableDeals,
    currentId: selectedDealId,
    onSelect: setSelectedDealId,
    enabled: !!selectedDealId,
  });

  return (
    <PageShell
      title={dealsLabel}
      emoji="🤝"
      boardStyle
      subtitle={totalDeals ? `${totalDeals} ${dealsLabel}` : undefined}
      views={[
        { key: "table", label: "טבלה" },
        { key: "kanban", label: "קנבאן" },
      ]}
      activeView={viewMode}
      onViewChange={(key) => setViewMode(key as ViewMode)}
      actions={
        <div className="flex items-center gap-2">
          <ExportButton entity="deals" filters={{ search: debouncedSearch }} />
          <Tooltip content={<span>עסקה חדשה · <kbd className="font-mono opacity-80">N D</kbd></span>}>
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-1.5 px-3 py-[6px] bg-[#0073EA] hover:bg-[#0060C2] text-white text-[13px] font-medium rounded-[4px] transition-colors"
            >
              <Plus size={15} strokeWidth={2.5} />
              עסקה חדשה
            </button>
          </Tooltip>
        </div>
      }
    >
      {/* Forecast Bar */}
      <ForecastBar forecast={pipelineData?.forecast} />

      {/* Saved views bar */}
      {viewMode === "table" && (
        <SavedViewsBar
          entity="deals"
          activeViewId={activeView?.id ?? null}
          onSelectView={handleSelectView}
          onApplyView={handleApplyView}
          currentFilters={viewFilters}
          boardFilters={boardFilters}
          sortBy={boardSortBy}
          sortDir={boardSortDir}
          groupByKey={groupByKey}
          columnLabels={{
            stage: "שלב",
            title: "כותרת",
            value: "סכום",
            expectedCloseDate: "סגירה צפויה",
            owner: "בעלים",
          }}
        />
      )}

      {/* Sub-view tabs within table mode */}
      {viewMode === "table" && (
        <div role="tablist" className="flex items-center gap-0 mb-4 border-b border-[#E6E9EF]">
          {([
            { key: "table", label: "טבלה", Icon: Table2 },
            { key: "chart", label: "תרשים", Icon: BarChart3 },
          ] as const).map(({ key, label, Icon }) => (
            <button
              key={key}
              role="tab"
              aria-selected={tableTab === key}
              onClick={() => setTableTab(key)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-[13px] font-medium transition-colors border-b-[2px] -mb-px ${
                tableTab === key
                  ? "text-[#0073EA] border-[#0073EA]"
                  : "text-[#676879] border-transparent hover:text-[#323338]"
              }`}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Empty state — no deals, no active search/filter */}
      {!debouncedSearch &&
        !viewFilters.stage &&
        totalDeals === 0 &&
        !pipelineLoading &&
        !tableLoading ? (
        <DealsEmptyState onAdd={() => setShowCreate(true)} />
      ) : viewMode === "kanban" ? (
        pipelineError ? (
          <DealsErrorState onRetry={() => refetchPipeline()} />
        ) : (
          <KanbanBoard<Deal>
            columns={kanbanColumns}
            renderCard={(deal, isDragging) => (
              <DealCard
                deal={deal}
                isDragging={isDragging}
                onWon={(id) => setConfirmWonId(id)}
                onLost={(id) => setLostModal({ dealId: id })}
              />
            )}
            onDragEnd={handleKanbanDragEnd}
            onCardClick={(deal) => setSelectedDealId(deal.id)}
            loading={pipelineLoading}
            emptyText="אין עסקאות"
          />
        )
      ) : tableTab === "chart" ? (
        <DealsChartView />
      ) : tableError ? (
        <DealsErrorState onRetry={() => refetchTable()} />
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
          groupByKey={groupByKey}
          onGroupByChange={setGroupByKey}
          activeFilters={boardFilters}
          onFiltersChange={setBoardFilters}
          sortColumn={boardSortBy}
          sortDirection={boardSortDir}
          onSortColumnChange={setBoardSortBy}
          onSortDirectionChange={setBoardSortDir}
          contextMenuItems={(row: Deal) =>
            buildRowContextItems({
              row,
              onOpen: () => setSelectedDealId(row.id),
              onDuplicate: () => duplicateMut.mutate(row.id),
              onDelete: () =>
                setConfirmDelete({
                  ids: [row.id],
                  message: "האם אתה בטוח שברצונך למחוק עסקה זו?",
                }),
            })
          }
        />
      )}

      {showCreate && <CreateDealModal onClose={() => setShowCreate(false)} onCreated={(id) => { setShowCreate(false); setSelectedDealId(id); }} />}

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
        onDelete={
          canManage
            ? () =>
                setConfirmDelete({
                  ids: Array.from(selectedIds),
                  message: `האם אתה בטוח שברצונך למחוק ${selectedIds.size} עסקאות?`,
                })
            : undefined
        }
        onDuplicate={
          canManage
            ? () => bulkDuplicateMut.mutate(Array.from(selectedIds))
            : undefined
        }
        onMoveTo={canManage ? (stage) => handleBulkStage(stage) : undefined}
        moveToOptions={sortedEntries(dealStages).map(([key, info]) => ({
          label: info.label,
          value: key,
          color: info.color,
        }))}
        moveToLabel="שנה שלב"
        deleting={bulkDeleteMutation.isPending}
      >
        {canManage && (
          <BulkActionDropdown
            label="שנה עדיפות"
            disabled={bulkUpdateMutation.isPending}
            options={sortedEntries(priorities).map(([key, info]) => ({
              key,
              label: info.label,
              color: info.color,
            }))}
            onSelect={handleBulkPriority}
          />
        )}
        {canManage && (
          <BulkActionDropdown
            label="שנה אחראי"
            disabled={bulkUpdateMutation.isPending}
            searchable
            options={workspaceMembers.map((m) => ({
              key: m.id,
              label: m.name,
            }))}
            onSelect={handleBulkAssignee}
          />
        )}
        {canManage && (
          <BulkActionDropdown
            label="הוסף תגית"
            disabled={bulkUpdateMutation.isPending}
            searchable
            options={allTags.map((t) => ({
              key: t.id,
              label: t.name,
              color: t.color,
            }))}
            onSelect={handleBulkTag}
          />
        )}
      </BulkActionBar>

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

      {/* Won Confirmation */}
      <ConfirmDialog
        open={!!confirmWonId}
        onConfirm={() => {
          if (confirmWonId) wonMutation.mutate(confirmWonId);
          setConfirmWonId(null);
        }}
        onCancel={() => setConfirmWonId(null)}
        title="סגירת עסקה כזכייה"
        message="האם אתה בטוח שברצונך לסמן את העסקה כזכייה?"
        confirmText="סגור כזכייה"
        cancelText="ביטול"
        variant="warning"
      />

      {/* Loss Reason Modal */}
      {lostModal && (
        <Modal open={true} onClose={() => setLostModal(null)} title="סיבת הפסד">
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-[13px] font-medium text-[#323338] mb-1">סיבה *</label>
              <select
                value={lossReason}
                onChange={(e) => setLossReason(e.target.value)}
                className="w-full px-3 py-2 border border-[#E6E9EF] rounded-[4px] text-[13px] focus:outline-none focus:ring-2 focus:ring-[#0073EA]/20 focus:border-[#0073EA] bg-white"
              >
                <option value="price">מחיר</option>
                <option value="competition">תחרות</option>
                <option value="timing">תזמון</option>
                <option value="no_budget">אין תקציב</option>
                <option value="other">אחר</option>
              </select>
            </div>
            <div>
              <label className="block text-[13px] font-medium text-[#323338] mb-1">הערה (אופציונלי)</label>
              <textarea
                value={lossNote}
                onChange={(e) => setLossNote(e.target.value)}
                rows={3}
                placeholder="פרט את הסיבה..."
                className="w-full px-3 py-2 border border-[#E6E9EF] rounded-[4px] text-[13px] focus:outline-none focus:ring-2 focus:ring-[#0073EA]/20 focus:border-[#0073EA] resize-none"
              />
            </div>
            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={() => setLostModal(null)}
                className="flex-1 py-2 bg-[#F6F7FB] hover:bg-[#E6E9EF] text-[#676879] font-semibold rounded-[4px] transition-colors text-[13px]"
              >
                ביטול
              </button>
              <button
                type="button"
                onClick={handleLostSubmit}
                disabled={lostMutation.isPending}
                className="flex-1 py-2 bg-[#E2445C] hover:bg-[#C7364E] text-white font-semibold rounded-[4px] transition-colors text-[13px] disabled:opacity-50"
              >
                {lostMutation.isPending ? "שומר..." : "סמן כהפסד"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </PageShell>
  );
}

/* ── Deal Kanban Card ──────────────────────────────── */


function DealCard({
  deal,
  isDragging,
  onWon,
  onLost,
}: {
  deal: Deal;
  isDragging?: boolean;
  onWon?: (id: string) => void;
  onLost?: (id: string) => void;
}) {
  const { dealStages } = useWorkspaceOptions();
  const isRotting = deal.daysInStage >= 7;
  const isSeverelyRotting = deal.daysInStage >= 14;
  const isClosedStage =
    deal.stage === "CLOSED_WON" || deal.stage === "CLOSED_LOST";

  // Deal age (days since created)
  const dealAgeDays = Math.floor(
    (Date.now() - new Date(deal.createdAt).getTime()) / (1000 * 60 * 60 * 24),
  );
  const ageColor =
    dealAgeDays < 30
      ? "text-[#00C875]"
      : dealAgeDays < 60
        ? "text-[#FDAB3D]"
        : "text-[#E2445C]";
  const stageInfo = dealStages[deal.stage];

  // Format expected close date
  const closeDate = deal.expectedClose
    ? new Date(deal.expectedClose).toLocaleDateString("he-IL", { day: "numeric", month: "short" })
    : null;
  const isOverdue = deal.expectedClose && !isClosedStage
    ? new Date(deal.expectedClose) < new Date()
    : false;

  return (
    <div
      className={`bg-white rounded-xl p-3.5 border transition-all select-none ${
        isDragging
          ? "shadow-2xl rotate-1 scale-105 opacity-95 border-[#0073EA]/40"
          : isSeverelyRotting && !isClosedStage
            ? "shadow-sm border-[#E2445C]/30 hover:shadow-md"
            : isRotting && !isClosedStage
              ? "shadow-sm border-[#FDAB3D]/40 hover:shadow-md"
              : "shadow-sm border-[#E6E9EF] hover:shadow-md hover:border-[#C5C7D0]"
      }`}
    >
      {/* Title */}
      <div className="mb-2.5">
        <span className="font-semibold text-[13px] text-[#323338] leading-snug block">
          {deal.title}
        </span>
      </div>

      {/* Contact row with avatar */}
      {deal.contact && (
        <div className="flex items-center gap-1.5 mb-1.5">
          <div
            className="w-[18px] h-[18px] rounded-full flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: getAvatarColor(deal.contact.name) }}
            role="img"
            aria-label={deal.contact.name}
          >
            <span className="text-white text-[8px] font-bold">
              {(deal.contact.name[0] || "?").toUpperCase()}
            </span>
          </div>
          <span className="text-[12px] text-[#676879] flex-1 truncate">
            {deal.contact.name}
          </span>
          {deal.contact.phone && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                window.open(getWhatsAppUrl(deal.contact!.phone!), "_blank");
              }}
              title="שלח הודעת וואטסאפ"
              className="p-0.5 rounded hover:bg-[#25D366]/10 transition-colors flex-shrink-0"
            >
              <MessageSquare size={12} color="#25D366" />
            </button>
          )}
        </div>
      )}

      {/* Company */}
      {deal.company && (
        <div className="flex items-center gap-1.5 mb-1.5">
          <Building2 size={11} className="text-[#9699A6] flex-shrink-0" />
          <span className="text-[11px] text-[#676879] truncate">
            {deal.company.name}
          </span>
        </div>
      )}

      {/* Value + Stage pill */}
      <div className="flex items-center gap-2 mt-2.5 mb-2.5">
        <span className="font-bold text-[13px] text-[#323338]">
          ₪{(deal.value || 0).toLocaleString()}
        </span>
        {stageInfo && (
          <span
            className="text-[10px] font-semibold px-2 py-0.5 rounded-full text-white flex-shrink-0"
            style={{ backgroundColor: stageInfo.color }}
          >
            {stageInfo.label}
          </span>
        )}
      </div>

      {/* Bottom row: assignee + close date + health */}
      <div className="flex items-center justify-between pt-2 border-t border-[#F0F0F5]">
        {/* Left: assignee avatar */}
        <div className="flex items-center gap-1">
          {deal.assignee ? (
            <div
              className="w-[20px] h-[20px] rounded-full flex items-center justify-center flex-shrink-0 ring-1 ring-white"
              style={{ backgroundColor: getAvatarColor(deal.assignee.name) }}
              title={deal.assignee.name}
            >
              <span className="text-white text-[8px] font-bold">
                {(deal.assignee.name[0] || "?").toUpperCase()}
              </span>
            </div>
          ) : (
            <div className="w-[20px] h-[20px] rounded-full border border-dashed border-[#C5C7D0] flex items-center justify-center">
              <User size={10} className="text-[#C5C7D0]" />
            </div>
          )}
        </div>

        {/* Right: close date + rotting indicator + health */}
        <div className="flex items-center gap-1.5">
          {!isClosedStage && isRotting && (
            <AlertTriangle
              size={11}
              className={`flex-shrink-0 ${isSeverelyRotting ? "text-[#E2445C] animate-pulse" : "text-[#FDAB3D]"}`}
            />
          )}

          {closeDate && (
            <div className={`flex items-center gap-0.5 text-[10px] font-medium ${isOverdue ? "text-[#E2445C]" : "text-[#676879]"}`}>
              <Calendar size={10} className="flex-shrink-0" />
              <span>{closeDate}</span>
            </div>
          )}

          <span className="text-[10px] text-[#9699A6]">{deal.probability}%</span>

          {deal.health && (
            <DealHealthBadge health={deal.health} showScore />
          )}
        </div>
      </div>

      {/* Next task */}
      {deal.nextTask && (
        <div className="mt-2 px-2 py-1.5 bg-[#F7F8FA] rounded-lg text-[10px] text-[#676879] truncate flex items-center gap-1">
          <CheckSquareIcon />
          {deal.nextTask.title}
        </div>
      )}

      {/* Deal age */}
      {!isClosedStage && (
        <div className={`mt-2 text-[10px] font-medium ${ageColor}`}>
          בצינור {dealAgeDays} ימים
        </div>
      )}

      {/* Won / Lost action buttons — only for open deals */}
      {!isClosedStage && (onWon || onLost) && (
        <div className="mt-2.5 flex gap-1.5" onClick={(e) => e.stopPropagation()}>
          {onWon && (
            <button
              onClick={() => onWon(deal.id)}
              className="flex-1 flex items-center justify-center gap-1 py-1 text-[10px] font-semibold rounded-md bg-[#E8F9F0] text-[#037F4C] hover:bg-[#00C875] hover:text-white transition-colors"
              title="סגור כזכייה"
            >
              <span>✓</span>
              <span>סגר כזכייה</span>
            </button>
          )}
          {onLost && (
            <button
              onClick={() => onLost(deal.id)}
              className="flex-1 flex items-center justify-center gap-1 py-1 text-[10px] font-semibold rounded-md bg-[#FDECEE] text-[#E2445C] hover:bg-[#E2445C] hover:text-white transition-colors"
              title="סגור כהפסד"
            >
              <span>✗</span>
              <span>סגר כהפסד</span>
            </button>
          )}
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

/* ── Forecast Bar ─────────────────────────────────── */

function ForecastBar({
  forecast,
}: {
  forecast?: { forecastThisMonth: number; wonThisMonth: number; totalPipeline: number };
}) {
  const fmt = (n: number) =>
    `₪${Math.round(n).toLocaleString("he-IL")}`;

  return (
    <div className="flex items-center gap-3 mb-4 p-3 bg-white border border-[#E6E9EF] rounded-xl shadow-sm">
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#EFF5FF] flex-1 min-w-0">
        <TrendingUp size={15} className="text-[#0073EA] flex-shrink-0" />
        <div className="min-w-0">
          <div className="text-[10px] text-[#676879] font-medium truncate">תחזית החודש</div>
          <div className="text-[13px] font-bold text-[#0073EA] truncate">
            {forecast ? fmt(forecast.forecastThisMonth) : "—"}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#E8F9F0] flex-1 min-w-0">
        <CheckCircle2 size={15} className="text-[#037F4C] flex-shrink-0" />
        <div className="min-w-0">
          <div className="text-[10px] text-[#676879] font-medium truncate">נסגר החודש</div>
          <div className="text-[13px] font-bold text-[#037F4C] truncate">
            {forecast ? fmt(forecast.wonThisMonth) : "—"}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#F7F0FF] flex-1 min-w-0">
        <Layers size={15} className="text-[#A25DDC] flex-shrink-0" />
        <div className="min-w-0">
          <div className="text-[10px] text-[#676879] font-medium truncate">הצינור הכולל</div>
          <div className="text-[13px] font-bold text-[#A25DDC] truncate">
            {forecast ? fmt(forecast.totalPipeline) : "—"}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Deals Empty State ─────────────────────────────── */

function DealsEmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <EmptyState
      illustration={<EmptyDeals />}
      title="צור את העסקה הראשונה שלך"
      description="עקוב אחרי כל ההתקדמות בצינור המכירות במקום אחד, עם תחזית הכנסות ותזכורות אוטומטיות."
      action={{
        label: "עסקה חדשה",
        onClick: onAdd,
        icon: <Plus size={16} />,
      }}
    />
  );
}

function DealsErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <EmptyState
      illustration={<EmptyError />}
      title="משהו השתבש"
      description="לא הצלחנו לטעון את העסקאות. נסו שוב בעוד רגע."
      action={{
        label: "נסה שוב",
        onClick: onRetry,
        icon: <RefreshCw size={14} />,
      }}
      variant="error"
    />
  );
}

/* ── Create Deal Modal ─────────────────────────────── */

function CreateDealModal({ onClose, onCreated }: { onClose: () => void; onCreated?: (id: string) => void }) {
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
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["deals-pipeline"] });
      queryClient.invalidateQueries({ queryKey: ["deals"] });
      toast.success("עסקה נוצרה בהצלחה!");
      if (onCreated) {
        onCreated(data.id);
      } else {
        onClose();
      }
    },
    onError: (err) => handleMutationError(err, "שגיאה ביצירת עסקה"),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error("יש להזין שם עסקה");
      return;
    }
    if (!form.contactId) {
      toast.error("יש לבחור איש קשר");
      return;
    }
    if (form.value && Number(form.value) < 0) {
      toast.error("סכום לא יכול להיות שלילי");
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
          <label className="block text-[13px] font-medium text-[#323338] mb-1">
            שם עסקה *
          </label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setField("title", e.target.value)}
            className="w-full px-3 py-2 border border-[#E6E9EF] rounded-[4px] text-[13px] focus:outline-none focus:ring-2 focus:ring-[#0073EA]/20 focus:border-[#0073EA]"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[13px] font-medium text-[#323338] mb-1">
              סכום (₪)
            </label>
            <input
              type="number"
              min={0}
              value={form.value}
              onChange={(e) => setField("value", e.target.value)}
              className="w-full px-3 py-2 border border-[#E6E9EF] rounded-[4px] text-[13px] focus:outline-none focus:ring-2 focus:ring-[#0073EA]/20 focus:border-[#0073EA]"
              dir="ltr"
            />
          </div>
          <div>
            <label className="block text-[13px] font-medium text-[#323338] mb-1">
              תאריך סגירה צפוי
            </label>
            <input
              type="date"
              value={form.expectedClose}
              onChange={(e) => setField("expectedClose", e.target.value)}
              className="w-full px-3 py-2 border border-[#E6E9EF] rounded-[4px] text-[13px] focus:outline-none focus:ring-2 focus:ring-[#0073EA]/20 focus:border-[#0073EA]"
              dir="ltr"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[13px] font-medium text-[#323338] mb-1">
              איש קשר *
            </label>
            <select
              value={form.contactId}
              onChange={(e) => setField("contactId", e.target.value)}
              className="w-full px-3 py-2 border border-[#E6E9EF] rounded-[4px] text-[13px] focus:outline-none focus:ring-2 focus:ring-[#0073EA]/20 focus:border-[#0073EA] bg-white"
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
            <label className="block text-[13px] font-medium text-[#323338] mb-1">
              חברה
            </label>
            <select
              value={form.companyId}
              onChange={(e) => setField("companyId", e.target.value)}
              className="w-full px-3 py-2 border border-[#E6E9EF] rounded-[4px] text-[13px] focus:outline-none focus:ring-2 focus:ring-[#0073EA]/20 focus:border-[#0073EA] bg-white"
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
            <label className="block text-[13px] font-medium text-[#323338] mb-1">
              שלב
            </label>
            <select
              value={form.stage}
              onChange={(e) => setField("stage", e.target.value)}
              className="w-full px-3 py-2 border border-[#E6E9EF] rounded-[4px] text-[13px] focus:outline-none focus:ring-2 focus:ring-[#0073EA]/20 focus:border-[#0073EA] bg-white"
            >
              {Object.entries(dealStages).map(([key, val]) => (
                <option key={key} value={key}>
                  {val.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[13px] font-medium text-[#323338] mb-1">
              עדיפות
            </label>
            <select
              value={form.priority}
              onChange={(e) => setField("priority", e.target.value)}
              className="w-full px-3 py-2 border border-[#E6E9EF] rounded-[4px] text-[13px] focus:outline-none focus:ring-2 focus:ring-[#0073EA]/20 focus:border-[#0073EA] bg-white"
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
            className="flex-1 py-2 bg-[#F6F7FB] hover:bg-[#E6E9EF] text-[#676879] font-semibold rounded-[4px] transition-colors text-[13px]"
          >
            ביטול
          </button>
          <button
            type="submit"
            disabled={mutation.isPending || !form.title.trim() || !form.contactId}
            className="flex-1 py-2 bg-[#0073EA] hover:bg-[#0060C2] text-white font-semibold rounded-[4px] transition-colors text-[13px] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {mutation.isPending ? "יוצר..." : "צור עסקה"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
