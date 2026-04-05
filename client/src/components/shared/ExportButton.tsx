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
      aria-busy={loading}
      className="flex items-center gap-1.5 px-3 py-[7px] text-[13px] text-[#676879] hover:text-[#323338] hover:bg-[#F5F6F8] border border-[#D0D4E4] rounded-[4px] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      title="ייצוא ל-CSV"
      aria-label={loading ? "מייצא..." : "ייצוא ל-CSV"}
    >
      <Download size={15} className={loading ? "animate-spin" : ""} />
      <span className="hidden sm:inline">{loading ? "מייצא..." : "ייצוא"}</span>
    </button>
  );
}
