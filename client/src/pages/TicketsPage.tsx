import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  MessageSquare,
  Mail,
  Phone,
  Globe,
  Smartphone,
} from "lucide-react";
import toast from "react-hot-toast";
import PageShell from "../components/layout/PageShell";
import Modal from "../components/shared/Modal";
import StatusDropdown from "../components/shared/StatusDropdown";
import MondayTextCell from "../components/shared/MondayTextCell";
import MondayPersonCell from "../components/shared/MondayPersonCell";
import DataTable from "../components/shared/DataTable";
import KanbanBoard, {
  type KanbanColumn as KanbanCol,
} from "../components/shared/KanbanBoard";
import ViewToggle from "../components/shared/ViewToggle";
import ExportButton from "../components/shared/ExportButton";
import {
  listTickets,
  createTicket,
  updateTicket,
  getTicketsBoard,
  type Ticket,
} from "../api/tickets";
import { listContacts } from "../api/contacts";
import { getWorkspaceMembers } from "../api/auth";
import { useWorkspaceOptions } from "../hooks/useWorkspaceOptions";
import { useInlineUpdate } from "../hooks/useInlineUpdate";
import { useAuth } from "../hooks/useAuth";

const CHANNEL_ICONS: Record<string, React.ReactNode> = {
  email: <Mail size={12} />,
  whatsapp: <MessageSquare size={12} />,
  chat: <Globe size={12} />,
  phone: <Phone size={12} />,
  portal: <Smartphone size={12} />,
};

export default function TicketsPage() {
  const { ticketStatuses, priorities, ticketChannels } = useWorkspaceOptions();
  const { currentWorkspaceId } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<"kanban" | "table">("table");
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [showCreate, setShowCreate] = useState(false);

  const inlineUpdate = useInlineUpdate(updateTicket, [
    ["tickets"],
    ["tickets-board"],
  ]);
  const { data: members } = useQuery({
    queryKey: ["members"],
    queryFn: () => getWorkspaceMembers(currentWorkspaceId!),
    enabled: !!currentWorkspaceId,
  });
  const memberOptions = (members || []).map((m) => ({
    id: m.memberId,
    name: m.name,
  }));

  const { data, isLoading } = useQuery({
    queryKey: ["tickets", { statusFilter, page, sortBy, sortDir }],
    queryFn: () =>
      listTickets({
        status: statusFilter || undefined,
        page,
        sortBy,
        sortDir,
      }),
    enabled: viewMode === "table",
  });

  // Board data
  const { data: boardData, isLoading: boardLoading } = useQuery({
    queryKey: ["tickets-board"],
    queryFn: getTicketsBoard,
    enabled: viewMode === "kanban",
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      updateTicket(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      queryClient.invalidateQueries({ queryKey: ["tickets-board"] });
      toast.success("סטטוס עודכן");
    },
  });

  // Kanban columns
  const kanbanColumns: KanbanCol<Ticket>[] = Object.entries(ticketStatuses).map(
    ([key, info]) => ({
      key,
      label: info.label,
      color: info.color,
      items: boardData?.statuses[key] || [],
    }),
  );

  function handleKanbanDragEnd(
    itemId: string,
    _fromColumn: string,
    toColumn: string,
  ) {
    statusMutation.mutate({ id: itemId, status: toColumn });
    toast.success(`פנייה הועברה ל${ticketStatuses[toColumn]?.label}`);
  }

  const priorityMutation = useMutation({
    mutationFn: ({ id, priority }: { id: string; priority: string }) =>
      updateTicket(id, { priority }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      toast.success("עדיפות עודכנה");
    },
  });

  const handleSort = (key: string) => {
    if (sortBy === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(key);
      setSortDir("asc");
    }
  };

  const columns = [
    {
      key: "subject",
      label: "נושא",
      sortable: true,
      render: (row: Ticket) => (
        <div>
          <MondayTextCell
            value={row.subject}
            onChange={(val) => inlineUpdate(row.id, { subject: val })}
            placeholder="נושא פנייה"
          />
          {row.description && (
            <p className="text-xs text-text-tertiary truncate max-w-xs mt-0.5">
              {row.description}
            </p>
          )}
        </div>
      ),
    },
    {
      key: "status",
      label: "סטטוס",
      sortable: true,
      render: (row: Ticket) => (
        <StatusDropdown
          value={row.status}
          options={ticketStatuses}
          onChange={(status) => statusMutation.mutate({ id: row.id, status })}
        />
      ),
    },
    {
      key: "priority",
      label: "עדיפות",
      sortable: true,
      render: (row: Ticket) => (
        <StatusDropdown
          value={row.priority}
          options={priorities}
          onChange={(priority) =>
            priorityMutation.mutate({ id: row.id, priority })
          }
        />
      ),
    },
    {
      key: "contact",
      label: "איש קשר",
      render: (row: Ticket) =>
        row.contact ? (
          <div className="flex items-center gap-2">
            <div
              className="w-6 h-6 rounded-full bg-[#6161FF] flex items-center justify-center flex-shrink-0"
              role="img"
              aria-label={row.contact.name}
            >
              <span className="text-white text-[10px] font-bold">
                {row.contact.name[0]}
              </span>
            </div>
            <span className="text-sm">{row.contact.name}</span>
          </div>
        ) : (
          "—"
        ),
    },
    {
      key: "channel",
      label: "ערוץ",
      render: (row: Ticket) => {
        const color = ticketChannels[row.channel]?.color || "#C4C4C4";
        const icon = CHANNEL_ICONS[row.channel];
        return (
          <div className="flex items-center gap-1.5">
            <div
              className="w-5 h-5 rounded flex items-center justify-center text-white"
              style={{ backgroundColor: color }}
            >
              {icon}
            </div>
            <span className="text-xs text-text-secondary">
              {ticketChannels[row.channel]?.label || row.channel}
            </span>
          </div>
        );
      },
    },
    {
      key: "assignee",
      label: "נציג",
      render: (row: Ticket) => (
        <MondayPersonCell
          value={
            row.assignee
              ? { id: row.assignee.id, name: row.assignee.name }
              : null
          }
          onChange={(id) => inlineUpdate(row.id, { assigneeId: id! })}
          options={memberOptions}
          placeholder="לא שויך"
        />
      ),
    },
    {
      key: "messageCount",
      label: "הודעות",
      width: "80px",
      render: (row: Ticket) => (
        <div className="flex items-center gap-1 text-text-secondary">
          <MessageSquare size={12} />
          <span className="text-xs font-medium">{row.messageCount}</span>
        </div>
      ),
    },
    {
      key: "createdAt",
      label: "נוצר",
      sortable: true,
      render: (row: Ticket) => {
        const created = new Date(row.createdAt);
        const now = new Date();
        const diffHrs = Math.floor(
          (now.getTime() - created.getTime()) / (1000 * 60 * 60),
        );
        // SLA indicator: show hours for recent, date for older
        const isRecent = diffHrs < 24;
        return (
          <span
            className={`text-xs ${isRecent ? "text-warning font-semibold" : "text-text-tertiary"}`}
          >
            {isRecent
              ? `לפני ${diffHrs}ש`
              : created.toLocaleDateString("he-IL")}
          </span>
        );
      },
    },
  ];

  const allTickets = data?.pagination.total || 0;

  return (
    <PageShell
      title="פניות"
      subtitle={`${allTickets} פניות`}
      actions={
        <div className="flex items-center gap-2">
          <ViewToggle viewMode={viewMode} onChange={setViewMode} />
          <ExportButton
            entity="tickets"
            filters={{ status: statusFilter, search }}
          />
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary-hover text-white text-sm font-semibold rounded-lg transition-all hover:shadow-md active:scale-[0.97]"
          >
            <Plus size={16} />
            פנייה חדשה
          </button>
        </div>
      }
    >
      {viewMode === "kanban" ? (
        <KanbanBoard<Ticket>
          columns={kanbanColumns}
          renderCard={(ticket, isDragging) => (
            <TicketCard ticket={ticket} isDragging={isDragging} />
          )}
          onDragEnd={handleKanbanDragEnd}
          onCardClick={(ticket) => navigate(`/tickets/${ticket.id}`)}
          loading={boardLoading}
          emptyText="אין פניות"
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
            {Object.entries(ticketStatuses).map(([key, val]) => (
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
            searchPlaceholder="חיפוש פניות..."
            pagination={data?.pagination}
            onPageChange={setPage}
            sortBy={sortBy}
            sortDir={sortDir}
            onSortChange={handleSort}
            onRowClick={(row) => navigate(`/tickets/${row.id}`)}
          />
        </>
      )}

      {showCreate && <CreateTicketModal onClose={() => setShowCreate(false)} />}
    </PageShell>
  );
}

function TicketCard({
  ticket,
  isDragging,
}: {
  ticket: Ticket;
  isDragging?: boolean;
}) {
  const { priorities, ticketChannels } = useWorkspaceOptions();
  const priorityInfo = priorities[ticket.priority];
  const channelColor = ticketChannels[ticket.channel]?.color || "#C4C4C4";
  const channelIcon = CHANNEL_ICONS[ticket.channel];
  const channelLabel = ticketChannels[ticket.channel]?.label || ticket.channel;

  return (
    <div
      className={`bg-white rounded-xl p-3.5 shadow-sm border-l-[3px] transition-all ${
        isDragging
          ? "shadow-lg opacity-90 border-l-primary"
          : "border-l-transparent hover:shadow-md hover:border-l-primary"
      }`}
    >
      {/* Subject */}
      <span className="font-semibold text-sm text-text-primary block mb-1 truncate">
        {ticket.subject}
      </span>

      {ticket.description && (
        <p className="text-xs text-text-tertiary truncate mb-2">
          {ticket.description}
        </p>
      )}

      {/* Priority + Channel badges */}
      <div className="flex items-center gap-1.5 mb-2">
        <span
          className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full text-white"
          style={{ backgroundColor: priorityInfo?.color || "#C4C4C4" }}
        >
          {priorityInfo?.label || ticket.priority}
        </span>
        <div
          className="flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full text-white"
          style={{ backgroundColor: channelColor }}
        >
          {channelIcon}
          <span className="mr-0.5">{channelLabel}</span>
        </div>
      </div>

      {/* Bottom row */}
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-border-light">
        {/* Contact */}
        <div className="flex items-center gap-1">
          {ticket.contact ? (
            <>
              <div
                className="w-5 h-5 rounded-full bg-[#6161FF] flex items-center justify-center"
                role="img"
                aria-label={ticket.contact.name}
              >
                <span className="text-white text-[8px] font-bold">
                  {ticket.contact.name[0]}
                </span>
              </div>
              <span className="text-[11px] text-text-secondary truncate max-w-[80px]">
                {ticket.contact.name}
              </span>
            </>
          ) : (
            <span className="text-[11px] text-text-tertiary">ללא קשר</span>
          )}
        </div>

        {/* Message count */}
        <div className="flex items-center gap-1 text-text-tertiary">
          <MessageSquare size={10} />
          <span className="text-[10px] font-medium">{ticket.messageCount}</span>
        </div>
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

function CreateTicketModal({ onClose }: { onClose: () => void }) {
  const { priorities, ticketChannels } = useWorkspaceOptions();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    subject: "",
    description: "",
    priority: "MEDIUM",
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
        channel: form.channel,
        contactId: form.contactId || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      toast.success("פנייה נוצרה בהצלחה!");
      onClose();
    },
    onError: (err: any) => {
      toast.error(err?.message || "שגיאה ביצירת פנייה");
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    mutation.mutate();
  }

  const setField = (key: string, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  return (
    <Modal open={true} onClose={onClose} title="פנייה חדשה">
      <form onSubmit={handleSubmit} className="space-y-4 p-6">
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">
            נושא *
          </label>
          <input
            type="text"
            value={form.subject}
            onChange={(e) => setField("subject", e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">
            תיאור
          </label>
          <textarea
            value={form.description}
            onChange={(e) => setField("description", e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
            rows={3}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
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
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              ערוץ
            </label>
            <select
              value={form.channel}
              onChange={(e) => setField("channel", e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white"
            >
              {Object.entries(ticketChannels).map(([key, val]) => (
                <option key={key} value={key}>
                  {val.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">
            איש קשר
          </label>
          <select
            value={form.contactId}
            onChange={(e) => setField("contactId", e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white"
          >
            <option value="">ללא</option>
            {contacts?.data.map((c) => (
              <option key={c.id} value={c.id}>
                {c.fullName}
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
            {mutation.isPending ? "יוצר..." : "צור פנייה"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
