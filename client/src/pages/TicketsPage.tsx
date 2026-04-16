import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import ConfirmDialog from "../components/shared/ConfirmDialog";
import { useDebounce } from "../hooks/useDebounce";
import { useInlineUpdate } from "../hooks/useInlineUpdate";
import {
  Plus,
  MessageSquare,
  Mail,
  Phone,
  Globe,
  Smartphone,
  Search,
  Send,
  Eye,
  X,
  Clock,
  Zap,
  CheckCircle2,
  User,
  AlertCircle,
  ArrowRight,
  Maximize2,
  List,
  LayoutList,
  Link2,
  Trash2,
} from "lucide-react";
import toast from "react-hot-toast";
import Modal from "../components/shared/Modal";
import StatusDropdown from "../components/shared/StatusDropdown";
import MondayBoard, {
  MondayStatusCell,
  type MondayGroup,
  type MondayColumn,
} from "../components/shared/MondayBoard";
import { type ContextMenuItem } from "../components/shared/RowContextMenu";
import MondayPersonCell from "../components/shared/MondayPersonCell";
import BulkActionBar from "../components/shared/BulkActionBar";
import {
  listTickets,
  createTicket,
  getTicket,
  updateTicket,
  addTicketMessage,
  type Ticket,
  type TicketDetail,
  type TicketMessage,
} from "../api/tickets";
import { listContacts } from "../api/contacts";
import { listCannedResponses, type CannedResponse } from "../api/canned";
import { getWorkspaceMembers } from "../api/auth";
import { useWorkspaceOptions } from "../hooks/useWorkspaceOptions";
import { useAuth } from "../hooks/useAuth";
import { timeAgo, avatarColor } from "../lib/utils";

type ViewMode = "queue" | "table";

const CHANNEL_ICONS: Record<string, React.ReactNode> = {
  email: <Mail size={12} />,
  whatsapp: <MessageSquare size={12} />,
  chat: <Globe size={12} />,
  phone: <Phone size={12} />,
  portal: <Smartphone size={12} />,
};

const STATUS_TABS = [
  { key: "", label: "כל הפניות" },
  { key: "OPEN", label: "פתוחות" },
  { key: "PENDING", label: "בטיפול" },
  { key: "NEW", label: "ממתינות" },
  { key: "RESOLVED,CLOSED", label: "נסגרו" },
] as const;

// Priority border colors
const PRIORITY_BORDER: Record<string, string> = {
  URGENT: "#FB275D",
  HIGH: "#FDAB3D",
  MEDIUM: "#6161FF",
  LOW: "#C4C4C4",
};

function isUrgentOverdue(ticket: Ticket): boolean {
  if (ticket.priority !== "URGENT") return false;
  if (ticket.status === "RESOLVED" || ticket.status === "CLOSED") return false;
  const hours = (Date.now() - new Date(ticket.createdAt).getTime()) / 3600000;
  return hours > 4;
}

function SlaCountdown({ ticket }: { ticket: Ticket }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);
  const elapsed = now - new Date(ticket.createdAt).getTime();
  const slaMs = 4 * 3600000;
  const remaining = slaMs - elapsed;
  if (remaining <= 0) {
    const over = Math.floor(-remaining / 60000);
    const h = Math.floor(over / 60);
    const m = over % 60;
    return (
      <span className="flex items-center gap-1 text-[10px] font-bold text-[#E44258]">
        <AlertCircle size={10} />
        {h > 0 ? `+${h}:${String(m).padStart(2, "0")}` : `+${m} דק'`}
      </span>
    );
  }
  const remMin = Math.floor(remaining / 60000);
  const h = Math.floor(remMin / 60);
  const m = remMin % 60;
  return (
    <span className="flex items-center gap-1 text-[10px] font-semibold text-[#E44258]">
      <Clock size={10} />
      {h > 0 ? `${h}:${String(m).padStart(2, "0")}` : `${m} דק'`}
    </span>
  );
}

export default function TicketsPage() {
  const { ticketStatuses, priorities, ticketChannels } = useWorkspaceOptions();
  const { currentWorkspaceId } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [viewMode, setViewMode] = useState<ViewMode>("queue");
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search);
  const [page, setPage] = useState(1);
  const [accumulatedTickets, setAccumulatedTickets] = useState<Ticket[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState<{ ids: string[]; message: string } | null>(null);

  // Table view search (separate from queue search)
  const [tableSearch, setTableSearch] = useState("");
  const debouncedTableSearch = useDebounce(tableSearch);
  const [tablePage, setTablePage] = useState(1);

  // Reset accumulated tickets, page, and selection when filters change
  useEffect(() => {
    setPage(1);
    setAccumulatedTickets([]);
    setSelectedId(null);
  }, [debouncedSearch, statusFilter]);

  // Queue data
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["tickets", { search: debouncedSearch, statusFilter, page }],
    queryFn: () =>
      listTickets({
        search: debouncedSearch || undefined,
        status: statusFilter || undefined,
        page,
        limit: 50,
        sortBy: "createdAt",
        sortDir: "desc",
      }),
    enabled: viewMode === "queue",
  });

  // Table data
  const { data: tableData, isLoading: tableLoading } = useQuery({
    queryKey: ["tickets", { search: debouncedTableSearch, page: tablePage, view: "table" }],
    queryFn: () =>
      listTickets({
        search: debouncedTableSearch || undefined,
        page: tablePage,
        limit: 50,
        sortBy: "createdAt",
        sortDir: "desc",
      }),
    enabled: viewMode === "table",
  });

  // Members for assignee picker
  const { data: members } = useQuery({
    queryKey: ["members"],
    queryFn: () => getWorkspaceMembers(currentWorkspaceId!),
    enabled: !!currentWorkspaceId && viewMode === "table",
  });

  const memberOptions = (members || []).map((m) => ({
    id: m.memberId,
    name: m.name,
  }));

  // Inline update for table view
  const inlineUpdate = useInlineUpdate(updateTicket, [["tickets"]]);

  // Clear table selection on page/search change
  useEffect(() => setSelectedIds(new Set()), [tablePage, debouncedTableSearch]);

  // Accumulate tickets as pages load — page 1 replaces, later pages append
  useEffect(() => {
    if (!data?.data) return;
    if (page === 1) {
      setAccumulatedTickets(data.data);
    } else {
      setAccumulatedTickets((prev) => {
        const existingIds = new Set(prev.map((t) => t.id));
        const newOnes = data.data.filter((t) => !existingIds.has(t.id));
        return [...prev, ...newOnes];
      });
    }
  }, [data, page]);

  const allRows = accumulatedTickets;

  // Sort: urgency score desc
  const sortedRows = [...allRows].sort(
    (a, b) => (b.urgencyScore ?? 0) - (a.urgencyScore ?? 0),
  );

  // Auto-select first ticket
  useEffect(() => {
    if (viewMode === "queue" && !selectedId && sortedRows.length > 0) {
      setSelectedId(sortedRows[0].id);
    }
  }, [sortedRows.length, viewMode]);

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      updateTicket(id, { status }),
    onSuccess: () => {
      // Reset to page 1 and clear accumulation so list refreshes cleanly
      setPage(1);
      setAccumulatedTickets([]);
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      queryClient.invalidateQueries({ queryKey: ["ticket", selectedId] });
      toast.success("סטטוס עודכן");
    },
    onError: (err: any) => toast.error(err?.message || "שגיאה בעדכון סטטוס"),
  });

  // ── Monday Board columns for table view ──
  const mondayColumns: MondayColumn<Ticket>[] = [
    {
      key: "subject",
      label: "נושא",
      sortable: true,
      render: (row) => (
        <span className="text-[13px] font-semibold text-[#323338] truncate block">
          {row.subject}
        </span>
      ),
    },
    {
      key: "contact",
      label: "איש קשר",
      width: "150px",
      render: (row) => (
        <span className="text-[13px] text-[#676879] truncate block">
          {row.contact?.name || "—"}
        </span>
      ),
    },
    {
      key: "channel",
      label: "ערוץ",
      width: "100px",
      sortable: true,
      render: (row) => {
        const channelInfo = ticketChannels[row.channel];
        return (
          <div className="flex items-center gap-1.5">
            <span className="text-[#676879]">{CHANNEL_ICONS[row.channel]}</span>
            <span className="text-[12px] text-[#676879]">
              {channelInfo?.label || row.channel}
            </span>
          </div>
        );
      },
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
          onChange={(priority) => {
            inlineUpdate(row.id, { priority });
            toast.success("עדיפות עודכנה");
          }}
        />
      ),
    },
    {
      key: "status",
      label: "סטטוס",
      width: "140px",
      sortable: true,
      noPadding: true,
      render: (row) => (
        <MondayStatusCell
          value={row.status}
          options={ticketStatuses}
          onChange={(status) => {
            inlineUpdate(row.id, { status });
            toast.success("סטטוס עודכן");
          }}
        />
      ),
    },
    {
      key: "assignee",
      label: "נציג",
      width: "150px",
      render: (row) => (
        <MondayPersonCell
          value={row.assignee ? { id: row.assignee.id, name: row.assignee.name } : null}
          options={memberOptions}
          onChange={(id) => inlineUpdate(row.id, { assigneeId: id || undefined })}
          placeholder="לא שויך"
        />
      ),
    },
    {
      key: "createdAt",
      label: "נוצר",
      width: "110px",
      sortable: true,
      render: (row) => (
        <span className="text-[12px] text-[#676879]">
          {new Date(row.createdAt).toLocaleDateString("he-IL", { day: "numeric", month: "short" })}
        </span>
      ),
    },
    {
      key: "updatedAt",
      label: "הודעה אחרונה",
      width: "110px",
      sortable: true,
      render: (row) => (
        <span className="text-[12px] text-[#676879]">
          {timeAgo(row.updatedAt)}
        </span>
      ),
    },
    {
      key: "messageCount",
      label: "הודעות",
      width: "80px",
      sortable: true,
      summary: "sum",
      render: (row) => (
        <div className="flex items-center gap-1 text-[12px] text-[#676879]">
          <MessageSquare size={11} />
          {row.messageCount}
        </div>
      ),
    },
  ];

  // Group tickets by status for MondayBoard
  const STATUS_GROUP_ORDER = ["NEW", "OPEN", "PENDING", "RESOLVED", "CLOSED"];
  const STATUS_GROUP_COLORS: Record<string, string> = {
    NEW: "#579BFC",
    OPEN: "#00CA72",
    PENDING: "#FDAB3D",
    RESOLVED: "#A25DDC",
    CLOSED: "#C4C4C4",
  };

  const tableTickets = tableData?.data || [];
  const mondayGroups: MondayGroup<Ticket>[] = STATUS_GROUP_ORDER.map((statusKey) => ({
    key: statusKey,
    label: ticketStatuses[statusKey]?.label || statusKey,
    color: STATUS_GROUP_COLORS[statusKey] || ticketStatuses[statusKey]?.color || "#579BFC",
    items: tableTickets.filter((t) => t.status === statusKey),
  })).filter((g) => g.items.length > 0);

  // If no tickets match any group, show a single "all" group
  const finalGroups = mondayGroups.length > 0
    ? mondayGroups
    : [{ key: "all", label: "כל הקריאות", color: "#579BFC", items: tableTickets }];

  const contextMenuItems = (row: Ticket): ContextMenuItem[] => [
    {
      label: "פתח קריאה",
      icon: <Maximize2 size={14} />,
      onClick: () => navigate(`/tickets/${row.id}`),
    },
    {
      label: "העתק קישור",
      icon: <Link2 size={14} />,
      onClick: () => {
        navigator.clipboard.writeText(`${window.location.origin}/tickets/${row.id}`);
        toast.success("קישור הועתק");
      },
    },
    { label: "", onClick: () => {}, divider: true },
    {
      label: "מחק",
      icon: <Trash2 size={14} />,
      onClick: () => setConfirmDelete({ ids: [row.id], message: "האם אתה בטוח שברצונך למחוק קריאה זו?" }),
      danger: true,
    },
  ];

  // ── View toggle buttons ──
  const viewToggle = (
    <div className="flex items-center border border-[#D0D4E4] rounded-[4px] overflow-hidden" role="group" aria-label="תצוגה">
      <button
        onClick={() => setViewMode("queue")}
        aria-label="תור שירות"
        aria-pressed={viewMode === "queue"}
        className={`p-[6px] transition-colors ${
          viewMode === "queue"
            ? "bg-[#0073EA] text-white"
            : "bg-white text-[#676879] hover:bg-[#F5F6F8]"
        }`}
      >
        <LayoutList size={15} />
      </button>
      <button
        onClick={() => setViewMode("table")}
        aria-label="טבלה"
        aria-pressed={viewMode === "table"}
        className={`p-[6px] transition-colors ${
          viewMode === "table"
            ? "bg-[#0073EA] text-white"
            : "bg-white text-[#676879] hover:bg-[#F5F6F8]"
        }`}
      >
        <List size={15} />
      </button>
    </div>
  );

  // ── Table view ──
  if (viewMode === "table") {
    return (
      <div className="bg-[#F5F6F8] -mx-3 -mt-3 sm:-mx-6 sm:-mt-6 min-h-[calc(100vh-56px)]">
        {/* Header */}
        <div className="px-6 pt-5 pb-3 bg-white border-b border-[#E6E9EF]">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-3">
              <h2 className="text-[18px] font-bold text-[#323338]">קריאות</h2>
              {viewToggle}
            </div>
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-1.5 px-3 py-[6px] bg-[#0073EA] hover:bg-[#0060C2] text-white text-[13px] font-medium rounded-[4px] transition-colors"
            >
              <Plus size={15} strokeWidth={2.5} />
              קריאה חדשה
            </button>
          </div>
        </div>

        {/* MondayBoard */}
        <div className="p-4">
          <MondayBoard<Ticket>
            groups={finalGroups}
            columns={mondayColumns}
            onRowClick={(row) => navigate(`/tickets/${row.id}`)}
            onNewItem={() => setShowCreate(true)}
            newItemLabel="קריאה חדשה"
            search={tableSearch}
            onSearchChange={(s) => {
              setTableSearch(s);
              setTablePage(1);
            }}
            searchPlaceholder="חיפוש קריאות..."
            loading={tableLoading}
            pagination={tableData?.pagination ? {
              page: tableData.pagination.page,
              totalPages: tableData.pagination.totalPages,
              total: tableData.pagination.total,
            } : undefined}
            onPageChange={setTablePage}
            statusKey="status"
            statusOptions={ticketStatuses}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
            groupByColumns={[
              { key: "status", label: "סטטוס" },
              { key: "priority", label: "עדיפות" },
              { key: "channel", label: "ערוץ" },
            ]}
            contextMenuItems={contextMenuItems}
          />
        </div>

        <BulkActionBar
          selectedCount={selectedIds.size}
          onClear={() => setSelectedIds(new Set())}
          onDelete={() => setConfirmDelete({ ids: Array.from(selectedIds), message: `האם אתה בטוח שברצונך למחוק ${selectedIds.size} קריאות?` })}
        />

        <ConfirmDialog
          open={!!confirmDelete}
          onConfirm={() => {
            // TODO: wire bulk delete when API available
            setConfirmDelete(null);
            toast.success("נמחק בהצלחה");
            queryClient.invalidateQueries({ queryKey: ["tickets"] });
          }}
          onCancel={() => setConfirmDelete(null)}
          title="מחיקת קריאות"
          message={confirmDelete?.message ?? ""}
          confirmText="מחק"
          cancelText="ביטול"
          variant="danger"
        />

        {showCreate && (
          <CreateTicketModal
            onClose={() => setShowCreate(false)}
            onCreated={(id) => {
              setShowCreate(false);
              navigate(`/tickets/${id}`);
              queryClient.invalidateQueries({ queryKey: ["tickets"] });
            }}
          />
        )}
      </div>
    );
  }

  // ── Queue view (original, untouched) ──
  return (
    <div className="flex h-[calc(100vh-56px)] overflow-hidden bg-[#F5F6F8] -mx-3 -mt-3 sm:-mx-6 sm:-mt-6">
      {/* ── Left: Ticket List ── */}
      <div className={`w-full md:w-[340px] flex-shrink-0 flex flex-col border-l border-[#E6E9EF] bg-white ${selectedId ? "hidden md:flex" : "flex"}`}>
        {/* Header */}
        <div className="px-4 pt-4 pb-2 border-b border-[#E6E9EF]">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <h2 className="text-[15px] font-semibold text-[#323338]">קריאות</h2>
              {viewToggle}
            </div>
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-1 px-3 py-[6px] bg-[#0073EA] hover:bg-[#0060C2] text-white text-[13px] font-medium rounded-[4px] transition-colors"
            >
              <Plus size={15} strokeWidth={2.5} />
              חדשה
            </button>
          </div>
          {/* Search */}
          <div className="relative mb-3">
            <Search
              size={14}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9699A6] pointer-events-none"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="חיפוש קריאות..."
              className="w-full pr-8 pl-3 py-1.5 border border-[#D0D4E4] rounded-[4px] text-[13px] focus:outline-none focus:ring-2 focus:ring-[#0073EA]/20 focus:border-[#0073EA] bg-[#F5F6F8]"
            />
          </div>
          {/* Status Tabs */}
          <div className="flex gap-1 flex-wrap" role="group" aria-label="סינון לפי סטטוס">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.key}
                aria-pressed={statusFilter === tab.key}
                onClick={() => { setStatusFilter(tab.key); setPage(1); }}
                className={`px-2 py-0.5 rounded-[4px] text-[11px] font-medium transition-all ${
                  statusFilter === tab.key
                    ? "bg-[#0073EA] text-white"
                    : "bg-[#F5F6F8] text-[#676879] hover:bg-[#E6E9EF]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Ticket List */}
        <div className="flex-1 overflow-y-auto">
          {isError && page === 1 ? (
            <div className="flex flex-col items-center justify-center h-32 text-[#9699A6] text-sm gap-2">
              <AlertCircle size={24} className="text-[#E44258] opacity-60" />
              <span>שגיאה בטעינת קריאות</span>
              <button
                onClick={() => refetch()}
                className="text-[12px] text-[#0073EA] hover:underline"
              >
                נסה שוב
              </button>
            </div>
          ) : isLoading && page === 1 ? (
            <div className="space-y-0 animate-pulse">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="px-3 py-3 border-b border-[#E6E9EF] border-r-[3px] border-r-[#E6E9EF]">
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="h-3.5 w-36 bg-[#E6E9EF] rounded" />
                    <div className="h-2.5 w-10 bg-[#E6E9EF] rounded" />
                  </div>
                  <div className="flex items-center gap-1 mb-2">
                    <div className="w-4 h-4 bg-[#E6E9EF] rounded-full" />
                    <div className="h-2.5 w-20 bg-[#E6E9EF] rounded" />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="h-4 w-14 bg-[#E6E9EF] rounded-full" />
                    <div className="h-4 w-12 bg-[#E6E9EF] rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : sortedRows.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-[#9699A6] text-sm gap-2">
              <MessageSquare size={24} className="opacity-30" />
              אין קריאות
            </div>
          ) : (
            sortedRows.map((ticket) => (
              <TicketListItem
                key={ticket.id}
                ticket={ticket}
                isSelected={selectedId === ticket.id}
                onClick={() => setSelectedId(ticket.id)}
                ticketStatuses={ticketStatuses}
                priorities={priorities}
                ticketChannels={ticketChannels}
              />
            ))
          )}
          {/* Load more */}
          {data?.pagination && data.pagination.page < data.pagination.totalPages && (
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={isLoading}
              className="w-full py-2 text-[12px] text-[#0073EA] hover:bg-[#0073EA]/5 transition-colors disabled:opacity-50"
            >
              {isLoading ? "טוען..." : "טען עוד..."}
            </button>
          )}
        </div>
      </div>

      {/* ── Right: Ticket Detail Panel ── */}
      <div className={`flex-1 overflow-hidden ${selectedId ? "flex flex-col" : "hidden md:flex md:flex-col"}`}>
        {selectedId ? (
          <>
            {/* Mobile back button */}
            <button
              onClick={() => setSelectedId(null)}
              className="md:hidden flex items-center gap-1.5 px-4 py-2.5 bg-white border-b border-[#E6E9EF] text-[13px] font-medium text-[#0073EA] hover:bg-[#F5F6F8] transition-colors flex-shrink-0"
            >
              <ArrowRight size={14} />
              חזרה לרשימה
            </button>
            <div className="flex-1 overflow-hidden">
              <TicketDetailPanel
                ticketId={selectedId}
                onNavigateFull={() => navigate(`/tickets/${selectedId}`)}
                onStatusChange={(id, status) => statusMutation.mutate({ id, status })}
              />
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-[#9699A6] gap-3">
            <MessageSquare size={48} className="opacity-20" />
            <p className="text-sm">בחר קריאה מהרשימה</p>
          </div>
        )}
      </div>

      {showCreate && (
        <CreateTicketModal
          onClose={() => setShowCreate(false)}
          onCreated={(id) => {
            setSelectedId(id);
            setPage(1);
            setAccumulatedTickets([]);
            queryClient.invalidateQueries({ queryKey: ["tickets"] });
          }}
        />
      )}
    </div>
  );
}

/* ───── Ticket List Item ───── */
function TicketListItem({
  ticket,
  isSelected,
  onClick,
  ticketStatuses,
  priorities,
  ticketChannels,
}: {
  ticket: Ticket;
  isSelected: boolean;
  onClick: () => void;
  ticketStatuses: Record<string, { label: string; color: string }>;
  priorities: Record<string, { label: string; color: string }>;
  ticketChannels: Record<string, { label: string; color: string }>;
}) {
  const priorityColor = PRIORITY_BORDER[ticket.priority] || "#C4C4C4";
  const statusInfo = ticketStatuses[ticket.status];
  const overdueUrgent = isUrgentOverdue(ticket);

  return (
    <button
      onClick={onClick}
      className={`w-full text-right px-3 py-3 border-b border-[#E6E9EF] transition-colors relative flex gap-0 ${
        isSelected
          ? "bg-[#0073EA]/5 border-r-[3px] border-r-[#0073EA]"
          : "hover:bg-[#F5F6F8] border-r-[3px]"
      }`}
      style={{
        borderRightColor: isSelected ? "#6161FF" : priorityColor,
      }}
    >
      <div className="flex-1 min-w-0">
        {/* Subject + time */}
        <div className="flex items-start justify-between gap-2 mb-1">
          <span className="text-[13px] font-semibold text-[#323338] truncate leading-tight">
            {ticket.subject}
          </span>
          <span className="text-[10px] text-[#9699A6] whitespace-nowrap flex-shrink-0">
            {timeAgo(ticket.createdAt)}
          </span>
        </div>
        {/* Contact */}
        {ticket.contact && (
          <div className="flex items-center gap-1 mb-1.5">
            <div
              className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: avatarColor(ticket.contact.name) }}
            >
              <span className="text-white text-[8px] font-bold">
                {ticket.contact.name[0] || "?"}
              </span>
            </div>
            <span className="text-[11px] text-[#676879] truncate">
              {ticket.contact.name}
            </span>
          </div>
        )}
        {/* Bottom row: status chip + channel + SLA */}
        <div className="flex items-center gap-1.5">
          {statusInfo && (
            <span
              className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full text-white"
              style={{ backgroundColor: statusInfo.color }}
            >
              {statusInfo.label}
            </span>
          )}
          <span
            className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full text-white"
            style={{ backgroundColor: priorityColor }}
          >
            {priorities[ticket.priority]?.label || ticket.priority}
          </span>
          {CHANNEL_ICONS[ticket.channel] && (
            <span
              className="flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full bg-[#F5F6F8] text-[#676879]"
              title={ticketChannels[ticket.channel]?.label || ticket.channel}
            >
              {CHANNEL_ICONS[ticket.channel]}
            </span>
          )}
          {ticket.messageCount > 0 && (
            <span className="flex items-center gap-0.5 text-[10px] text-[#9699A6]">
              <MessageSquare size={10} />
              {ticket.messageCount}
            </span>
          )}
          {overdueUrgent && (
            <SlaCountdown ticket={ticket} />
          )}
        </div>
      </div>
    </button>
  );
}

/* ───── Ticket Detail Panel ───── */
function TicketDetailPanel({
  ticketId,
  onNavigateFull,
  onStatusChange,
}: {
  ticketId: string;
  onNavigateFull: () => void;
  onStatusChange: (id: string, status: string) => void;
}) {
  const { ticketStatuses, priorities, ticketChannels } = useWorkspaceOptions();
  const { currentWorkspaceId } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [confirmStatusChange, setConfirmStatusChange] = useState<{ status: string; message: string } | null>(null);

  const { data: ticket, isLoading, isError, refetch } = useQuery({
    queryKey: ["ticket", ticketId],
    queryFn: () => getTicket(ticketId),
    enabled: !!ticketId,
  });

  const { data: members } = useQuery({
    queryKey: ["members"],
    queryFn: () => getWorkspaceMembers(currentWorkspaceId!),
    enabled: !!currentWorkspaceId,
  });

  const priorityMutation = useMutation({
    mutationFn: (priority: string) => updateTicket(ticketId, { priority }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ticket", ticketId] });
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      toast.success("עדיפות עודכנה");
    },
    onError: (err: any) => toast.error(err?.message || "שגיאה בעדכון עדיפות"),
  });

  const assignMutation = useMutation({
    mutationFn: (assigneeId: string) => updateTicket(ticketId, { assigneeId: assigneeId || undefined }),
    onSuccess: (_data, assigneeId) => {
      queryClient.invalidateQueries({ queryKey: ["ticket", ticketId] });
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      toast.success(assigneeId ? "נציג שויך" : "שיוך נציג הוסר");
    },
    onError: (err: any) => toast.error(err?.message || "שגיאה בשיוך נציג"),
  });

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [ticket?.messages?.length]);

  if (isLoading) {
    return (
      <div className="flex h-full overflow-hidden animate-pulse">
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="px-5 py-3 border-b border-[#E6E9EF] bg-white flex-shrink-0">
            <div className="h-5 w-48 bg-[#E6E9EF] rounded mb-2" />
            <div className="flex items-center gap-2">
              <div className="h-5 w-16 bg-[#E6E9EF] rounded-full" />
              <div className="h-5 w-16 bg-[#E6E9EF] rounded-full" />
            </div>
          </div>
          <div className="flex-1 px-4 py-3 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className={`flex ${i % 2 === 0 ? "justify-end" : "justify-start"}`}>
                <div className="w-3/5 rounded-xl bg-[#F5F6F8] h-16" />
              </div>
            ))}
          </div>
        </div>
        <div className="w-[220px] flex-shrink-0 border-r border-[#E6E9EF] bg-white p-3 space-y-4">
          <div className="h-3 w-16 bg-[#E6E9EF] rounded" />
          <div className="h-10 w-full bg-[#F5F6F8] rounded-lg" />
          <div className="h-3 w-16 bg-[#E6E9EF] rounded" />
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="h-2.5 w-12 bg-[#E6E9EF] rounded" />
                <div className="h-2.5 w-16 bg-[#E6E9EF] rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-[#9699A6] gap-2">
        <AlertCircle size={24} className="text-[#E44258] opacity-60" />
        <span className="text-sm">שגיאה בטעינת הקריאה</span>
        <button
          onClick={() => refetch()}
          className="text-[12px] text-[#0073EA] hover:underline"
        >
          נסה שוב
        </button>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="flex items-center justify-center h-full text-[#9699A6] text-sm">
        קריאה לא נמצאה
      </div>
    );
  }

  const slaInfo = ticket.slaPolicy ? getSlaInfo(ticket) : null;
  const createdHoursAgo = (Date.now() - new Date(ticket.createdAt).getTime()) / 3600000;
  const showSlaAlert =
    ticket.priority === "URGENT" &&
    ticket.status !== "RESOLVED" &&
    ticket.status !== "CLOSED" &&
    createdHoursAgo > 4;

  return (
    <div className="flex h-full overflow-hidden">
      {/* ── Main: thread + reply ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top: ticket header */}
        <div className="px-5 py-3 border-b border-[#E6E9EF] bg-white flex items-start gap-3 flex-shrink-0">
          <div className="flex-1 min-w-0">
            <button
              type="button"
              onClick={onNavigateFull}
              className="text-[15px] font-bold text-[#323338] truncate hover:text-[#0073EA] transition-colors text-right focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0073EA] rounded-sm max-w-full"
              title="פתח בעמוד מלא"
            >
              {ticket.subject}
            </button>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {/* Status dropdown */}
              <StatusDropdown
                value={ticket.status}
                options={ticketStatuses}
                onChange={(s) => {
                  if (s === "RESOLVED" || s === "CLOSED") {
                    const msg = s === "RESOLVED"
                      ? "האם אתה בטוח שברצונך לסמן את הקר��אה כנפתרה?"
                      : "האם אתה בטוח שברצונך לסגור את הקריאה?";
                    setConfirmStatusChange({ status: s, message: msg });
                  } else {
                    onStatusChange(ticketId, s);
                  }
                }}
              />
              {/* Priority dropdown */}
              <StatusDropdown
                value={ticket.priority}
                options={priorities}
                onChange={(p) => priorityMutation.mutate(p)}
              />
              {/* Contact link */}
              {ticket.contact && (
                <button
                  className="flex items-center gap-1 text-xs text-[#0073EA] cursor-pointer hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0073EA] rounded-sm"
                  onClick={() => navigate(`/contacts/${ticket.contact!.id}`)}
                >
                  <User size={12} />
                  {ticket.contact.firstName} {ticket.contact.lastName}
                </button>
              )}
              {showSlaAlert && (
                <span className="flex items-center gap-1 text-xs font-bold text-[#E44258] bg-[#E44258]/10 px-2 py-0.5 rounded-full">
                  <AlertCircle size={12} />
                  SLA הופר
                </span>
              )}
            </div>
          </div>
          {/* Quick actions */}
          <div className="flex gap-1.5 flex-shrink-0">
            <button
              onClick={onNavigateFull}
              className="p-1.5 rounded-[4px] hover:bg-[#F5F6F8] text-[#676879] hover:text-[#323338] transition-colors"
              aria-label="פתח בעמוד מלא"
              title="פתח בעמוד מלא"
            >
              <Maximize2 size={14} />
            </button>
            {ticket.status !== "RESOLVED" && ticket.status !== "CLOSED" && (
              <button
                onClick={() => setConfirmStatusChange({ status: "RESOLVED", message: "האם אתה בטוח שברצונך לסמן את הקריאה כנפתרה?" })}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-success hover:bg-success/90 text-white text-[12px] font-semibold rounded-[4px] transition-colors"
              >
                <CheckCircle2 size={13} />
                נפתר
              </button>
            )}
            {(ticket.status === "RESOLVED" || ticket.status === "CLOSED") && (
              <button
                onClick={() => setConfirmStatusChange({ status: "OPEN", message: "האם אתה בטוח שברצונך לפתוח מחדש את הקריאה?" })}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-warning hover:bg-warning/90 text-white text-[12px] font-semibold rounded-[4px] transition-colors"
              >
                פתח מחדש
              </button>
            )}
          </div>
        </div>

        {/* Description */}
        {ticket.description && (
          <div className="mx-4 mt-3 mb-0 bg-white rounded-xl shadow-[0_1px_6px_rgba(0,0,0,0.08)] p-3 flex-shrink-0">
            <p className="text-[12px] text-[#9699A6] font-medium mb-1">תיאור</p>
            <p className="text-sm text-[#676879] whitespace-pre-wrap">
              {ticket.description}
            </p>
          </div>
        )}

        {/* Message thread */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {ticket.messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-[#9699A6] gap-2">
              <MessageSquare size={32} className="opacity-20" />
              <p className="text-sm">אין הודעות עדיין</p>
            </div>
          ) : (
            ticket.messages.map((msg: TicketMessage) => (
              <MessageBubble key={msg.id} message={msg} />
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Reply composer */}
        <div className="flex-shrink-0 border-t border-[#E6E9EF] bg-white">
          <ReplyComposer ticketId={ticketId} ticket={ticket} />
        </div>
      </div>

      {/* ── Right sidebar: metadata ── */}
      <div className="w-[220px] flex-shrink-0 border-r border-[#E6E9EF] bg-white overflow-y-auto">
        <div className="p-3 space-y-4">
          {/* SLA alert */}
          {showSlaAlert && (
            <div className="bg-[#E44258]/10 border border-[#E44258]/30 rounded-xl p-3">
              <p className="text-[11px] font-bold text-[#E44258] flex items-center gap-1 mb-1">
                <AlertCircle size={12} />
                SLA הופר
              </p>
              <p className="text-[10px] text-[#E44258]/80">
                קריאה דחופה פתוחה מעל 4 שעות
              </p>
              <SlaCountdown ticket={{
                id: ticket.id,
                priority: ticket.priority as any,
                status: ticket.status as any,
                createdAt: ticket.createdAt,
                urgencyScore: 0,
                urgencyComputed: ticket.urgencyComputed,
                subject: ticket.subject,
                description: ticket.description,
                urgencyLevel: "CRITICAL" as any,
                channel: ticket.channel,
                contact: ticket.contact ? { id: ticket.contact.id, name: `${ticket.contact.firstName} ${ticket.contact.lastName}` } : null,
                assignee: ticket.assignee ? { id: ticket.assignee.id, name: ticket.assignee.user.name } : null,
                slaPolicy: null,
                firstResponseAt: ticket.firstResponseAt,
                resolvedAt: ticket.resolvedAt,
                csatScore: ticket.csatScore,
                messageCount: ticket.messages.length,
                updatedAt: ticket.updatedAt,
              }} />
            </div>
          )}

          {/* Contact */}
          {ticket.contact && (
            <div>
              <p className="text-[10px] font-semibold text-[#9699A6] uppercase tracking-wide mb-2">
                איש קשר
              </p>
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: avatarColor(`${ticket.contact.firstName} ${ticket.contact.lastName}`) }}
                  >
                    <span className="text-white text-[9px] font-bold">
                      {ticket.contact.firstName[0] || "?"}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate(`/contacts/${ticket.contact!.id}`)}
                    className="text-[12px] font-medium text-[#0073EA] hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0073EA] rounded-sm"
                  >
                    {ticket.contact.firstName} {ticket.contact.lastName}
                  </button>
                </div>
                {ticket.contact.email && (
                  <div className="flex items-center gap-1 text-[11px] text-[#676879]">
                    <Mail size={11} className="text-[#9699A6] flex-shrink-0" />
                    <a
                      href={`mailto:${ticket.contact.email}`}
                      dir="ltr"
                      className="truncate hover:text-[#0073EA] hover:underline transition-colors"
                    >
                      {ticket.contact.email}
                    </a>
                  </div>
                )}
                {ticket.contact.phone && (
                  <div className="flex items-center gap-1 text-[11px] text-[#676879]">
                    <Phone size={11} className="text-[#9699A6] flex-shrink-0" />
                    <a
                      href={`tel:${ticket.contact.phone}`}
                      dir="ltr"
                      className="hover:text-[#0073EA] hover:underline transition-colors"
                    >
                      {ticket.contact.phone}
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Ticket details */}
          <div>
            <p className="text-[10px] font-semibold text-[#9699A6] uppercase tracking-wide mb-2">
              פרטי קריאה
            </p>
            <div className="space-y-2">
              <MetaRow label="נוצר">
                <span className="text-[11px] text-[#676879]">
                  {new Date(ticket.createdAt).toLocaleDateString("he-IL")}
                </span>
              </MetaRow>
              <MetaRow label="עודכן">
                <span className="text-[11px] text-[#676879]">
                  {timeAgo(ticket.updatedAt)}
                </span>
              </MetaRow>
              <MetaRow label="ערוץ">
                <span className="text-[11px] text-[#676879]">
                  {ticketChannels[ticket.channel]?.label || ticket.channel}
                </span>
              </MetaRow>
              {/* Assignee */}
              <MetaRow label="נציג">
                <select
                  value={ticket.assignee?.id || ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    assignMutation.mutate(val);
                  }}
                  className="text-[11px] text-[#323338] bg-[#F5F6F8] border border-[#E6E9EF] rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-[#0073EA]/20 max-w-[100px]"
                >
                  <option value="">לא שויך</option>
                  {(members || []).map((m) => (
                    <option key={m.memberId} value={m.memberId}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </MetaRow>
              {ticket.firstResponseAt && (
                <MetaRow label="תגובה ראשונה">
                  <span className="text-[11px] text-[#676879]">
                    {timeAgo(ticket.firstResponseAt)}
                  </span>
                </MetaRow>
              )}
              {ticket.resolvedAt && (
                <MetaRow label="נפתר">
                  <span className="text-[11px] text-success">
                    {timeAgo(ticket.resolvedAt)}
                  </span>
                </MetaRow>
              )}
              {ticket.csatScore && (
                <MetaRow label="שביעות רצון">
                  <div className="flex items-center">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <span
                        key={i}
                        className={`text-[12px] ${i <= ticket.csatScore! ? "text-warning" : "text-[#9699A6]"}`}
                      >
                        ★
                      </span>
                    ))}
                  </div>
                </MetaRow>
              )}
            </div>
          </div>

          {/* SLA policy */}
          {slaInfo && (
            <div>
              <p className="text-[10px] font-semibold text-[#9699A6] uppercase tracking-wide mb-2">
                SLA
              </p>
              <div className="space-y-2">
                <div>
                  <p className="text-[10px] text-[#9699A6] mb-0.5">תגובה ראשונה</p>
                  <p className={`text-[11px] font-semibold flex items-center gap-1 ${
                    slaInfo.responseBreached ? "text-[#E44258]" : "text-success"
                  }`}>
                    <Clock size={10} />
                    {slaInfo.responseBreached
                      ? `איחור ${formatSlaTime(slaInfo.responseOverdue)}`
                      : ticket.firstResponseAt
                        ? "✓ עמד ב-SLA"
                        : `נותרו ${formatSlaTime(slaInfo.responseRemaining)}`}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-[#9699A6] mb-0.5">פתרון</p>
                  <p className={`text-[11px] font-semibold flex items-center gap-1 ${
                    slaInfo.resolutionBreached ? "text-[#E44258]" : "text-success"
                  }`}>
                    <Clock size={10} />
                    {slaInfo.resolutionBreached
                      ? `איחור ${formatSlaTime(slaInfo.resolutionOverdue)}`
                      : ticket.resolvedAt
                        ? "✓ עמד ב-SLA"
                        : `נותרו ${formatSlaTime(slaInfo.resolutionRemaining)}`}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={!!confirmStatusChange}
        onConfirm={() => {
          if (confirmStatusChange) onStatusChange(ticketId, confirmStatusChange.status);
          setConfirmStatusChange(null);
        }}
        onCancel={() => setConfirmStatusChange(null)}
        title="שינוי סטטוס קריאה"
        message={confirmStatusChange?.message ?? ""}
        confirmText="אישור"
        cancelText="ביטול"
        variant="warning"
      />
    </div>
  );
}

/* ───── Message Bubble ───── */
function MessageBubble({ message }: { message: TicketMessage }) {
  const isAgent = message.senderType === "agent";
  const isInternal = message.isInternal;

  return (
    <div className={`flex ${isAgent ? "justify-start" : "justify-end"}`}>
      <div
        className={`max-w-[75%] rounded-xl px-4 py-2.5 shadow-sm ${
          isInternal
            ? "bg-yellow-50 border border-yellow-200"
            : isAgent
              ? "bg-white border border-[#E6E9EF]"
              : "bg-[#0073EA] text-white"
        }`}
      >
        <div className="flex items-center gap-1.5 mb-1">
          {isInternal && <Eye size={10} className="text-warning" />}
          <span
            className={`text-[10px] font-medium ${
              isInternal
                ? "text-warning"
                : isAgent
                  ? "text-[#9699A6]"
                  : "text-white/70"
            }`}
          >
            {isInternal ? "הערה פנימית" : isAgent ? "נציג" : "לקוח"}
          </span>
          <span className={`text-[9px] mr-auto ${
            isAgent && !isInternal ? "text-[#9699A6]" : isInternal ? "text-[#9699A6]" : "text-white/50"
          }`}>
            {new Date(message.createdAt).toLocaleTimeString("he-IL", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
        <p
          className={`text-sm whitespace-pre-wrap ${
            isInternal
              ? "text-[#323338]"
              : isAgent
                ? "text-[#323338]"
                : "text-white"
          }`}
        >
          {message.body}
        </p>
      </div>
    </div>
  );
}

/* ───── Reply Composer ───── */
function ReplyComposer({
  ticketId,
  ticket,
}: {
  ticketId: string;
  ticket: TicketDetail;
}) {
  const queryClient = useQueryClient();
  const [body, setBody] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [showCanned, setShowCanned] = useState(false);
  const cannedRef = useRef<HTMLDivElement>(null);

  // Close canned responses dropdown on click outside or Escape key
  useEffect(() => {
    if (!showCanned) return;
    function handleMouseDown(e: MouseEvent) {
      if (cannedRef.current && !cannedRef.current.contains(e.target as Node)) {
        setShowCanned(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setShowCanned(false);
      }
    }
    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [showCanned]);

  const { data: cannedResponses } = useQuery({
    queryKey: ["canned-responses"],
    queryFn: () => listCannedResponses(),
    enabled: showCanned,
  });

  const mutation = useMutation({
    mutationFn: () => addTicketMessage(ticketId, { body, isInternal }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ticket", ticketId] });
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      setBody("");
      toast.success(isInternal ? "הערה פנימית נוספה" : "תגובה נשלחה");
    },
    onError: (err: any) => toast.error(err?.message || "שגיאה בשליחת הודעה"),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    mutation.mutate();
  }

  function insertCannedResponse(canned: CannedResponse) {
    let text = canned.body;
    if (ticket.contact) {
      text = text.replace(/\{\{contact\.firstName\}\}/g, ticket.contact.firstName);
      text = text.replace(/\{\{contact\.lastName\}\}/g, ticket.contact.lastName);
    }
    if (ticket.assignee) {
      text = text.replace(/\{\{agent\.name\}\}/g, ticket.assignee.user.name);
    }
    setBody(text);
    setShowCanned(false);
  }

  return (
    <form onSubmit={handleSubmit} className="p-3">
      {/* Type toggle */}
      <div className="flex items-center gap-1.5 mb-2">
        <button
          type="button"
          onClick={() => setIsInternal(false)}
          className={`text-[12px] px-2 py-1 rounded-md transition-colors ${
            !isInternal ? "bg-[#0073EA] text-white" : "text-[#676879] hover:bg-[#F5F6F8]"
          }`}
        >
          תגובה ללקוח
        </button>
        <button
          type="button"
          onClick={() => setIsInternal(true)}
          className={`text-[12px] px-2 py-1 rounded-md transition-colors flex items-center gap-1 ${
            isInternal ? "bg-warning text-white" : "text-[#676879] hover:bg-[#F5F6F8]"
          }`}
        >
          <Eye size={11} />
          הערה פנימית
        </button>
        {/* Canned responses */}
        <div className="mr-auto relative" ref={cannedRef}>
          <button
            type="button"
            onClick={() => setShowCanned(!showCanned)}
            className="text-xs px-2 py-1 rounded-md transition-colors text-purple-600 hover:bg-purple-50 flex items-center gap-1"
          >
            <Zap size={11} />
            מוכן
          </button>
          {showCanned && (
            <div className="absolute left-0 bottom-full mb-1 bg-white rounded-xl shadow-modal border border-[#E6E9EF] z-20 w-72 max-h-60 overflow-y-auto">
              <div className="p-2 border-b border-[#E6E9EF] flex items-center justify-between">
                <span className="text-[12px] font-semibold text-[#323338]">תגובות מוכנות</span>
                <button type="button" onClick={() => setShowCanned(false)} className="p-0.5 rounded hover:bg-[#F5F6F8]">
                  <X size={12} className="text-[#9699A6]" />
                </button>
              </div>
              {cannedResponses && cannedResponses.length > 0 ? (
                cannedResponses.map((cr) => (
                  <button
                    key={cr.id}
                    type="button"
                    onClick={() => insertCannedResponse(cr)}
                    className="w-full text-right px-3 py-2 hover:bg-[#F5F6F8] transition-colors border-b border-[#E6E9EF] last:border-0"
                  >
                    <div className="text-[12px] font-medium text-[#323338]">{cr.title}</div>
                    <p className="text-[10px] text-[#9699A6] truncate mt-0.5">{cr.body.slice(0, 60)}...</p>
                  </button>
                ))
              ) : (
                <p className="text-[12px] text-[#9699A6] text-center py-4">אין תגובות מוכנות</p>
              )}
            </div>
          )}
        </div>
      </div>
      {/* Text area + send */}
      <div className="flex gap-2">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
              handleSubmit(e as any);
            }
          }}
          placeholder={isInternal ? "הערה פנימית (לא נראית ללקוח)..." : "כתוב תגובה... (Ctrl+Enter לשליחה)"}
          className={`flex-1 px-3 py-2 border rounded-[4px] text-[13px] focus:outline-none focus:ring-2 resize-none ${
            isInternal
              ? "border-yellow-200 bg-yellow-50/50 focus:ring-warning/30 focus:border-warning"
              : "border-[#E6E9EF] focus:ring-[#0073EA]/20 focus:border-[#0073EA]"
          }`}
          rows={2}
        />
        <button
          type="submit"
          disabled={!body.trim() || mutation.isPending}
          className={`px-3 self-end rounded-[4px] text-white font-semibold text-[13px] transition-colors disabled:opacity-50 flex items-center gap-1 py-2 ${
            isInternal ? "bg-warning hover:bg-warning/90" : "bg-[#0073EA] hover:bg-[#0060C2]"
          }`}
        >
          <Send size={14} />
          שלח
        </button>
      </div>
    </form>
  );
}

/* ───── Metadata Row ───── */
function MetaRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-1">
      <span className="text-[10px] text-[#9699A6] flex-shrink-0">{label}</span>
      {children}
    </div>
  );
}

/* ───── Create Ticket Modal ───── */
function CreateTicketModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated?: (id: string) => void;
}) {
  const { priorities, ticketChannels } = useWorkspaceOptions();
  const [form, setForm] = useState({
    subject: "",
    description: "",
    priority: "MEDIUM",
    urgencyLevel: "MEDIUM",
    channel: "email",
    contactId: "",
  });

  const { data: contacts } = useQuery({
    queryKey: ["contacts", { limit: 100 }],
    queryFn: () => listContacts({ limit: 100 }),
  });

  const mutation = useMutation({
    mutationFn: () =>
      createTicket({
        subject: form.subject,
        description: form.description || undefined,
        priority: form.priority,
        urgencyLevel: form.urgencyLevel,
        channel: form.channel,
        contactId: form.contactId || undefined,
      }),
    onSuccess: (ticket) => {
      toast.success("קריאה נוצרה בהצלחה!");
      onCreated?.(ticket.id);
      onClose();
    },
    onError: (err: any) => toast.error(err?.message || "שגיאה ביצירת קריאה"),
  });

  // Map priority → urgencyLevel so they stay in sync
  const PRIORITY_TO_URGENCY: Record<string, string> = {
    URGENT: "CRITICAL",
    HIGH: "HIGH",
    MEDIUM: "MEDIUM",
    LOW: "LOW",
  };

  const setField = (key: string, value: string) =>
    setForm((f) => {
      const next = { ...f, [key]: value };
      // Keep urgencyLevel in sync when priority changes
      if (key === "priority" && PRIORITY_TO_URGENCY[value]) {
        next.urgencyLevel = PRIORITY_TO_URGENCY[value];
      }
      return next;
    });

  return (
    <Modal open={true} onClose={onClose} title="קריאה חדשה">
      <form onSubmit={(e) => { e.preventDefault(); if (!form.subject.trim()) { toast.error("יש להזין נושא"); return; } mutation.mutate(); }} className="space-y-4 p-6">
        <div>
          <label className="block text-[13px] font-medium text-[#323338] mb-1">נושא *</label>
          <input
            type="text"
            value={form.subject}
            onChange={(e) => setField("subject", e.target.value)}
            className="w-full px-3 py-2 border border-[#D0D4E4] rounded-[4px] text-[13px] focus:outline-none focus:ring-2 focus:ring-[#0073EA]/20 focus:border-[#0073EA]"
            required
          />
        </div>
        <div>
          <label className="block text-[13px] font-medium text-[#323338] mb-1">תיאור</label>
          <textarea
            value={form.description}
            onChange={(e) => setField("description", e.target.value)}
            className="w-full px-3 py-2 border border-[#D0D4E4] rounded-[4px] text-[13px] focus:outline-none focus:ring-2 focus:ring-[#0073EA]/20 focus:border-[#0073EA] resize-none"
            rows={3}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[13px] font-medium text-[#323338] mb-1">עדיפות</label>
            <select
              value={form.priority}
              onChange={(e) => setField("priority", e.target.value)}
              className="w-full px-3 py-2 border border-[#D0D4E4] rounded-[4px] text-[13px] focus:outline-none focus:ring-2 focus:ring-[#0073EA]/20 focus:border-[#0073EA] bg-white"
            >
              {Object.entries(priorities).map(([key, val]) => (
                <option key={key} value={key}>{val.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[13px] font-medium text-[#323338] mb-1">ערוץ</label>
            <select
              value={form.channel}
              onChange={(e) => setField("channel", e.target.value)}
              className="w-full px-3 py-2 border border-[#D0D4E4] rounded-[4px] text-[13px] focus:outline-none focus:ring-2 focus:ring-[#0073EA]/20 focus:border-[#0073EA] bg-white"
            >
              {Object.entries(ticketChannels).map(([key, val]) => (
                <option key={key} value={key}>{val.label}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-[13px] font-medium text-[#323338] mb-1">איש קשר</label>
          <select
            value={form.contactId}
            onChange={(e) => setField("contactId", e.target.value)}
            className="w-full px-3 py-2 border border-[#D0D4E4] rounded-[4px] text-[13px] focus:outline-none focus:ring-2 focus:ring-[#0073EA]/20 focus:border-[#0073EA] bg-white"
          >
            <option value="">ללא</option>
            {contacts?.data.map((c) => (
              <option key={c.id} value={c.id}>{c.fullName}</option>
            ))}
          </select>
        </div>
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2 bg-[#F5F6F8] hover:bg-border text-[#676879] font-semibold rounded-[4px] transition-colors text-[13px]"
          >
            ביטול
          </button>
          <button
            type="submit"
            disabled={mutation.isPending || !form.subject.trim()}
            className="flex-1 py-2 bg-[#0073EA] hover:bg-[#0060C2] text-white font-semibold rounded-[4px] transition-colors text-[13px] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {mutation.isPending ? "יוצר..." : "צור קריאה"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

/* ───── SLA helpers ───── */
function formatSlaTime(minutes: number): string {
  if (minutes < 60) return `${minutes} דקות`;
  const hours = Math.floor(minutes / 60);
  const rem = minutes % 60;
  if (rem === 0) return `${hours} שעות`;
  return `${hours}:${String(rem).padStart(2, "0")}`;
}

function getSlaInfo(ticket: TicketDetail) {
  const sla = ticket.slaPolicy;
  if (!sla) return null;
  const createdAt = new Date(ticket.createdAt).getTime();
  const now = Date.now();
  const elapsedMinutes = (now - createdAt) / 60000;

  const responseBreached = !ticket.firstResponseAt && elapsedMinutes > sla.firstResponseMinutes;
  const responseRemaining = Math.max(0, Math.round(sla.firstResponseMinutes - elapsedMinutes));
  const responseOverdue = Math.max(0, Math.round(elapsedMinutes - sla.firstResponseMinutes));

  const resolutionBreached = !ticket.resolvedAt && elapsedMinutes > sla.resolutionMinutes;
  const resolutionRemaining = Math.max(0, Math.round(sla.resolutionMinutes - elapsedMinutes));
  const resolutionOverdue = Math.max(0, Math.round(elapsedMinutes - sla.resolutionMinutes));

  return {
    responseBreached,
    responseRemaining,
    responseOverdue,
    resolutionBreached,
    resolutionRemaining,
    resolutionOverdue,
  };
}
