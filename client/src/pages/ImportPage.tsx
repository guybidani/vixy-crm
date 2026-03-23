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
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">ייבוא נתונים</h1>
        <p className="text-sm text-text-secondary mt-1">
          ייבוא אנשי קשר או עסקאות מקובץ CSV
        </p>
      </div>

      {/* Steps indicator */}
      <div className="flex items-center gap-3 mb-8">
        {[
          { num: 1, label: "העלאת קובץ" },
          { num: 2, label: "מיפוי עמודות" },
          { num: 3, label: "תוצאות" },
        ].map((s, i) => (
          <div key={s.num} className="flex items-center gap-3">
            {i > 0 && (
              <ArrowLeft size={16} className="text-text-tertiary" />
            )}
            <div className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                  step >= s.num
                    ? "bg-primary text-white"
                    : "bg-surface-tertiary text-text-tertiary"
                }`}
              >
                {s.num}
              </div>
              <span
                className={`text-sm ${
                  step >= s.num
                    ? "text-text-primary font-medium"
                    : "text-text-tertiary"
                }`}
              >
                {s.label}
              </span>
            </div>
          </div>
        ))}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-sm">
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
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                importType === "contacts"
                  ? "bg-primary text-white"
                  : "bg-white text-text-secondary border border-border-light hover:bg-surface-secondary"
              }`}
            >
              אנשי קשר
            </button>
            <button
              onClick={() => setImportType("deals")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                importType === "deals"
                  ? "bg-primary text-white"
                  : "bg-white text-text-secondary border border-border-light hover:bg-surface-secondary"
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
                ? "border-primary bg-primary/5"
                : "border-border-light bg-white hover:border-primary/50 hover:bg-surface-secondary"
            }`}
          >
            {loading ? (
              <Loader2 size={40} className="text-primary animate-spin" />
            ) : (
              <Upload
                size={40}
                className={dragOver ? "text-primary" : "text-text-tertiary"}
              />
            )}
            <div className="text-center">
              <p className="text-sm font-medium text-text-primary">
                {loading
                  ? "מנתח את הקובץ..."
                  : "גרור קובץ לכאן או לחץ לבחירה"}
              </p>
              <p className="text-xs text-text-tertiary mt-1">
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
          <div className="bg-white rounded-xl border border-border-light p-4">
            <div className="flex items-center gap-2 mb-4">
              <FileSpreadsheet size={18} className="text-primary" />
              <span className="text-sm font-medium text-text-primary">
                {file?.name}
              </span>
              <span className="text-xs text-text-tertiary mr-auto">
                {preview.totalRows.toLocaleString()} שורות
              </span>
            </div>

            {/* Column mapping */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-text-primary mb-3">
                מיפוי עמודות
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {preview.headers.map((header) => (
                  <div
                    key={header}
                    className="flex items-center gap-2"
                  >
                    <span className="text-sm text-text-secondary w-32 truncate flex-shrink-0">
                      {header}
                    </span>
                    <ArrowRight
                      size={14}
                      className="text-text-tertiary flex-shrink-0"
                    />
                    <select
                      value={mapping[header] || ""}
                      onChange={(e) =>
                        setMapping((prev) => ({
                          ...prev,
                          [header]: e.target.value,
                        }))
                      }
                      className="flex-1 text-sm border border-border-light rounded-lg px-2 py-1.5 bg-white text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
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
              <h3 className="text-sm font-semibold text-text-primary mb-3">
                תצוגה מקדימה (5 שורות ראשונות)
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-surface-secondary">
                      {preview.headers.map((h) => (
                        <th
                          key={h}
                          className="px-3 py-2 text-right text-xs font-medium text-text-tertiary whitespace-nowrap"
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
                        className="border-t border-border-light"
                      >
                        {row.map((cell, ci) => (
                          <td
                            key={ci}
                            className="px-3 py-2 text-text-primary whitespace-nowrap max-w-[200px] truncate"
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

          {/* Actions */}
          <div className="flex items-center gap-3 justify-between">
            <button
              onClick={reset}
              className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
            >
              חזור
            </button>
            <button
              onClick={handleImport}
              disabled={
                loading ||
                !Object.values(mapping).some((v) => v)
              }
              className="px-6 py-2 bg-primary hover:bg-primary-hover text-white font-semibold rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
        <div className="bg-white rounded-xl border border-border-light p-6 space-y-4">
          <div className="flex items-center gap-3">
            <CheckCircle2 size={24} className="text-green-500" />
            <h2 className="text-lg font-bold text-text-primary">
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
            <div className="bg-surface-secondary rounded-lg p-3 max-h-48 overflow-y-auto">
              <h4 className="text-xs font-semibold text-text-tertiary mb-2">
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
                <p className="text-xs text-text-tertiary mt-1">
                  ו-{result.errors.length - 50} שגיאות נוספות...
                </p>
              )}
            </div>
          )}

          <button
            onClick={reset}
            className="px-6 py-2 bg-primary hover:bg-primary-hover text-white font-semibold rounded-lg text-sm transition-colors"
          >
            ייבוא נוסף
          </button>
        </div>
      )}
    </div>
  );
}
