import { useState } from "react";
import { Download } from "lucide-react";
import toast from "react-hot-toast";
import { downloadExport } from "../../api/export";

interface ExportButtonProps {
  entity: string;
  filters?: { status?: string; search?: string };
}

export default function ExportButton({ entity, filters }: ExportButtonProps) {
  const [loading, setLoading] = useState(false);

  async function handleExport() {
    setLoading(true);
    try {
      await downloadExport(entity, filters);
      toast.success("הקובץ הורד בהצלחה");
    } catch {
      toast.error("שגיאה בייצוא");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleExport}
      disabled={loading}
      className="flex items-center gap-1.5 px-3 py-2 text-sm text-text-secondary hover:text-primary hover:bg-primary-light rounded-lg transition-all disabled:opacity-50"
      title="ייצוא ל-CSV"
    >
      <Download size={15} className={loading ? "animate-bounce" : ""} />
      <span className="hidden sm:inline">ייצוא</span>
    </button>
  );
}
