import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { X, User, Link as LinkIcon, Mail, Phone } from "lucide-react";
import toast from "react-hot-toast";
import {
  getBoard,
  updateBoardItem,
  updateBoardItemValues,
  type BoardColumn,
} from "../../api/boards";
import { listContacts } from "../../api/contacts";

interface BoardItemDetailPanelProps {
  boardId: string;
  itemId: string;
  columns: BoardColumn[];
  onClose: () => void;
  onUpdated: () => void;
}

export default function BoardItemDetailPanel({
  boardId,
  itemId,
  columns,
  onClose,
  onUpdated,
}: BoardItemDetailPanelProps) {
  const qc = useQueryClient();
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState("");
  const [notes, setNotes] = useState("");
  const [activeTab, setActiveTab] = useState<"details" | "updates">("details");
  const [contactSearch, setContactSearch] = useState("");
  const [contactDropdownOpen, setContactDropdownOpen] = useState(false);

  // Fetch board to find the item
  const { data: board, isLoading } = useQuery({
    queryKey: ["board", boardId],
    queryFn: () => getBoard(boardId),
  });

  const item = board?.groups.flatMap((g) => g.items).find((i) => i.id === itemId);

  // Contacts list
  const { data: contactsData } = useQuery({
    queryKey: ["contacts", { limit: 200 }],
    queryFn: () => listContacts({ limit: 200 }),
  });

  const contacts = contactsData?.data || [];
  const filteredContacts = contactSearch
    ? contacts.filter(
        (c) =>
          c.fullName.toLowerCase().includes(contactSearch.toLowerCase()) ||
          c.email?.toLowerCase().includes(contactSearch.toLowerCase()) ||
          c.phone?.includes(contactSearch),
      )
    : contacts.slice(0, 20);

  useEffect(() => {
    if (item) {
      setNameValue(item.name);
      // Load notes from jsonValue of a "notes" column if exists
      const notesCol = columns.find(
        (c) => c.key === "notes" || c.label.includes("הערות"),
      );
      if (notesCol) {
        const val = item.values.find((v) => v.columnId === notesCol.id);
        setNotes(val?.textValue || "");
      }
    }
  }, [item, columns]);

  const updateNameMut = useMutation({
    mutationFn: (name: string) => updateBoardItem(boardId, itemId, { name }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["board", boardId] });
      onUpdated();
      toast.success("שם עודכן");
      setEditingName(false);
    },
  });

  const updateValuesMut = useMutation({
    mutationFn: (
      values: Array<{
        columnId: string;
        textValue?: string | null;
        numberValue?: number | null;
        dateValue?: string | null;
        jsonValue?: any;
      }>,
    ) => updateBoardItemValues(boardId, itemId, values),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["board", boardId] });
      onUpdated();
    },
  });

  function getItemValue(col: BoardColumn): any {
    if (!item) return null;
    const v = item.values.find((val) => val.columnId === col.id);
    if (!v) return null;
    switch (col.type) {
      case "NUMBER":
        return v.numberValue;
      case "DATE":
        return v.dateValue;
      case "CHECKBOX":
        return v.jsonValue;
      default:
        return v.textValue;
    }
  }

  function saveValue(col: BoardColumn, value: any) {
    const payload: {
      columnId: string;
      textValue?: string | null;
      numberValue?: number | null;
      dateValue?: string | null;
      jsonValue?: any;
    } = { columnId: col.id };

    switch (col.type) {
      case "NUMBER":
        payload.numberValue = value === "" || value == null ? null : Number(value);
        break;
      case "DATE":
        payload.dateValue = value || null;
        break;
      case "CHECKBOX":
        payload.jsonValue = value;
        break;
      default:
        payload.textValue = value || null;
    }
    updateValuesMut.mutate([payload]);
  }

  function linkContact(contactId: string) {
    const col = columns.find(
      (c) => c.key === "contact_id" || c.key === "contactId",
    );
    if (col) {
      updateValuesMut.mutate([{ columnId: col.id, textValue: contactId }]);
    }
    setContactDropdownOpen(false);
    setContactSearch("");
  }

  const linkedContactId = (() => {
    const col = columns.find(
      (c) => c.key === "contact_id" || c.key === "contactId",
    );
    if (!col || !item) return null;
    const v = item.values.find((val) => val.columnId === col.id);
    return v?.textValue || null;
  })();

  const linkedContact = linkedContactId
    ? contacts.find((c) => c.id === linkedContactId)
    : null;

  function renderField(col: BoardColumn) {
    if (col.key === "name") return null;
    const value = getItemValue(col);

    if (col.type === "STATUS" || col.type === "PRIORITY") {
      const opts = col.options || [];
      const currentOpt = opts.find((o) => o.key === value);
      return (
        <div key={col.id} className="flex items-center justify-between py-2 border-b border-[#F0F0F5]">
          <span className="text-[13px] text-[#676879] w-32 flex-shrink-0">{col.label}</span>
          <div className="flex-1 flex flex-wrap gap-1.5">
            {opts.map((opt) => (
              <button
                key={opt.key}
                onClick={() => saveValue(col, opt.key)}
                className="px-3 py-0.5 rounded-full text-xs font-medium transition-all"
                style={{
                  backgroundColor: value === opt.key ? opt.color : `${opt.color}22`,
                  color: value === opt.key ? "#fff" : opt.color,
                  border: `1px solid ${opt.color}44`,
                  fontWeight: value === opt.key ? 600 : 400,
                }}
              >
                {opt.label}
              </button>
            ))}
            {currentOpt === undefined && value && (
              <span
                className="px-3 py-0.5 rounded-full text-xs font-medium"
                style={{ backgroundColor: "#E6E9EF", color: "#676879" }}
              >
                {value}
              </span>
            )}
          </div>
        </div>
      );
    }

    if (col.type === "CHECKBOX") {
      return (
        <div key={col.id} className="flex items-center justify-between py-2 border-b border-[#F0F0F5]">
          <span className="text-[13px] text-[#676879] w-32 flex-shrink-0">{col.label}</span>
          <input
            type="checkbox"
            className="w-4 h-4 rounded accent-[#0073EA]"
            checked={!!value}
            onChange={(e) => saveValue(col, e.target.checked)}
          />
        </div>
      );
    }

    if (col.type === "DATE") {
      return (
        <div key={col.id} className="flex items-center justify-between py-2 border-b border-[#F0F0F5]">
          <span className="text-[13px] text-[#676879] w-32 flex-shrink-0">{col.label}</span>
          <input
            type="date"
            className="flex-1 text-[13px] text-[#323338] bg-transparent outline-none border-b border-transparent hover:border-[#D0D4E4] focus:border-[#0073EA] transition-colors"
            value={value ? new Date(value).toISOString().split("T")[0] : ""}
            onChange={(e) => saveValue(col, e.target.value)}
          />
        </div>
      );
    }

    if (col.type === "NUMBER") {
      return (
        <div key={col.id} className="flex items-center justify-between py-2 border-b border-[#F0F0F5]">
          <span className="text-[13px] text-[#676879] w-32 flex-shrink-0">{col.label}</span>
          <input
            type="number"
            className="flex-1 text-[13px] text-[#323338] bg-transparent outline-none border-b border-transparent hover:border-[#D0D4E4] focus:border-[#0073EA] transition-colors"
            defaultValue={value ?? ""}
            onBlur={(e) => saveValue(col, e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            }}
          />
        </div>
      );
    }

    // TEXT, EMAIL, PHONE, LINK
    return (
      <div key={col.id} className="flex items-center justify-between py-2 border-b border-[#F0F0F5]">
        <span className="text-[13px] text-[#676879] w-32 flex-shrink-0">{col.label}</span>
        {col.type === "LINK" && value ? (
          <div className="flex-1 flex items-center gap-2">
            <a
              href={value}
              target="_blank"
              rel="noreferrer"
              className="text-[13px] text-[#0073EA] hover:underline truncate flex items-center gap-1"
            >
              <LinkIcon size={12} />
              {value}
            </a>
          </div>
        ) : (
          <input
            type={col.type === "EMAIL" ? "email" : col.type === "PHONE" ? "tel" : "text"}
            className="flex-1 text-[13px] text-[#323338] bg-transparent outline-none border-b border-transparent hover:border-[#D0D4E4] focus:border-[#0073EA] transition-colors"
            defaultValue={value ?? ""}
            onBlur={(e) => saveValue(col, e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            }}
          />
        )}
      </div>
    );
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Panel — slides in from right */}
      <div className="fixed top-0 right-0 h-full w-[500px] max-w-full bg-white shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="p-4 border-b border-[#E6E9EF] flex-shrink-0">
          <div className="flex items-start justify-between gap-2">
            {editingName ? (
              <input
                autoFocus
                value={nameValue}
                onChange={(e) => setNameValue(e.target.value)}
                onBlur={() => {
                  if (nameValue.trim() && nameValue !== item?.name) {
                    updateNameMut.mutate(nameValue.trim());
                  } else {
                    setEditingName(false);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                  if (e.key === "Escape") {
                    setNameValue(item?.name || "");
                    setEditingName(false);
                  }
                }}
                className="text-lg font-bold text-[#323338] flex-1 border-b-2 border-[#0073EA] outline-none bg-transparent py-0.5"
              />
            ) : (
              <h2
                className="text-lg font-bold text-[#323338] flex-1 cursor-text hover:text-[#0073EA] transition-colors"
                onClick={() => {
                  setNameValue(item?.name || "");
                  setEditingName(true);
                }}
                title="לחץ לעריכה"
              >
                {isLoading ? "טוען..." : item?.name || "פריט"}
              </h2>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-[#676879] hover:text-[#323338] hover:bg-[#F5F6F8] rounded-lg transition-colors flex-shrink-0"
              aria-label="סגור"
            >
              <X size={18} />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-4 mt-3">
            <button
              onClick={() => setActiveTab("details")}
              className={`text-[13px] font-medium pb-1 border-b-2 transition-colors ${
                activeTab === "details"
                  ? "border-[#0073EA] text-[#0073EA]"
                  : "border-transparent text-[#676879] hover:text-[#323338]"
              }`}
            >
              פרטים
            </button>
            <button
              onClick={() => setActiveTab("updates")}
              className={`text-[13px] font-medium pb-1 border-b-2 transition-colors ${
                activeTab === "updates"
                  ? "border-[#0073EA] text-[#0073EA]"
                  : "border-transparent text-[#676879] hover:text-[#323338]"
              }`}
            >
              עדכונים
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <p className="text-[#676879] text-sm text-center py-8">טוען...</p>
          ) : activeTab === "details" ? (
            <div className="space-y-0">
              {/* Column fields */}
              {columns.map((col) => renderField(col))}

              {/* Contact section */}
              <div className="mt-4 pt-4 border-t border-[#E6E9EF]">
                <div className="flex items-center gap-2 mb-3">
                  <User size={15} className="text-[#0073EA]" />
                  <span className="text-[13px] font-semibold text-[#323338]">לקוח</span>
                </div>

                {linkedContact ? (
                  <div className="bg-[#F5F6F8] rounded-lg p-3 flex items-start justify-between gap-2">
                    <div>
                      <p className="text-[13px] font-semibold text-[#323338]">
                        {linkedContact.fullName}
                      </p>
                      {linkedContact.email && (
                        <p className="text-[12px] text-[#676879] flex items-center gap-1 mt-0.5">
                          <Mail size={11} />
                          {linkedContact.email}
                        </p>
                      )}
                      {linkedContact.phone && (
                        <p className="text-[12px] text-[#676879] flex items-center gap-1 mt-0.5">
                          <Phone size={11} />
                          {linkedContact.phone}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        const col = columns.find(
                          (c) => c.key === "contact_id" || c.key === "contactId",
                        );
                        if (col) {
                          updateValuesMut.mutate([{ columnId: col.id, textValue: null }]);
                        }
                      }}
                      className="text-[12px] text-[#676879] hover:text-[#D83A52] transition-colors"
                    >
                      הסר
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="חיפוש לקוח..."
                      value={contactSearch}
                      onChange={(e) => setContactSearch(e.target.value)}
                      onFocus={() => setContactDropdownOpen(true)}
                      className="w-full px-3 py-2 text-[13px] border border-[#D0D4E4] rounded-lg focus:outline-none focus:border-[#0073EA] transition-colors"
                    />
                    {contactDropdownOpen && (
                      <>
                        <div
                          className="fixed inset-0 z-10"
                          onClick={() => setContactDropdownOpen(false)}
                        />
                        <div className="absolute top-full mt-1 right-0 left-0 bg-white border border-[#D0D4E4] rounded-lg shadow-lg z-20 max-h-48 overflow-y-auto">
                          {filteredContacts.length === 0 ? (
                            <p className="text-[12px] text-[#676879] px-3 py-2">לא נמצאו תוצאות</p>
                          ) : (
                            filteredContacts.map((c) => (
                              <button
                                key={c.id}
                                onClick={() => linkContact(c.id)}
                                className="w-full text-right px-3 py-2 hover:bg-[#F5F6F8] transition-colors"
                              >
                                <p className="text-[13px] text-[#323338]">{c.fullName}</p>
                                {c.email && (
                                  <p className="text-[11px] text-[#9699A6]">{c.email}</p>
                                )}
                              </button>
                            ))
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Updates tab */
            <div>
              <p className="text-[12px] text-[#676879] mb-2">הוסף הערה לפריט</p>
              <textarea
                className="w-full h-32 px-3 py-2 text-[13px] border border-[#D0D4E4] rounded-lg focus:outline-none focus:border-[#0073EA] transition-colors resize-none"
                placeholder="כתוב עדכון..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                onBlur={() => {
                  const notesCol = columns.find(
                    (c) => c.key === "notes" || c.label.includes("הערות"),
                  );
                  if (notesCol) {
                    updateValuesMut.mutate([
                      { columnId: notesCol.id, textValue: notes },
                    ]);
                  }
                }}
              />
              {!columns.find((c) => c.key === "notes" || c.label.includes("הערות")) && (
                <p className="text-[11px] text-[#9699A6] mt-1">
                  כדי לשמור הערות, הוסף עמודת טקסט בשם "הערות" לבורד
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
