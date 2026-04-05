import { useState, useEffect } from "react";
import Modal from "./Modal";

interface SaveViewDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (name: string, isDefault: boolean) => void;
  saving?: boolean;
}

export default function SaveViewDialog({
  open,
  onClose,
  onSave,
  saving,
}: SaveViewDialogProps) {
  const [name, setName] = useState("");
  const [isDefault, setIsDefault] = useState(false);

  // Reset form when dialog opens so stale values from previous use don't persist
  useEffect(() => {
    if (open) {
      setName("");
      setIsDefault(false);
    }
  }, [open]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    onSave(name.trim(), isDefault);
  }

  return (
    <Modal open={open} onClose={onClose} title="שמור תצוגה">
      <form onSubmit={handleSubmit} className="p-5 space-y-4">
        <div>
          <label className="block text-sm font-medium text-[#323338] mb-1">
            שם התצוגה
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="שם התצוגה"
            className="w-full px-3 py-2 border border-[#E6E9EF] rounded-[4px] text-sm focus:outline-none focus:ring-2 focus:ring-[#0073EA]/20 focus:border-[#0073EA]"
            autoFocus
            required
          />
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={isDefault}
            onChange={(e) => setIsDefault(e.target.checked)}
            className="w-4 h-4 rounded border-[#E6E9EF] text-[#0073EA] focus:ring-[#0073EA]/20"
          />
          <span className="text-sm text-[#676879]">הגדר כברירת מחדל</span>
        </label>

        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2 bg-[#F5F6F8] hover:bg-[#E6E9EF] text-[#676879] font-semibold rounded-[4px] transition-colors text-sm"
          >
            ביטול
          </button>
          <button
            type="submit"
            disabled={saving || !name.trim()}
            className="flex-1 py-2 bg-[#0073EA] hover:bg-[#0060C2] text-white font-semibold rounded-[4px] transition-colors text-sm disabled:opacity-50"
          >
            {saving ? "שומר..." : "שמור"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
