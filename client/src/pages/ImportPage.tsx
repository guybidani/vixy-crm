import { useState, useCallback, useRef, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Loader2,
  ExternalLink,
  Users,
  Building2,
  DollarSign,
  Download,
  X,
} from "lucide-react";
import PageShell from "../components/layout/PageShell";
import { useModuleLabel } from "../hooks/useModuleLabel";
import {
  previewImport,
  importContacts,
  importCompanies,
  importDeals,
  type PreviewResult,
  type ImportResult,
  type DuplicateStrategy,
} from "../api/import";
import {
  listCustomFields,
  type CustomField,
} from "../api/custom-fields";

type Step = 1 | 2 | 3 | 4 | 5;

type FieldOption = { value: string; label: string; required?: boolean };

const CONTACT_FIELDS: FieldOption[] = [
  { value: "", label: "— דלג על עמודה זו —" },
  { value: "firstName", label: "שם פרטי" },
  { value: "lastName", label: "שם משפחה" },
  { value: "name", label: "שם מלא (יפוצל אוטומטית)" },
  { value: "email", label: "אימייל" },
  { value: "phone", label: "טלפון" },
  { value: "company", label: "חברה (תיקשר/תיווצר)" },
  { value: "position", label: "תפקיד" },
  { value: "status", label: "סטטוס (LEAD/QUALIFIED/CUSTOMER/…)" },
  { value: "source", label: "מקור" },
  { value: "leadScore", label: "ניקוד ליד (0-100)" },
];

const COMPANY_FIELDS: FieldOption[] = [
  { value: "", label: "— דלג על עמודה זו —" },
  { value: "name", label: "שם חברה" },
  { value: "status", label: "סטטוס (PROSPECT/ACTIVE/…)" },
  { value: "website", label: "אתר" },
  { value: "email", label: "אימייל" },
  { value: "phone", label: "טלפון" },
  { value: "address", label: "כתובת" },
  { value: "industry", label: "תחום" },
  { value: "size", label: "גודל" },
  { value: "notes", label: "הערות" },
];

const DEAL_FIELDS: FieldOption[] = [
  { value: "", label: "— דלג על עמודה זו —" },
  { value: "title", label: "שם עסקה" },
  { value: "value", label: "שווי" },
  { value: "stage", label: "שלב (LEAD/QUALIFIED/…)" },
  { value: "contactEmail", label: "אימייל איש קשר (לקישור)" },
  { value: "notes", label: "הערות" },
];

const ALIAS_MAP: Record<string, string[]> = {
  // contact
  firstName: ["first name", "first_name", "firstname", "שם פרטי", "פרטי"],
  lastName: ["last name", "last_name", "lastname", "שם משפחה", "משפחה"],
  name: ["full name", "fullname", "name", "שם מלא", "שם"],
  email: ["email", "e-mail", "אימייל", "מייל", "דוא״ל", 'דוא"ל'],
  phone: ["phone", "telephone", "tel", "טלפון", "נייד", "mobile", "cell"],
  company: ["company", "חברה", "organization", "organisation", "ארגון"],
  position: ["position", "title", "role", "תפקיד"],
  status: ["status", "סטטוס", "מצב"],
  source: ["source", "מקור", "lead source"],
  leadScore: ["score", "lead score", "ניקוד"],
  // company
  website: ["website", "url", "site", "אתר"],
  address: ["address", "כתובת"],
  industry: ["industry", "תחום", "ענף"],
  size: ["size", "company size", "גודל"],
  notes: ["notes", "note", "הערות"],
  // deal
  title: ["title", "deal", "deal name", "עסקה", "שם עסקה"],
  value: ["value", "amount", "price", "שווי", "סכום", "מחיר"],
  stage: ["stage", "שלב"],
  contactEmail: [
    "contact email",
    "contact",
    "email",
    "איש קשר",
    "אימייל איש קשר",
  ],
};

function guessMapping(
  headers: string[],
  fields: FieldOption[],
  customFields: CustomField[],
): Record<string, string> {
  const mapping: Record<string, string> = {};
  const builtinFields = fields.map((f) => f.value).filter(Boolean);

  for (const header of headers) {
    const h = header.toLowerCase().trim();
    let matched = false;

    // Try built-in field aliases first
    for (const field of builtinFields) {
      const aliases = ALIAS_MAP[field] || [field.toLowerCase()];
      if (aliases.some((a) => h === a.toLowerCase() || h.includes(a.toLowerCase()))) {
        if (!Object.values(mapping).includes(field)) {
          mapping[header] = field;
          matched = true;
          break;
        }
      }
    }

    if (matched) continue;

    // Try custom field by name (exact or includes)
    for (const cf of customFields) {
      const cfKey = `custom:${cf.key}`;
      if (Object.values(mapping).includes(cfKey)) continue;
      const cfName = cf.name.toLowerCase();
      if (h === cfName || h === cf.key.toLowerCase()) {
        mapping[header] = cfKey;
        break;
      }
    }
  }

  return mapping;
}

function entityTypeToServerType(
  t: "contacts" | "deals" | "companies",
): "contact" | "deal" | "company" {
  if (t === "contacts") return "contact";
  if (t === "deals") return "deal";
  return "company";
}

function downloadCsv(filename: string, content: string) {
  // Prepend UTF-8 BOM so Excel opens Hebrew correctly
  const blob = new Blob(["\uFEFF" + content], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function ImportPage() {
  const importLabel = useModuleLabel("import");
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>(1);
  const [entityType, setEntityType] = useState<"contacts" | "deals" | "companies">(
    "contacts",
  );
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [duplicateStrategy, setDuplicateStrategy] =
    useState<DuplicateStrategy>("skip");
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const serverEntityType = entityTypeToServerType(entityType);

  const { data: customFields = [] } = useQuery({
    queryKey: ["custom-fields", serverEntityType],
    queryFn: () => listCustomFields(serverEntityType),
  });

  const builtinFields = useMemo<FieldOption[]>(() => {
    if (entityType === "contacts") return CONTACT_FIELDS;
    if (entityType === "companies") return COMPANY_FIELDS;
    return DEAL_FIELDS;
  }, [entityType]);

  const allFields = useMemo<FieldOption[]>(() => {
    const customOpts: FieldOption[] = customFields.map((cf) => ({
      value: `custom:${cf.key}`,
      label: `${cf.name} (שדה מותאם)`,
    }));
    return [...builtinFields, ...customOpts];
  }, [builtinFields, customFields]);

  // Re-run mapping guess when entity type changes (if preview already loaded)
  useEffect(() => {
    if (preview) {
      setMapping(guessMapping(preview.headers, builtinFields, customFields));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityType, customFields.length]);

  const previewMut = useMutation({
    mutationFn: (f: File) => previewImport(f),
    onSuccess: (data, f) => {
      setPreview(data);
      setFile(f);
      setMapping(guessMapping(data.headers, builtinFields, customFields));
      setError(null);
      setStep(2);
    },
    onError: (err: unknown) => {
      const message =
        err && typeof err === "object" && "message" in err
          ? (err as { message: string }).message
          : "שגיאה בניתוח הקובץ";
      setError(message);
      toast.error(message);
    },
  });

  const doImportMut = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("חסר קובץ");
      if (entityType === "contacts")
        return importContacts(file, mapping, duplicateStrategy);
      if (entityType === "companies")
        return importCompanies(file, mapping, duplicateStrategy);
      return importDeals(file, mapping, duplicateStrategy);
    },
    onSuccess: (data) => {
      setResult(data);
      setStep(5);
      toast.success(
        `ייובאו ${data.imported} רשומות${data.skipped ? `, דולגו ${data.skipped}` : ""}`,
      );
    },
    onError: (err: unknown) => {
      const message =
        err && typeof err === "object" && "message" in err
          ? (err as { message: string }).message
          : "שגיאה בייבוא";
      setError(message);
      toast.error(message);
    },
  });

  const handleFile = useCallback(
    (f: File) => {
      if (f.size > 10 * 1024 * 1024) {
        const msg = "קובץ גדול מ-10MB — אנא פצל אותו";
        setError(msg);
        toast.error(msg);
        return;
      }
      if (
        !f.name.toLowerCase().endsWith(".csv") &&
        f.type !== "text/csv" &&
        f.type !== "application/vnd.ms-excel"
      ) {
        const msg = "רק קבצי CSV נתמכים";
        setError(msg);
        toast.error(msg);
        return;
      }
      setError(null);
      setFile(f);
    },
    [],
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

  const resetAll = () => {
    setStep(1);
    setFile(null);
    setPreview(null);
    setMapping({});
    setResult(null);
    setError(null);
    setDuplicateStrategy("skip");
    setEntityType("contacts");
  };

  // Validation per entity type
  const mappedValues = Object.values(mapping).filter(Boolean);
  const uniqueMapped = Array.from(new Set(mappedValues));
  const duplicateMappedValue = uniqueMapped.length !== mappedValues.length;

  let requiredMappingOk = false;
  if (entityType === "contacts") {
    requiredMappingOk = mappedValues.some((v) =>
      ["firstName", "lastName", "name", "email", "phone"].includes(v),
    );
  } else if (entityType === "companies") {
    requiredMappingOk = mappedValues.includes("name");
  } else {
    requiredMappingOk =
      mappedValues.includes("title") && mappedValues.includes("contactEmail");
  }

  const downloadErrorCsv = () => {
    if (!result || !preview) return;
    // preview.preview only has 5 rows — for full error CSV we'd need all rows.
    // We just have the first 5 for this client-side download. Better: ask user to
    // redownload with error indicators. For now, output error list.
    const rows: string[][] = [["row", "error"]];
    for (const f of result.failed) rows.push([String(f.row), f.error]);
    const csv = rows
      .map((r) =>
        r
          .map((c) => (/[",\n]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c))
          .join(","),
      )
      .join("\n");
    downloadCsv("import-errors.csv", csv);
  };

  const entityLabel =
    entityType === "contacts"
      ? "אנשי קשר"
      : entityType === "companies"
        ? "חברות"
        : "עסקאות";

  return (
    <PageShell
      boardStyle
      emoji="📥"
      title={importLabel}
      subtitle="ייבוא אנשי קשר, חברות או עסקאות מקובץ CSV"
    >
      <div className="max-w-5xl mx-auto">
        {/* Steps indicator */}
        <div className="flex items-center gap-2 mb-8 flex-wrap">
          {[
            { num: 1, label: "העלאה" },
            { num: 2, label: "סוג ישות" },
            { num: 3, label: "מיפוי" },
            { num: 4, label: "סקירה" },
            { num: 5, label: "תוצאות" },
          ].map((s, i) => (
            <div key={s.num} className="flex items-center gap-2">
              {i > 0 && <ArrowLeft size={14} className="text-[#9699A6]" />}
              <div className="flex items-center gap-2">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                    step >= s.num
                      ? "bg-[#0073EA] text-white"
                      : "bg-[#F6F7FB] text-[#9699A6]"
                  }`}
                >
                  {step > s.num ? <CheckCircle2 size={16} /> : s.num}
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
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 text-red-700 text-[13px]">
            <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
            <div className="flex-1">{error}</div>
            <button
              onClick={() => setError(null)}
              className="text-red-600 hover:text-red-800"
              aria-label="סגור"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* STEP 1: Upload */}
        {step === 1 && (
          <div className="space-y-6">
            <div
              role="button"
              tabIndex={0}
              aria-label="גרור קובץ לכאן או לחץ לבחירה"
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  fileInputRef.current?.click();
                }
              }}
              className={`border-2 border-dashed rounded-xl p-12 flex flex-col items-center gap-4 cursor-pointer transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0073EA] focus-visible:ring-offset-2 ${
                dragOver
                  ? "border-[#0073EA] bg-[#0073EA]/5"
                  : "border-[#E6E9EF] bg-white hover:border-[#0073EA]/50 hover:bg-[#F6F7FB]"
              }`}
            >
              <Upload
                size={48}
                className={dragOver ? "text-[#0073EA]" : "text-[#9699A6]"}
              />
              <div className="text-center">
                <p className="text-base font-semibold text-[#323338]">
                  גרור קובץ CSV לכאן או לחץ לבחירה
                </p>
                <p className="text-[12px] text-[#9699A6] mt-1">
                  עד 10MB • עד 5,000 שורות • UTF-8 / Windows-1255
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv,application/vnd.ms-excel"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                }}
              />
            </div>

            {file && (
              <div className="bg-white border border-[#E6E9EF] rounded-lg p-4 flex items-center gap-3 shadow-sm">
                <FileSpreadsheet size={24} className="text-[#0073EA]" />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-[#323338] truncate">
                    {file.name}
                  </p>
                  <p className="text-[12px] text-[#9699A6]">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setFile(null);
                  }}
                  className="text-[#9699A6] hover:text-[#323338]"
                  aria-label="הסר קובץ"
                >
                  <X size={16} />
                </button>
              </div>
            )}

            <div className="flex justify-end">
              <button
                onClick={() => file && previewMut.mutate(file)}
                disabled={!file || previewMut.isPending}
                className="px-8 py-2.5 bg-[#0073EA] hover:bg-[#0060C2] text-white font-semibold rounded-lg text-[14px] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm"
              >
                {previewMut.isPending && (
                  <Loader2 size={16} className="animate-spin" />
                )}
                {previewMut.isPending ? "מנתח קובץ..." : "העלה קובץ"}
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Entity type */}
        {step === 2 && preview && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-[#323338]">
              מה ברצונך לייבא?
            </h2>

            <div
              className="grid grid-cols-1 sm:grid-cols-3 gap-4"
              role="radiogroup"
            >
              {[
                {
                  value: "contacts" as const,
                  icon: Users,
                  label: "אנשי קשר",
                  desc: "לקוחות, לידים, אנשי קשר עסקיים",
                },
                {
                  value: "companies" as const,
                  icon: Building2,
                  label: "חברות",
                  desc: "ארגונים ועסקים",
                },
                {
                  value: "deals" as const,
                  icon: DollarSign,
                  label: "עסקאות",
                  desc: "יחובר לאנשי קשר קיימים לפי אימייל",
                },
              ].map(({ value, icon: Icon, label, desc }) => (
                <button
                  key={value}
                  role="radio"
                  aria-checked={entityType === value}
                  onClick={() => setEntityType(value)}
                  className={`text-right p-5 rounded-xl border-2 transition-all ${
                    entityType === value
                      ? "border-[#0073EA] bg-[#0073EA]/5 shadow-sm"
                      : "border-[#E6E9EF] bg-white hover:border-[#0073EA]/40"
                  }`}
                >
                  <div className="flex items-start gap-3 mb-2">
                    <div
                      className={`p-2 rounded-lg ${
                        entityType === value ? "bg-[#0073EA]" : "bg-[#F6F7FB]"
                      }`}
                    >
                      <Icon
                        size={20}
                        className={
                          entityType === value ? "text-white" : "text-[#676879]"
                        }
                      />
                    </div>
                    <div>
                      <h3 className="text-[14px] font-semibold text-[#323338]">
                        {label}
                      </h3>
                      <p className="text-[12px] text-[#9699A6] mt-0.5">
                        {desc}
                      </p>
                    </div>
                  </div>
                  <div className="text-[12px] text-[#676879] mt-3 border-t border-[#E6E9EF] pt-3">
                    {preview.totalRows.toLocaleString()} שורות בקובץ
                  </div>
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between">
              <button
                onClick={() => setStep(1)}
                className="px-4 py-2 text-[13px] text-[#676879] hover:text-[#323338] transition-colors"
              >
                חזור
              </button>
              <button
                onClick={() => setStep(3)}
                className="px-8 py-2.5 bg-[#0073EA] hover:bg-[#0060C2] text-white font-semibold rounded-lg text-[14px] transition-colors shadow-sm"
              >
                המשך למיפוי עמודות
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Mapping */}
        {step === 3 && preview && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-[#E6E9EF] shadow-sm p-5">
              <div className="flex items-center gap-2 mb-5 pb-4 border-b border-[#E6E9EF]">
                <FileSpreadsheet size={18} className="text-[#0073EA]" />
                <span className="text-[14px] font-semibold text-[#323338]">
                  {file?.name}
                </span>
                <span className="text-[12px] text-[#9699A6] mr-auto">
                  {preview.totalRows.toLocaleString()} שורות •{" "}
                  {preview.headers.length} עמודות
                </span>
              </div>

              <h3 className="text-[14px] font-semibold text-[#323338] mb-1">
                מיפוי עמודות CSV לשדות CRM
              </h3>
              <p className="text-[12px] text-[#9699A6] mb-4">
                התאמנו באופן אוטומטי. בדוק ותקן במידת הצורך.
              </p>

              <div className="space-y-2">
                {preview.headers.map((header, hi) => {
                  const sampleValues = preview.preview
                    .map((row) => row[hi])
                    .filter(Boolean)
                    .slice(0, 3);
                  return (
                    <div
                      key={header}
                      className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-3 items-center p-3 rounded-lg hover:bg-[#F6F7FB] transition-colors"
                    >
                      <div className="min-w-0">
                        <div className="text-[13px] font-medium text-[#323338] truncate">
                          {header}
                        </div>
                        {sampleValues.length > 0 && (
                          <div className="text-[11px] text-[#9699A6] mt-0.5 truncate">
                            דוגמה: {sampleValues.join(" • ")}
                          </div>
                        )}
                      </div>
                      <ArrowRight
                        size={16}
                        className="text-[#9699A6] hidden sm:block"
                      />
                      <select
                        value={mapping[header] || ""}
                        onChange={(e) =>
                          setMapping((prev) => ({
                            ...prev,
                            [header]: e.target.value,
                          }))
                        }
                        className="text-[13px] border border-[#E6E9EF] rounded-lg px-3 py-2 bg-white text-[#323338] focus:outline-none focus:ring-2 focus:ring-[#0073EA]/20 focus:border-[#0073EA]"
                      >
                        {allFields.map((f) => {
                          const usedByOther =
                            f.value &&
                            Object.entries(mapping).some(
                              ([h, v]) => v === f.value && h !== header,
                            );
                          return (
                            <option
                              key={f.value || "skip"}
                              value={f.value}
                              disabled={!!usedByOther}
                            >
                              {f.label}
                              {usedByOther ? " (בשימוש)" : ""}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Preview table */}
            <div className="bg-white rounded-xl border border-[#E6E9EF] shadow-sm p-5">
              <h3 className="text-[14px] font-semibold text-[#323338] mb-3">
                תצוגה מקדימה (5 שורות ראשונות)
              </h3>
              <div className="overflow-x-auto border border-[#E6E9EF] rounded-lg">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="bg-[#F6F7FB]">
                      {preview.headers.map((h) => {
                        const mapped = mapping[h];
                        const mappedLabel = allFields.find(
                          (f) => f.value === mapped,
                        )?.label;
                        return (
                          <th
                            key={h}
                            className="px-3 py-2 text-right text-[12px] font-medium whitespace-nowrap border-l border-[#E6E9EF] last:border-l-0"
                          >
                            <div className="text-[#323338]">{h}</div>
                            <div
                              className={`text-[11px] font-normal mt-0.5 ${
                                mapped ? "text-[#0073EA]" : "text-[#9699A6]"
                              }`}
                            >
                              {mapped ? `→ ${mappedLabel}` : "(דילוג)"}
                            </div>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.preview.map((row, ri) => (
                      <tr key={ri} className="border-t border-[#E6E9EF]">
                        {preview.headers.map((_, ci) => (
                          <td
                            key={ci}
                            className="px-3 py-2 text-[#323338] whitespace-nowrap max-w-[200px] truncate border-l border-[#E6E9EF] last:border-l-0"
                          >
                            {row[ci] || (
                              <span className="text-[#9699A6]">—</span>
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {!requiredMappingOk && mappedValues.length > 0 && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2 text-amber-800 text-[13px]">
                <AlertTriangle size={16} />
                {entityType === "contacts" &&
                  "חובה למפות לפחות שם, אימייל או טלפון"}
                {entityType === "companies" && "חובה למפות את שם החברה"}
                {entityType === "deals" &&
                  "חובה למפות שם עסקה ואימייל איש קשר"}
              </div>
            )}

            {duplicateMappedValue && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2 text-amber-800 text-[13px]">
                <AlertTriangle size={16} />
                שדה ממופה פעמיים — תקן את המיפוי
              </div>
            )}

            <div className="flex items-center justify-between">
              <button
                onClick={() => setStep(2)}
                className="px-4 py-2 text-[13px] text-[#676879] hover:text-[#323338] transition-colors"
              >
                חזור
              </button>
              <button
                onClick={() => setStep(4)}
                disabled={!requiredMappingOk || duplicateMappedValue}
                className="px-8 py-2.5 bg-[#0073EA] hover:bg-[#0060C2] text-white font-semibold rounded-lg text-[14px] transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                המשך לסקירה
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: Review */}
        {step === 4 && preview && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-[#E6E9EF] shadow-sm p-6">
              <h2 className="text-lg font-semibold text-[#323338] mb-4">
                סיכום ייבוא
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <div className="bg-[#F6F7FB] rounded-lg p-4">
                  <div className="text-[12px] text-[#9699A6] mb-1">
                    סוג נתונים
                  </div>
                  <div className="text-[15px] font-semibold text-[#323338]">
                    {entityLabel}
                  </div>
                </div>
                <div className="bg-[#F6F7FB] rounded-lg p-4">
                  <div className="text-[12px] text-[#9699A6] mb-1">
                    שורות לייבוא
                  </div>
                  <div className="text-[15px] font-semibold text-[#323338]">
                    {preview.totalRows.toLocaleString()}
                  </div>
                </div>
                <div className="bg-[#F6F7FB] rounded-lg p-4">
                  <div className="text-[12px] text-[#9699A6] mb-1">
                    שדות ממופים
                  </div>
                  <div className="text-[15px] font-semibold text-[#323338]">
                    {mappedValues.length} מתוך {preview.headers.length}
                  </div>
                </div>
              </div>

              <h3 className="text-[14px] font-semibold text-[#323338] mb-3">
                טיפול בכפילויות
              </h3>
              <div
                className="space-y-2 mb-2"
                role="radiogroup"
                aria-label="duplicate handling"
              >
                {[
                  {
                    value: "skip" as const,
                    label: "דלג על כפולים",
                    desc:
                      entityType === "contacts"
                        ? "אם אימייל כבר קיים — לא נוצר רשומה חדשה (מומלץ)"
                        : entityType === "companies"
                          ? "אם שם החברה כבר קיים — דלג"
                          : "צור תמיד עסקאות חדשות",
                  },
                  {
                    value: "update" as const,
                    label: "עדכן קיימים",
                    desc: "אם קיים — דרוס נתונים קיימים בנתוני CSV",
                  },
                  {
                    value: "create" as const,
                    label: "צור חדשים תמיד",
                    desc: "אפשר רשומות כפולות (לא מומלץ)",
                  },
                ].map(({ value, label, desc }) => (
                  <button
                    key={value}
                    role="radio"
                    aria-checked={duplicateStrategy === value}
                    onClick={() => setDuplicateStrategy(value)}
                    disabled={entityType === "deals" && value !== "skip"}
                    className={`w-full text-right p-3 rounded-lg border-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                      duplicateStrategy === value
                        ? "border-[#0073EA] bg-[#0073EA]/5"
                        : "border-[#E6E9EF] bg-white hover:border-[#0073EA]/40"
                    }`}
                  >
                    <div className="text-[13px] font-semibold text-[#323338]">
                      {label}
                    </div>
                    <div className="text-[12px] text-[#9699A6] mt-0.5">
                      {desc}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <button
                onClick={() => setStep(3)}
                className="px-4 py-2 text-[13px] text-[#676879] hover:text-[#323338] transition-colors"
                disabled={doImportMut.isPending}
              >
                חזור
              </button>
              <button
                onClick={() => doImportMut.mutate()}
                disabled={doImportMut.isPending}
                className="px-8 py-2.5 bg-[#0073EA] hover:bg-[#0060C2] text-white font-semibold rounded-lg text-[14px] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm"
              >
                {doImportMut.isPending && (
                  <Loader2 size={16} className="animate-spin" />
                )}
                {doImportMut.isPending
                  ? "מייבא..."
                  : `התחל ייבוא ${preview.totalRows.toLocaleString()} שורות`}
              </button>
            </div>

            {doImportMut.isPending && (
              <div className="bg-white rounded-xl border border-[#E6E9EF] p-4 shadow-sm">
                <div className="flex items-center gap-3 mb-2">
                  <Loader2
                    size={18}
                    className="animate-spin text-[#0073EA]"
                  />
                  <span className="text-[13px] text-[#323338]">
                    מעבד ושומר במסד הנתונים...
                  </span>
                </div>
                <div className="h-2 bg-[#F6F7FB] rounded-full overflow-hidden">
                  <div className="h-full bg-[#0073EA] animate-pulse w-full" />
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 5: Results */}
        {step === 5 && result && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-[#E6E9EF] shadow-sm p-6">
              <div className="flex items-center gap-3 mb-5">
                <CheckCircle2 size={28} className="text-green-500" />
                <h2 className="text-xl font-bold text-[#323338]">
                  הייבוא הושלם
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
                <div className="bg-green-50 border border-green-200 rounded-xl p-5 text-center">
                  <CheckCircle2
                    size={24}
                    className="text-green-500 mx-auto mb-2"
                  />
                  <div className="text-3xl font-bold text-green-700">
                    {result.imported}
                  </div>
                  <div className="text-[12px] text-green-700 mt-1">
                    יובאו בהצלחה
                  </div>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 text-center">
                  <AlertTriangle
                    size={24}
                    className="text-amber-500 mx-auto mb-2"
                  />
                  <div className="text-3xl font-bold text-amber-700">
                    {result.skipped}
                  </div>
                  <div className="text-[12px] text-amber-700 mt-1">
                    דולגו
                  </div>
                </div>
                <div
                  className={`${result.failed.length > 0 ? "bg-red-50 border-red-200" : "bg-[#F6F7FB] border-[#E6E9EF]"} border rounded-xl p-5 text-center`}
                >
                  <AlertCircle
                    size={24}
                    className={`${result.failed.length > 0 ? "text-red-500" : "text-[#9699A6]"} mx-auto mb-2`}
                  />
                  <div
                    className={`text-3xl font-bold ${result.failed.length > 0 ? "text-red-700" : "text-[#676879]"}`}
                  >
                    {result.failed.length}
                  </div>
                  <div
                    className={`text-[12px] mt-1 ${result.failed.length > 0 ? "text-red-700" : "text-[#676879]"}`}
                  >
                    נכשלו
                  </div>
                </div>
              </div>

              {result.failed.length > 0 && (
                <div className="border border-[#E6E9EF] rounded-lg overflow-hidden">
                  <div className="flex items-center justify-between p-3 bg-[#F6F7FB] border-b border-[#E6E9EF]">
                    <h4 className="text-[13px] font-semibold text-[#323338]">
                      שורות שנכשלו
                    </h4>
                    <button
                      onClick={downloadErrorCsv}
                      className="flex items-center gap-1.5 text-[12px] text-[#0073EA] hover:underline"
                    >
                      <Download size={12} />
                      הורד CSV של השגיאות
                    </button>
                  </div>
                  <div className="max-h-56 overflow-y-auto">
                    {result.failed.slice(0, 100).map((f, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-2 px-3 py-2 text-[12px] border-b border-[#E6E9EF] last:border-b-0"
                      >
                        <span className="font-mono text-[#9699A6] flex-shrink-0">
                          שורה {f.row}
                        </span>
                        <span className="text-red-700">{f.error}</span>
                      </div>
                    ))}
                    {result.failed.length > 100 && (
                      <div className="px-3 py-2 text-[12px] text-[#9699A6] text-center bg-[#F6F7FB]">
                        ו-{result.failed.length - 100} שגיאות נוספות — הורד
                        CSV לרשימה מלאה
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 justify-end">
              <button
                onClick={resetAll}
                className="px-5 py-2.5 bg-white border border-[#E6E9EF] hover:bg-[#F6F7FB] text-[#323338] font-medium rounded-lg text-[13px] transition-colors"
              >
                ייבא קובץ נוסף
              </button>
              <button
                onClick={() =>
                  navigate(
                    entityType === "contacts"
                      ? "/contacts"
                      : entityType === "companies"
                        ? "/companies"
                        : "/deals",
                  )
                }
                className="flex items-center gap-1.5 px-5 py-2.5 bg-[#0073EA] hover:bg-[#0060C2] text-white font-semibold rounded-lg text-[13px] transition-colors shadow-sm"
              >
                <ExternalLink size={14} />
                {entityType === "contacts"
                  ? "עבור לאנשי קשר"
                  : entityType === "companies"
                    ? "עבור לחברות"
                    : "עבור לעסקאות"}
              </button>
            </div>
          </div>
        )}
      </div>
    </PageShell>
  );
}
