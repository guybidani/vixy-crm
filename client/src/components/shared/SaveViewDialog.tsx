import { useState } from "react";
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

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    onSave(name.trim(), isDefault);
  }

  return (
    <Modal open={open} onClose={onClose} title="שמור תצוגה">
      <form onSubmit={handleSubmit} className="p-5 space-y-4">
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">
            שם התצוגה
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="שם התצוגה"
            className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            autoFocus
            required
          />
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={isDefault}
            onChange={(e) => setIsDefault(e.target.checked)}
            className="w-4 h-4 rounded border-border text-primary focus:ring-primary/30"
          />
          <span className="text-sm text-text-secondary">הגדר כברירת מחדל</span>
        </label>

        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2 bg-surface-tertiary hover:bg-border text-text-secondary font-semibold rounded-lg transition-colors text-sm"
          >
            ביטול
          </button>
          <button
            type="submit"
            disabled={saving || !name.trim()}
            className="flex-1 py-2 bg-primary hover:bg-primary-hover text-white font-semibold rounded-lg transition-colors text-sm disabled:opacity-50"
          >
            {saving ? "שומר..." : "שמור"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
