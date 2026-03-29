import { useState, useCallback, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { avatarColor } from "../lib/utils";
import ConfirmDialog from "../components/shared/ConfirmDialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Building2, Tag, Calendar, AlertTriangle, Phone, Mail, MessageSquare, UserPlus, ChevronRight, ChevronLeft } from "lucide-react";
import LeadHeatBadge, { heatFromScore } from "../components/shared/LeadHeatBadge";
import { useDebounce } from "../hooks/useDebounce";
import toast from "react-hot-toast";
import PageShell from "../components/layout/PageShell";
import DataTable from "../components/shared/DataTable";
import Modal from "../components/shared/Modal";
import StatusDropdown from "../components/shared/StatusDropdown";
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
import { createActivity } from "../api/activities";
import { useWorkspaceOptions } from "../hooks/useWorkspaceOptions";
import { useInlineUpdate } from "../hooks/useInlineUpdate";
import MondayTextCell from "../components/shared/MondayTextCell";
import MondayPersonCell from "../components/shared/MondayPersonCell";


export default function ContactsPage() {
  const { contactStatuses } = useWorkspaceOptions();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [viewMode, setViewMode] = useState<"kanban" | "table" | "cards">("table");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [showCreate, setShowCreate] = useState(() => searchParams.get("new") === "1");

  // Clear the ?new=1 param once we've opened the modal
  useEffect(() => {
    if (searchParams.get("new") === "1") {
      setShowCreate(true);
      setSearchParams((prev) => { prev.delete("new"); return prev; }, { replace: true });
    }
  }, []);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [needsFollowUp, setNeedsFollowUp] = useState(false);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: [
      "contacts",
      { search: debouncedSearch, page, statusFilter, sortBy, sortDir, needsFollowUp },
    ],
    queryFn: () =>
      listContacts({
        search: debouncedSearch || undefined,
        page,
        status: statusFilter || undefined,
        sortBy,
        sortDir,
        needsFollowUp: needsFollowUp || undefined,
      }),
    enabled: viewMode === "table" || viewMode === "cards",
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
    onError: (err: any) => toast.error(err?.message || "שגיאה בעדכון"),
  });

  // Quick activity logging
  const quickActivityTypes = [
    { type: "CALL" as const, icon: Phone, color: "#00CA72", label: "שיחה", subject: (n: string) => `שיחה עם ${n}`, toast: "שיחה נרשמה ✓", tooltip: "רשום שיחה" },
    { type: "EMAIL" as const, icon: Mail, color: "#579BFC", label: "אימייל", subject: (n: string) => `אימייל ל-${n}`, toast: "אימייל נרשם ✓", tooltip: "רשום אימייל" },
    { type: "MEETING" as const, icon: Calendar, color: "#A25DDC", label: "פגישה", subject: (n: string) => `פגישה עם ${n}`, toast: "פגישה נרשמה ✓", tooltip: "רשום פגישה" },
    { type: "WHATSAPP" as const, icon: MessageSquare, color: "#25D366", label: "ווטסאפ", subject: (n: string) => `ווטסאפ ל-${n}`, toast: "ווטסאפ נרשם ✓", tooltip: "רשום ווטסאפ" },
  ];

  const quickLogMutation = useMutation({
    mutationFn: (data: { type: string; subject: string; contactId: string }) =>
      createActivity(data),
    onSuccess: (_data, variables) => {
      const actType = quickActivityTypes.find((a) => a.type === variables.type);
      toast.success(actType?.toast || "פעילות נרשמה ✓");
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      queryClient.invalidateQueries({ queryKey: ["activities"] });
    },
    onError: () => toast.error("שגיאה ברישום פעילות"),
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
              <span className="text-[#9699A6] text-[11px] block truncate">
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
            <span className="text-xs text-[#9699A6]">{score}</span>
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
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-[#F5F6F8] text-[#9699A6]">
                +{row.tags.length - 2}
              </span>
            )}
          </div>
        ) : (
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/contacts/${row.id}`);
            }}
            className="flex items-center gap-1 text-[11px] text-[#9699A6] hover:text-[#0073EA] px-2 py-1 rounded-[4px] hover:bg-[#0073EA]/5 border border-dashed border-transparent hover:border-[#0073EA]/30 transition-all group/tag"
          >
            <Tag size={11} className="opacity-50 group-hover/tag:opacity-100" />
            <span>הוסף תגית</span>
          </button>
        ),
    },
    {
      key: "nextFollowUpDate",
      label: "תאריך מעקב",
      sortable: true,
      width: "140px",
      render: (row: Contact) => {
        if (!row.nextFollowUpDate) {
          return <span className="text-[11px] text-[#9699A6]">—</span>;
        }
        const fuDate = new Date(row.nextFollowUpDate);
        fuDate.setHours(0, 0, 0, 0);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const diff = Math.round((fuDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        let colorClass = "text-[#676879]";
        let badge: React.ReactNode = null;
        if (diff < 0) {
          colorClass = "text-[#E44258] font-bold";
          badge = <AlertTriangle size={10} className="text-[#E44258]" />;
        } else if (diff === 0) {
          colorClass = "text-warning font-bold";
          badge = <Calendar size={10} className="text-warning" />;
        }
        return (
          <span className={`flex items-center gap-1 text-[11px] ${colorClass}`}>
            {badge}
            {fuDate.toLocaleDateString("he-IL", { day: "numeric", month: "short" })}
          </span>
        );
      },
    },
    {
      key: "__quickActions",
      label: "",
      width: "120px",
      render: (row: Contact) => (
        <div
          className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150"
          onClick={(e: React.MouseEvent) => e.stopPropagation()}
        >
          {quickActivityTypes.map((act) => {
            const Icon = act.icon;
            return (
              <button
                key={act.type}
                title={act.tooltip}
                onClick={() =>
                  quickLogMutation.mutate({
                    type: act.type,
                    subject: act.subject(row.fullName),
                    contactId: row.id,
                  })
                }
                className="p-1 rounded-md hover:bg-black/5 transition-colors"
              >
                <Icon size={16} style={{ color: act.color }} />
              </button>
            );
          })}
        </div>
      ),
    },
  ];

  return (
    <PageShell
      title="אנשי קשר"
      emoji="👥"
      boardStyle
      subtitle={data?.pagination.total ? `${data.pagination.total} אנשי קשר` : undefined}
      views={[
        { key: "table", label: "טבלה" },
        { key: "kanban", label: "קנבאן" },
        { key: "cards", label: "כרטיסים" },
      ]}
      activeView={viewMode}
      onViewChange={(key) => setViewMode(key as "table" | "kanban" | "cards")}
      actions={
        <div className="flex items-center gap-2">
          <ExportButton
            entity="contacts"
            filters={{ status: statusFilter, search: debouncedSearch }}
          />
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-3 py-[6px] bg-[#0073EA] hover:bg-[#0060C2] text-white text-[13px] font-medium rounded-[4px] transition-colors"
          >
            <Plus size={15} strokeWidth={2.5} />
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
          onCardClick={(contact) => navigate(`/contacts/${contact.id}`)}
          loading={boardLoading}
          emptyText="אין אנשי קשר"
        />
      ) : viewMode === "cards" ? (
        <>
          {/* Status filter chips */}
          <div className="flex gap-2 flex-wrap">
            <FilterChip
              label="הכל"
              active={!statusFilter}
              onClick={() => { setStatusFilter(""); setPage(1); }}
            />
            {Object.entries(contactStatuses).map(([key, val]) => (
              <FilterChip
                key={key}
                label={val.label}
                color={val.color}
                active={statusFilter === key}
                onClick={() => { setStatusFilter(key); setPage(1); }}
              />
            ))}
            <span className="text-border text-xs select-none">|</span>
            <FilterChip
              label="דורש מעקב"
              color="#FF4D4F"
              active={needsFollowUp}
              onClick={() => { setNeedsFollowUp(!needsFollowUp); setPage(1); }}
            />
          </div>
          {/* Search */}
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="חיפוש לפי שם, אימייל או טלפון..."
            className="w-full max-w-sm px-3 py-2 border border-[#E6E9EF] rounded-[4px] text-[13px] focus:outline-none focus:ring-2 focus:ring-[#0073EA]/20 focus:border-[#0073EA] bg-white"
          />
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {(data?.data || []).map((contact) => (
                  <ContactCRMCard
                    key={contact.id}
                    contact={contact}
                    onClick={() => navigate(`/contacts/${contact.id}`)}
                  />
                ))}
                {(data?.data || []).length === 0 && (
                  <div className="col-span-full text-center py-20 text-[#9699A6] text-sm">
                    לא נמצאו אנשי קשר
                  </div>
                )}
              </div>
              {data?.pagination && data.pagination.totalPages > 1 && (
                <div className="flex items-center justify-between pt-2 border-t border-[#E6E9EF]" dir="rtl">
                  <span className="text-[13px] text-[#676879]">
                    מציג {((data.pagination.page - 1) * data.pagination.limit) + 1}–{Math.min(data.pagination.page * data.pagination.limit, data.pagination.total)} מתוך {data.pagination.total}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={data.pagination.page <= 1}
                      className="p-1.5 rounded-[4px] text-[#676879] hover:bg-[#F5F6F8] hover:text-[#323338] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      aria-label="עמוד קודם"
                    >
                      <ChevronRight size={16} />
                    </button>
                    {Array.from({ length: Math.min(5, data.pagination.totalPages) }, (_, i) => {
                      const totalPages = data.pagination.totalPages;
                      const currentPage = data.pagination.page;
                      let pageNum: number;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setPage(pageNum)}
                          className={`min-w-[30px] h-[30px] px-2 rounded-[4px] text-[13px] font-medium transition-colors ${
                            currentPage === pageNum
                              ? "bg-[#0073EA] text-white"
                              : "text-[#676879] hover:bg-[#F5F6F8] hover:text-[#323338]"
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                    <button
                      onClick={() => setPage((p) => Math.min(data.pagination.totalPages, p + 1))}
                      disabled={data.pagination.page >= data.pagination.totalPages}
                      className="p-1.5 rounded-[4px] text-[#676879] hover:bg-[#F5F6F8] hover:text-[#323338] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      aria-label="עמוד הבא"
                    >
                      <ChevronLeft size={16} />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </>
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
            <span className="text-border text-xs select-none">|</span>
            <FilterChip
              label="דורש מעקב"
              color="#FF4D4F"
              active={needsFollowUp}
              onClick={() => {
                setNeedsFollowUp(!needsFollowUp);
                setPage(1);
              }}
            />
          </div>

          {/* Empty state — no contacts at all, no active filter/search */}
          {!isLoading &&
            !debouncedSearch &&
            !statusFilter &&
            !needsFollowUp &&
            (data?.data || []).length === 0 ? (
            <ContactsEmptyState onAdd={() => setShowCreate(true)} />
          ) : (
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
              onRowClick={(row) => navigate(`/contacts/${row.id}`)}
            />
          )}
        </>
      )}

      {showCreate && (
        <CreateContactModal onClose={() => setShowCreate(false)} />
      )}

      <BulkActionBar
        selectedCount={selectedIds.size}
        onClear={() => setSelectedIds(new Set())}
        onDelete={() => setShowBulkDeleteConfirm(true)}
        deleting={bulkDeleteMutation.isPending}
      />

      <ConfirmDialog
        open={showBulkDeleteConfirm}
        onConfirm={() => {
          setShowBulkDeleteConfirm(false);
          bulkDeleteMutation.mutate();
        }}
        onCancel={() => setShowBulkDeleteConfirm(false)}
        title="מחיקת אנשי קשר"
        message={`האם אתה בטוח שברצונך למחוק ${selectedIds.size} אנשי קשר?`}
        confirmText="מחק"
        cancelText="ביטול"
        variant="danger"
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
          ? "shadow-lg opacity-90 border-l-[#0073EA]"
          : "border-l-transparent hover:shadow-md hover:border-l-[#0073EA]"
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
          <span className="font-semibold text-sm text-[#323338] block truncate">
            {contact.fullName}
          </span>
          {contact.position && (
            <span className="text-[#9699A6] text-[11px] block truncate">
              {contact.position}
            </span>
          )}
        </div>
      </div>

      {/* Company */}
      {contact.company && (
        <div className="flex items-center gap-1.5 mb-1">
          <Building2 size={11} className="text-[#9699A6]" />
          <span className="text-xs text-[#676879] truncate">
            {contact.company.name}
          </span>
        </div>
      )}

      {/* Email */}
      {contact.email && (
        <p
          dir="ltr"
          className="text-xs text-[#9699A6] truncate mb-1 text-right"
        >
          {contact.email}
        </p>
      )}

      {/* Bottom: Lead score + tags */}
      <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-[#E6E9EF]">
        {/* Lead score bar */}
        <div className="flex items-center gap-1.5 flex-1">
          <div className="flex-1 h-1.5 bg-[#F5F6F8] rounded-full overflow-hidden max-w-[60px]">
            <div
              className="h-full rounded-full"
              style={{ width: `${score}%`, backgroundColor: barColor }}
            />
          </div>
          <span className="text-[10px] font-semibold text-[#9699A6]">
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

function ContactCRMCard({
  contact,
  onClick,
}: {
  contact: Contact;
  onClick: () => void;
}) {
  const initials = [contact.firstName?.[0], contact.lastName?.[0]]
    .filter(Boolean)
    .join("")
    .toUpperCase() || "?";

  return (
    <button
      type="button"
      onClick={onClick}
      className="bg-white rounded-2xl shadow-sm border border-[#E6E9EF] hover:shadow-md hover:border-[#0073EA]/30 transition-all text-right group w-full p-4 flex flex-col gap-3 cursor-pointer"
    >
      {/* Header: avatar + name */}
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-white text-sm font-bold"
          style={{ backgroundColor: avatarColor(contact.fullName) }}
          aria-label={contact.fullName}
        >
          {initials}
        </div>
        <div className="min-w-0 flex-1 text-right">
          <span className="font-bold text-sm text-[#323338] block truncate">
            {contact.fullName}
          </span>
          {contact.position && (
            <span className="text-[11px] text-[#9699A6] block truncate">
              {contact.position}
            </span>
          )}
        </div>
      </div>

      {/* Company */}
      {contact.company && (
        <div className="flex items-center gap-2">
          <Building2 size={12} className="text-[#9699A6] flex-shrink-0" />
          <span className="text-xs text-[#676879] truncate">
            {contact.company.name}
          </span>
        </div>
      )}

      {/* Phone */}
      {contact.phone && (
        <div className="flex items-center gap-2">
          <Phone size={12} className="text-[#9699A6] flex-shrink-0" />
          <span className="text-xs text-[#676879] truncate" dir="ltr">
            {contact.phone}
          </span>
        </div>
      )}

      {/* Email */}
      {contact.email && (
        <div className="flex items-center gap-2">
          <Mail size={12} className="text-[#9699A6] flex-shrink-0" />
          <span className="text-xs text-[#676879] truncate" dir="ltr">
            {contact.email}
          </span>
        </div>
      )}

      {/* Footer: last activity + tags */}
      <div className="flex items-center justify-between pt-2 border-t border-[#E6E9EF] mt-auto">
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
          {contact.tags.length > 2 && (
            <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-[#F5F6F8] text-[#9699A6]">
              +{contact.tags.length - 2}
            </span>
          )}
        </div>
        {contact.lastActivityAt && (
          <span className="text-[10px] text-[#9699A6] flex items-center gap-1">
            <Calendar size={10} />
            {new Date(contact.lastActivityAt).toLocaleDateString("he-IL", {
              day: "numeric",
              month: "short",
            })}
          </span>
        )}
      </div>
    </button>
  );
}

// ──────────────────────────────────────────────────────────────
// Contacts Empty State
// ──────────────────────────────────────────────────────────────
function ContactsEmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
      {/* Illustration */}
      <div className="mb-6 relative">
        <div className="w-24 h-24 rounded-full bg-[#E8E8FF] flex items-center justify-center shadow-sm">
          <svg width="52" height="52" viewBox="0 0 52 52" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Face circle */}
            <circle cx="26" cy="20" r="12" fill="#6161FF" opacity="0.15" stroke="#6161FF" strokeWidth="2"/>
            {/* Eyes */}
            <circle cx="22" cy="18" r="1.5" fill="#6161FF"/>
            <circle cx="30" cy="18" r="1.5" fill="#6161FF"/>
            {/* Smile */}
            <path d="M22 23 Q26 27 30 23" stroke="#6161FF" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
            {/* Body */}
            <path d="M10 44 C10 35 16 32 26 32 C36 32 42 35 42 44" stroke="#6161FF" strokeWidth="2" strokeLinecap="round" fill="none"/>
            {/* Plus badge */}
            <circle cx="40" cy="10" r="7" fill="#00CA72"/>
            <line x1="40" y1="7" x2="40" y2="13" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            <line x1="37" y1="10" x2="43" y2="10" stroke="white" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </div>
      </div>

      <h3 className="text-xl font-bold text-[#323338] mb-2">
        עדיין אין אנשי קשר
      </h3>
      <p className="text-sm text-[#676879] max-w-xs mb-6 leading-relaxed">
        הוסף לידים ואנשי קשר כדי לעקוב אחרי שיחות, עסקאות ומשימות — הכל במקום אחד.
      </p>

      <button
        onClick={onAdd}
        className="flex items-center gap-2 px-6 py-2.5 bg-[#0073EA] hover:bg-[#0060C2] text-white font-semibold rounded-[4px] shadow-sm hover:shadow-md transition-all active:scale-[0.97]"
      >
        <UserPlus size={16} />
        הוסף איש קשר ראשון
      </button>
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
      className={`px-3 py-[5px] rounded-[4px] text-[12px] font-medium transition-all ${
        active
          ? "text-white"
          : "bg-white border border-[#D0D4E4] text-[#676879] hover:border-[#0073EA] hover:text-[#0073EA]"
      }`}
      style={active ? { backgroundColor: color || "#0073EA" } : undefined}
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
            <label className="block text-sm font-medium text-[#323338] mb-1">
              שם פרטי *
            </label>
            <input
              type="text"
              value={form.firstName}
              onChange={(e) => setField("firstName", e.target.value)}
              className="w-full px-3 py-2 border border-[#E6E9EF] rounded-[4px] text-[13px] focus:outline-none focus:ring-2 focus:ring-[#0073EA]/20 focus:border-[#0073EA]"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#323338] mb-1">
              שם משפחה *
            </label>
            <input
              type="text"
              value={form.lastName}
              onChange={(e) => setField("lastName", e.target.value)}
              className="w-full px-3 py-2 border border-[#E6E9EF] rounded-[4px] text-[13px] focus:outline-none focus:ring-2 focus:ring-[#0073EA]/20 focus:border-[#0073EA]"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-[#323338] mb-1">
              אימייל
            </label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setField("email", e.target.value)}
              className="w-full px-3 py-2 border border-[#E6E9EF] rounded-[4px] text-[13px] focus:outline-none focus:ring-2 focus:ring-[#0073EA]/20 focus:border-[#0073EA]"
              dir="ltr"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#323338] mb-1">
              טלפון
            </label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setField("phone", e.target.value)}
              className="w-full px-3 py-2 border border-[#E6E9EF] rounded-[4px] text-[13px] focus:outline-none focus:ring-2 focus:ring-[#0073EA]/20 focus:border-[#0073EA]"
              dir="ltr"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-[#323338] mb-1">
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
          <div>
            <label className="block text-sm font-medium text-[#323338] mb-1">
              תפקיד
            </label>
            <input
              type="text"
              value={form.position}
              onChange={(e) => setField("position", e.target.value)}
              className="w-full px-3 py-2 border border-[#E6E9EF] rounded-[4px] text-[13px] focus:outline-none focus:ring-2 focus:ring-[#0073EA]/20 focus:border-[#0073EA]"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-[#323338] mb-1">
            מקור
          </label>
          <select
            value={form.source}
            onChange={(e) => setField("source", e.target.value)}
            className="w-full px-3 py-2 border border-[#E6E9EF] rounded-[4px] text-[13px] focus:outline-none focus:ring-2 focus:ring-[#0073EA]/20 focus:border-[#0073EA] bg-white"
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
            className="flex-1 py-2 bg-[#F5F6F8] hover:bg-[#E6E9EF] text-[#676879] font-semibold rounded-[4px] transition-colors text-[13px]"
          >
            ביטול
          </button>
          <button
            type="submit"
            disabled={mutation.isPending}
            className="flex-1 py-2 bg-[#0073EA] hover:bg-[#0060C2] text-white font-semibold rounded-[4px] transition-colors text-[13px] disabled:opacity-50"
          >
            {mutation.isPending ? "יוצר..." : "צור איש קשר"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
