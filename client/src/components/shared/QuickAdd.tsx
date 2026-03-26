import { useState, useEffect, useRef } from "react";
import { handleMutationError } from "../../lib/utils";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { X, Users, Handshake, Ticket, CheckSquare, Search } from "lucide-react";
import toast from "react-hot-toast";
import { createContact } from "../../api/contacts";
import { createDeal } from "../../api/deals";
import { createTicket } from "../../api/tickets";
import { createTask } from "../../api/tasks";
import { useWorkspaceOptions } from "../../hooks/useWorkspaceOptions";

type QuickType = "contact" | "deal" | "ticket" | "task";

const QUICK_TYPES: {
  key: QuickType;
  label: string;
  icon: React.ReactNode;
  color: string;
  bg: string;
}[] = [
  {
    key: "contact",
    label: "איש קשר",
    icon: <Users size={20} />,
    color: "#6161FF",
    bg: "#E8E8FF",
  },
  {
    key: "deal",
    label: "עסקה",
    icon: <Handshake size={20} />,
    color: "#00CA72",
    bg: "#D6F5E8",
  },
  {
    key: "ticket",
    label: "פניה",
    icon: <Ticket size={20} />,
    color: "#FDAB3D",
    bg: "#FEF0D8",
  },
  {
    key: "task",
    label: "משימה",
    icon: <CheckSquare size={20} />,
    color: "#A25DDC",
    bg: "#EDE1F5",
  },
];

interface QuickAddProps {
  open: boolean;
  onClose: () => void;
  initialType?: QuickType | null;
}

export default function QuickAdd({ open, onClose, initialType }: QuickAddProps) {
  const [type, setType] = useState<QuickType | null>(null);
  const [search, setSearch] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (open) {
      setType(initialType ?? null);
      setSearch("");
      if (!initialType) {
        setTimeout(() => searchRef.current?.focus(), 100);
      }
    }
  }, [open, initialType]);

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (type) setType(null);
        else onClose();
      }
    }
    if (open) {
      window.addEventListener("keydown", onKey);
      return () => window.removeEventListener("keydown", onKey);
    }
  }, [open, type, onClose]);

  if (!open) return null;

  const filteredTypes = search
    ? QUICK_TYPES.filter((t) => t.label.includes(search))
    : QUICK_TYPES;

  return (
    <div
      className="fixed inset-0 bg-black/30 z-50 flex items-start justify-center pt-[15vh]"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-[0_8px_40px_rgba(0,0,0,0.18)] w-full max-w-lg overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {!type ? (
          <>
            {/* Search header */}
            <div className="p-4 border-b border-[#E6E9EF]">
              <div className="relative">
                <Search
                  size={16}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9699A6]"
                />
                <input
                  ref={searchRef}
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="מה ברצונך ליצור?"
                  className="w-full pr-9 pl-4 py-2.5 bg-[#F5F6F8] rounded-[4px] text-sm text-[#323338] placeholder:text-[#9699A6] focus:outline-none focus:ring-2 focus:ring-[#0073EA]/20 focus:bg-white transition-colors"
                  autoFocus
                />
              </div>
            </div>
            {/* Quick actions */}
            <div className="p-2">
              {filteredTypes.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setType(t.key)}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-[#F5F6FF] transition-all text-right group"
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110"
                    style={{ backgroundColor: t.bg, color: t.color }}
                  >
                    {t.icon}
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-[#323338]">
                      {t.label} חדש
                    </span>
                    <span className="text-xs text-[#9699A6] block">
                      יצירה מהירה
                    </span>
                  </div>
                </button>
              ))}
              {filteredTypes.length === 0 && (
                <p className="text-center text-sm text-[#9699A6] py-6">
                  לא נמצאו תוצאות
                </p>
              )}
            </div>
            <div className="px-4 py-2.5 border-t border-[#E6E9EF] flex items-center gap-3 text-[10px] text-[#9699A6] bg-[#F5F6F8]/50">
              <kbd className="px-1.5 py-0.5 bg-white rounded border border-[#E6E9EF] text-[10px] font-mono shadow-sm">
                Ctrl+K
              </kbd>
              <span>פתיחה מהירה</span>
              <kbd className="px-1.5 py-0.5 bg-white rounded border border-[#E6E9EF] text-[10px] font-mono shadow-sm mr-2">
                Esc
              </kbd>
              <span>סגירה</span>
            </div>
          </>
        ) : (
          <QuickForm
            type={type}
            onClose={onClose}
            onBack={() => setType(null)}
            navigate={navigate}
          />
        )}
      </div>
    </div>
  );
}

function QuickForm({
  type,
  onClose,
  onBack,
  navigate,
}: {
  type: QuickType;
  onClose: () => void;
  onBack: () => void;
  navigate: ReturnType<typeof useNavigate>;
}) {
  const { dealStages, priorities } = useWorkspaceOptions();
  const queryClient = useQueryClient();
  const config = QUICK_TYPES.find((t) => t.key === type)!;

  // Contact form
  const [contactForm, setContactForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
  });

  // Deal form
  const [dealForm, setDealForm] = useState({
    title: "",
    value: "",
    stage: "LEAD",
    priority: "MEDIUM",
  });

  // Ticket form
  const [ticketForm, setTicketForm] = useState({
    subject: "",
    description: "",
    priority: "MEDIUM",
  });

  // Task form
  const [taskForm, setTaskForm] = useState({
    title: "",
    dueDate: "",
  });

  const contactMut = useMutation({
    mutationFn: () =>
      createContact({
        firstName: contactForm.firstName,
        lastName: contactForm.lastName,
        email: contactForm.email || undefined,
        phone: contactForm.phone || undefined,
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      toast.success("איש קשר נוצר!");
      onClose();
      navigate(`/contacts/${data.id}`);
    },
    onError: handleMutationError,
  });

  const dealMut = useMutation({
    mutationFn: () =>
      createDeal({
        title: dealForm.title,
        value: dealForm.value ? parseFloat(dealForm.value) : undefined,
        stage: dealForm.stage,
        priority: dealForm.priority,
        contactId: "",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deals"] });
      toast.success("עסקה נוצרה!");
      onClose();
      navigate("/deals");
    },
    onError: handleMutationError,
  });

  const ticketMut = useMutation({
    mutationFn: () =>
      createTicket({
        subject: ticketForm.subject,
        description: ticketForm.description || undefined,
        priority: ticketForm.priority,
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      toast.success("פניה נוצרה!");
      onClose();
      navigate(`/tickets/${data.id}`);
    },
    onError: handleMutationError,
  });

  const taskMut = useMutation({
    mutationFn: () =>
      createTask({
        title: taskForm.title,
        dueDate: taskForm.dueDate || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("משימה נוצרה!");
      onClose();
      navigate("/tasks");
    },
    onError: handleMutationError,
  });

  const isPending =
    contactMut.isPending ||
    dealMut.isPending ||
    ticketMut.isPending ||
    taskMut.isPending;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    switch (type) {
      case "contact":
        contactMut.mutate();
        break;
      case "deal":
        dealMut.mutate();
        break;
      case "ticket":
        ticketMut.mutate();
        break;
      case "task":
        taskMut.mutate();
        break;
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="flex items-center gap-3 p-4 border-b border-[#E6E9EF]">
        <button
          type="button"
          onClick={onBack}
          className="text-[#9699A6] hover:text-[#323338] transition-colors text-sm"
        >
          &larr; חזרה
        </button>
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: config.bg, color: config.color }}
        >
          {config.icon}
        </div>
        <h3 className="text-sm font-bold text-[#323338]">
          {config.label} חדש
        </h3>
        <button
          type="button"
          onClick={onClose}
          className="mr-auto p-1.5 rounded-[4px] hover:bg-[#F5F6F8] transition-colors"
        >
          <X size={16} className="text-[#9699A6]" />
        </button>
      </div>

      <div className="p-4 space-y-3">
        {type === "contact" && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                value={contactForm.firstName}
                onChange={(e) =>
                  setContactForm((f) => ({ ...f, firstName: e.target.value }))
                }
                placeholder="שם פרטי *"
                className="px-3 py-2 border border-[#E6E9EF] rounded-[4px] text-sm focus:outline-none focus:ring-2 focus:ring-[#0073EA]/20 focus:border-[#0073EA]"
                required
                autoFocus
              />
              <input
                type="text"
                value={contactForm.lastName}
                onChange={(e) =>
                  setContactForm((f) => ({ ...f, lastName: e.target.value }))
                }
                placeholder="שם משפחה"
                className="px-3 py-2 border border-[#E6E9EF] rounded-[4px] text-sm focus:outline-none focus:ring-2 focus:ring-[#0073EA]/20 focus:border-[#0073EA]"
              />
            </div>
            <input
              type="email"
              value={contactForm.email}
              onChange={(e) =>
                setContactForm((f) => ({ ...f, email: e.target.value }))
              }
              placeholder="אימייל"
              className="w-full px-3 py-2 border border-[#E6E9EF] rounded-[4px] text-sm focus:outline-none focus:ring-2 focus:ring-[#0073EA]/20 focus:border-[#0073EA]"
            />
            <input
              type="tel"
              value={contactForm.phone}
              onChange={(e) =>
                setContactForm((f) => ({ ...f, phone: e.target.value }))
              }
              placeholder="טלפון"
              className="w-full px-3 py-2 border border-[#E6E9EF] rounded-[4px] text-sm focus:outline-none focus:ring-2 focus:ring-[#0073EA]/20 focus:border-[#0073EA]"
            />
          </>
        )}

        {type === "deal" && (
          <>
            <input
              type="text"
              value={dealForm.title}
              onChange={(e) =>
                setDealForm((f) => ({ ...f, title: e.target.value }))
              }
              placeholder="שם העסקה *"
              className="w-full px-3 py-2 border border-[#E6E9EF] rounded-[4px] text-sm focus:outline-none focus:ring-2 focus:ring-[#0073EA]/20 focus:border-[#0073EA]"
              required
              autoFocus
            />
            <input
              type="number"
              value={dealForm.value}
              onChange={(e) =>
                setDealForm((f) => ({ ...f, value: e.target.value }))
              }
              placeholder="שווי (₪)"
              className="w-full px-3 py-2 border border-[#E6E9EF] rounded-[4px] text-sm focus:outline-none focus:ring-2 focus:ring-[#0073EA]/20 focus:border-[#0073EA]"
            />
            <div className="grid grid-cols-2 gap-3">
              <select
                value={dealForm.stage}
                onChange={(e) =>
                  setDealForm((f) => ({ ...f, stage: e.target.value }))
                }
                className="w-full px-3 py-2 border border-[#E6E9EF] rounded-[4px] text-sm focus:outline-none focus:ring-2 focus:ring-[#0073EA]/20 focus:border-[#0073EA] bg-white"
              >
                {Object.entries(dealStages).map(([key, val]) => (
                  <option key={key} value={key}>
                    {val.label}
                  </option>
                ))}
              </select>
              <select
                value={dealForm.priority}
                onChange={(e) =>
                  setDealForm((f) => ({ ...f, priority: e.target.value }))
                }
                className="w-full px-3 py-2 border border-[#E6E9EF] rounded-[4px] text-sm focus:outline-none focus:ring-2 focus:ring-[#0073EA]/20 focus:border-[#0073EA] bg-white"
              >
                {Object.entries(priorities).map(([key, val]) => (
                  <option key={key} value={key}>
                    {val.label}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}

        {type === "ticket" && (
          <>
            <input
              type="text"
              value={ticketForm.subject}
              onChange={(e) =>
                setTicketForm((f) => ({ ...f, subject: e.target.value }))
              }
              placeholder="נושא הפנייה *"
              className="w-full px-3 py-2 border border-[#E6E9EF] rounded-[4px] text-sm focus:outline-none focus:ring-2 focus:ring-[#0073EA]/20 focus:border-[#0073EA]"
              required
              autoFocus
            />
            <textarea
              value={ticketForm.description}
              onChange={(e) =>
                setTicketForm((f) => ({ ...f, description: e.target.value }))
              }
              placeholder="תיאור (אופציונלי)"
              className="w-full px-3 py-2 border border-[#E6E9EF] rounded-[4px] text-sm focus:outline-none focus:ring-2 focus:ring-[#0073EA]/20 focus:border-[#0073EA] resize-none"
              rows={3}
            />
            <select
              value={ticketForm.priority}
              onChange={(e) =>
                setTicketForm((f) => ({ ...f, priority: e.target.value }))
              }
              className="w-full px-3 py-2 border border-[#E6E9EF] rounded-[4px] text-sm focus:outline-none focus:ring-2 focus:ring-[#0073EA]/20 focus:border-[#0073EA] bg-white"
            >
              {Object.entries(priorities).map(([key, val]) => (
                <option key={key} value={key}>
                  {val.label}
                </option>
              ))}
            </select>
          </>
        )}

        {type === "task" && (
          <>
            <input
              type="text"
              value={taskForm.title}
              onChange={(e) =>
                setTaskForm((f) => ({ ...f, title: e.target.value }))
              }
              placeholder="שם המשימה *"
              className="w-full px-3 py-2 border border-[#E6E9EF] rounded-[4px] text-sm focus:outline-none focus:ring-2 focus:ring-[#0073EA]/20 focus:border-[#0073EA]"
              required
              autoFocus
            />
            <input
              type="date"
              value={taskForm.dueDate}
              onChange={(e) =>
                setTaskForm((f) => ({ ...f, dueDate: e.target.value }))
              }
              className="w-full px-3 py-2 border border-[#E6E9EF] rounded-[4px] text-sm focus:outline-none focus:ring-2 focus:ring-[#0073EA]/20 focus:border-[#0073EA]"
            />
          </>
        )}
      </div>

      <div className="flex gap-3 p-4 border-t border-[#E6E9EF]">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 py-2 bg-[#F5F6F8] hover:bg-border text-[#676879] font-semibold rounded-[4px] transition-colors text-sm"
        >
          ביטול
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="flex-1 py-2 bg-[#0073EA] hover:bg-[#0060C2] text-white font-semibold rounded-[4px] transition-all hover:shadow-md text-sm disabled:opacity-50"
        >
          {isPending ? "שומר..." : "צור"}
        </button>
      </div>
    </form>
  );
}
