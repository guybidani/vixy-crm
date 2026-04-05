import { useState, useCallback, useRef } from "react";
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Loader2,
} from "lucide-react";
import PageShell from "../components/layout/PageShell";
import {
  previewImport,
  importContacts,
  importDeals,
  type PreviewResult,
  type ImportResult,
} from "../api/import";

type ImportType = "contacts" | "deals";
type Step = 1 | 2 | 3;

const CONTACT_FIELDS: Array<{ value: string; label: string }> = [
  { value: "", label: "-- דלג --" },
  { value: "firstName", label: "שם פרטי" },
  { value: "lastName", label: "שם משפחה" },
  { value: "email", label: "אימייל" },
  { value: "phone", label: "טלפון" },
  { value: "company", label: "חברה" },
  { value: "status", label: "סטטוס" },
  { value: "source", label: "מקור" },
  { value: "notes", label: "הערות" },
];

const DEAL_FIELDS: Array<{ value: string; label: string }> = [
  { value: "", label: "-- דלג --" },
  { value: "title", label: "שם עסקה" },
  { value: "value", label: "שווי" },
  { value: "stage", label: "שלב" },
  { value: "contactEmail", label: "אימייל איש קשר (לקישור)" },
  { value: "notes", label: "הערות" },
];

function guessMapping(
  headers: string[],
  fields: Array<{ value: string; label: string }>,
): Record<string, string> {
  const mapping: Record<string, string> = {};
  const aliasMap: Record<string, string[]> = {
    firstName: ["first name", "first_name", "firstname", "שם פרטי", "שם"],
    lastName: ["last name", "last_name", "lastname", "שם משפחה", "משפחה"],
    email: ["email", "אימייל", "מייל", "e-mail", "דוא\"ל"],
    phone: ["phone", "טלפון", "tel", "telephone", "נייד", "mobile"],
    company: ["company", "חברה", "organization", "ארגון"],
    status: ["status", "סטטוס"],
    source: ["source", "מקור"],
    notes: ["notes", "הערות", "note"],
    title: ["title", "שם עסקה", "deal", "עסקה", "name"],
    value: ["value", "שווי", "amount", "סכום", "price", "מחיר"],
    stage: ["stage", "שלב"],
    contactEmail: ["contact email", "email", "אימייל", "contact", "איש קשר"],
  };

  const availableFields = fields.map((f) => f.value).filter(Boolean);

  for (const header of headers) {
    const h = header.toLowerCase().trim();
    for (const field of availableFields) {
      const aliases = aliasMap[field] || [field.toLowerCase()];
      if (aliases.some((a) => h === a || h.includes(a))) {
        if (!Object.values(mapping).includes(field)) {
          mapping[header] = field;
          break;
        }
      }
    }
  }

  return mapping;
}

export default function ImportPage() {
  const [step, setStep] = useState<Step>(1);
  const [importType, setImportType] = useState<ImportType>("contacts");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const fields =
    importType === "contacts" ? CONTACT_FIELDS : DEAL_FIELDS;

  const mappedValues = Object.values(mapping).filter(Boolean);
  const hasRequiredMapping =
    importType === "contacts"
      ? mappedValues.some(
          (v) => v === "firstName" || v === "email" || v === "phone",
        )
      : mappedValues.length > 0;
  const showMappingError =
    importType === "contacts" &&
    mappedValues.length > 0 &&
    !hasRequiredMapping;

  const handleFile = useCallback(
    async (f: File) => {
      setFile(f);
      setError(null);
      setLoading(true);
      try {
        const data = await previewImport(f);
        setPreview(data);
        setMapping(guessMapping(data.headers, fields));
        setStep(2);
      } catch (err: unknown) {
        const message =
          err && typeof err === "object" && "message" in err
            ? (err as { message: string }).message
            : "Failed to parse file";
        setError(message);
      } finally {
        setLoading(false);
      }
    },
    [fields],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const f = e.dataTransfer.files?.[0];
      if (f) handleFile(f);
    },
    [handleFile],
  );

  const handleImport = useCallback(async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const importFn =
        importType === "contacts" ? importContacts : importDeals;
      const res = await importFn(file, mapping);
      setResult(res);
      setStep(3);
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "message" in err
          ? (err as { message: string }).message
          : "Import failed";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [file, mapping, importType]);

  const reset = () => {
    setStep(1);
    setFile(null);
    setPreview(null);
    setMapping({});
    setResult(null);
    setError(null);
  };

  return (
    <PageShell
      boardStyle
      emoji="📥"
      title="ייבוא נתונים"
      subtitle="ייבוא אנשי קשר או עסקאות מקובץ CSV"
    >
    <div className="max-w-4xl mx-auto">

      {/* Steps indicator */}
      <div className="flex items-center gap-3 mb-8">
        {[
          { num: 1, label: "העלאת קובץ" },
          { num: 2, label: "מיפוי עמודות" },
          { num: 3, label: "תוצאות" },
        ].map((s, i) => (
          <div key={s.num} className="flex items-center gap-3">
            {i > 0 && (
              <ArrowLeft size={16} className="text-[#9699A6]" />
            )}
            <div className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                  step >= s.num
                    ? "bg-[#0073EA] text-white"
                    : "bg-surface-tertiary text-[#9699A6]"
                }`}
              >
                {s.num}
              </div>
              <span
                className={`text-[13px] ${
                  step >= s.num
                    ? "text-[#323338] font-medium"
                    : "text-[#9699A6]"
                }`}
              >
                {s.label}
              </span>
            </div>
          </div>
        ))}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-[4px] flex items-center gap-2 text-red-700 text-[13px]">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {/* Step 1: Upload */}
      {step === 1 && (
        <div className="space-y-6">
          {/* Type selector */}
          <div className="flex gap-3">
            <button
              onClick={() => setImportType("contacts")}
              className={`px-4 py-2 rounded-[4px] text-[13px] font-medium transition-colors ${
                importType === "contacts"
                  ? "bg-[#0073EA] text-white"
                  : "bg-white text-[#676879] border border-[#E6E9EF] hover:bg-[#F5F6F8]"
              }`}
            >
              אנשי קשר
            </button>
            <button
              onClick={() => setImportType("deals")}
              className={`px-4 py-2 rounded-[4px] text-[13px] font-medium transition-colors ${
                importType === "deals"
                  ? "bg-[#0073EA] text-white"
                  : "bg-white text-[#676879] border border-[#E6E9EF] hover:bg-[#F5F6F8]"
              }`}
            >
              עסקאות
            </button>
          </div>

          {/* Drop zone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-12 flex flex-col items-center gap-4 cursor-pointer transition-colors ${
              dragOver
                ? "border-[#0073EA] bg-[#0073EA]/5"
                : "border-[#E6E9EF] bg-white hover:border-[#0073EA]/50 hover:bg-[#F5F6F8]"
            }`}
          >
            {loading ? (
              <Loader2 size={40} className="text-[#0073EA] animate-spin" />
            ) : (
              <Upload
                size={40}
                className={dragOver ? "text-[#0073EA]" : "text-[#9699A6]"}
              />
            )}
            <div className="text-center">
              <p className="text-[13px] font-medium text-[#323338]">
                {loading
                  ? "מנתח את הקובץ..."
                  : "גרור קובץ לכאן או לחץ לבחירה"}
              </p>
              <p className="text-[12px] text-[#9699A6] mt-1">
                CSV (.csv) - עד 10MB
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />
          </div>
        </div>
      )}

      {/* Step 2: Mapping + Preview */}
      {step === 2 && preview && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-[#E6E9EF] p-4">
            <div className="flex items-center gap-2 mb-4">
              <FileSpreadsheet size={18} className="text-[#0073EA]" />
              <span className="text-[13px] font-medium text-[#323338]">
                {file?.name}
              </span>
              <span className="text-[12px] text-[#9699A6] mr-auto">
                {preview.totalRows.toLocaleString()} שורות
              </span>
            </div>

            {/* Column mapping */}
            <div className="mb-6">
              <h3 className="text-[13px] font-semibold text-[#323338] mb-3">
                מיפוי עמודות
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {preview.headers.map((header) => (
                  <div
                    key={header}
                    className="flex items-center gap-2"
                  >
                    <span className="text-[13px] text-[#676879] w-32 truncate flex-shrink-0">
                      {header}
                    </span>
                    <ArrowRight
                      size={14}
                      className="text-[#9699A6] flex-shrink-0"
                    />
                    <select
                      value={mapping[header] || ""}
                      onChange={(e) =>
                        setMapping((prev) => ({
                          ...prev,
                          [header]: e.target.value,
                        }))
                      }
                      className="flex-1 text-[13px] border border-[#E6E9EF] rounded-[4px] px-2 py-1.5 bg-white text-[#323338] focus:outline-none focus:ring-2 focus:ring-[#0073EA]/20 focus:border-[#0073EA]"
                    >
                      {fields.map((f) => (
                        <option key={f.value} value={f.value}>
                          {f.label}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>

            {/* Preview table */}
            <div>
              <h3 className="text-[13px] font-semibold text-[#323338] mb-3">
                תצוגה מקדימה (5 שורות ראשונות)
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-[#F5F6F8]">
                      {preview.headers.map((h) => (
                        <th
                          key={h}
                          className="px-3 py-2 text-right text-[12px] font-medium text-[#9699A6] whitespace-nowrap"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.preview.map((row, ri) => (
                      <tr
                        key={ri}
                        className="border-t border-[#E6E9EF]"
                      >
                        {row.map((cell, ci) => (
                          <td
                            key={ci}
                            className="px-3 py-2 text-[#323338] whitespace-nowrap max-w-[200px] truncate"
                          >
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Validation error */}
          {showMappingError && (
            <p className="text-[#FB275D] text-[13px]">
              חובה למפות לפחות שם, אימייל או טלפון
            </p>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 justify-between">
            <button
              onClick={reset}
              className="px-4 py-2 text-[13px] text-[#676879] hover:text-[#323338] transition-colors"
            >
              חזור
            </button>
            <button
              onClick={handleImport}
              disabled={loading || !hasRequiredMapping}
              className="px-6 py-2 bg-[#0073EA] hover:bg-[#0060C2] text-white font-semibold rounded-[4px] text-[13px] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading && (
                <Loader2 size={16} className="animate-spin" />
              )}
              {loading ? "מייבא..." : `ייבא ${preview.totalRows.toLocaleString()} שורות`}
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Results */}
      {step === 3 && result && (
        <div className="bg-white rounded-xl border border-[#E6E9EF] p-6 space-y-4">
          <div className="flex items-center gap-3">
            <CheckCircle2 size={24} className="text-green-500" />
            <h2 className="text-lg font-bold text-[#323338]">
              הייבוא הושלם
            </h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="bg-green-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-green-600">
                {result.imported}
              </div>
              <div className="text-xs text-green-700 mt-1">יובאו בהצלחה</div>
            </div>
            <div className="bg-amber-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-amber-600">
                {result.skipped}
              </div>
              <div className="text-xs text-amber-700 mt-1">דולגו</div>
            </div>
            {result.errors.length > 0 && (
              <div className="bg-red-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-red-600">
                  {result.errors.length}
                </div>
                <div className="text-xs text-red-700 mt-1">שגיאות</div>
              </div>
            )}
          </div>

          {result.errors.length > 0 && (
            <div className="bg-[#F5F6F8] rounded-[4px] p-3 max-h-48 overflow-y-auto">
              <h4 className="text-[12px] font-semibold text-[#9699A6] mb-2">
                פרטי שגיאות
              </h4>
              {result.errors.slice(0, 50).map((err, i) => (
                <p
                  key={i}
                  className="text-xs text-red-600 py-0.5"
                >
                  {err}
                </p>
              ))}
              {result.errors.length > 50 && (
                <p className="text-[12px] text-[#9699A6] mt-1">
                  ו-{result.errors.length - 50} שגיאות נוספות...
                </p>
              )}
            </div>
          )}

          <button
            onClick={reset}
            className="px-6 py-2 bg-[#0073EA] hover:bg-[#0060C2] text-white font-semibold rounded-[4px] text-[13px] transition-colors"
          >
            ייבוא נוסף
          </button>
        </div>
      )}
    </div>
    </PageShell>
  );
}
