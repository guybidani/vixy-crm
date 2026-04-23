import { useState, useRef, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  Upload,
  Palette,
  RotateCcw,
  Image as ImageIcon,
  LayoutDashboard,
  Users,
  Handshake,
  CheckSquare,
  Lock,
} from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import {
  useWorkspaceOptions,
  DEFAULT_BRAND_COLOR,
} from "../../hooks/useWorkspaceOptions";
import {
  updateBranding,
  uploadBrandingLogo,
} from "../../api/settings";
import { handleMutationError } from "../../lib/utils";

const HEX_REGEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

/** Preset colors matching the Monday.com-style palette already used in the app. */
const PRESET_COLORS = [
  "#0073EA", // default primary blue
  "#0073EA", // indigo
  "#00C875", // success green
  "#FDAB3D", // warning orange
  "#E2445C", // danger pink
  "#A25DDC", // purple
  "#FF642E", // deep orange
  "#579BFC", // sky blue
  "#00C875", // emerald
  "#BB3354", // crimson
  "#323338", // near-black
];

export default function BrandingTab() {
  const { workspaces, currentWorkspaceId } = useAuth();
  const queryClient = useQueryClient();
  const { branding, isLoading } = useWorkspaceOptions();
  const currentRole = workspaces.find((w) => w.id === currentWorkspaceId)?.role;
  const canEdit = currentRole === "OWNER" || currentRole === "ADMIN";

  const [color, setColor] = useState<string>(
    branding.brandColor || DEFAULT_BRAND_COLOR,
  );
  const [colorInput, setColorInput] = useState<string>(color);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(branding.logoUrl);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync local state when the workspace options refetch (e.g. after save).
  useEffect(() => {
    setColor(branding.brandColor || DEFAULT_BRAND_COLOR);
    setColorInput(branding.brandColor || DEFAULT_BRAND_COLOR);
    setPreview(branding.logoUrl);
  }, [branding.brandColor, branding.logoUrl]);

  const uploadMut = useMutation({
    mutationFn: async (file: File) => uploadBrandingLogo(file),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["workspace-options", currentWorkspaceId],
      });
      toast.success("הלוגו הועלה");
      setPendingFile(null);
    },
    onError: (err) => handleMutationError(err),
  });

  const brandingMut = useMutation({
    mutationFn: async (data: { logoUrl?: string | null; brandColor?: string | null }) =>
      updateBranding(data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["workspace-options", currentWorkspaceId],
      });
    },
    onError: (err) => handleMutationError(err),
  });

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("גודל הקובץ לא יכול לעלות על 2MB");
      return;
    }

    setPendingFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  async function onSave() {
    // Validate color
    if (!HEX_REGEX.test(colorInput)) {
      toast.error("צבע לא תקין — יש להזין קוד HEX (למשל #0073EA)");
      return;
    }

    try {
      // Upload new logo first (if any), then persist the color so the two
      // changes surface together.
      if (pendingFile) {
        await uploadMut.mutateAsync(pendingFile);
      }

      await brandingMut.mutateAsync({ brandColor: colorInput });
      toast.success("הגדרות המיתוג נשמרו");
    } catch {
      // errors handled by onError callbacks
    }
  }

  async function onReset() {
    setColor(DEFAULT_BRAND_COLOR);
    setColorInput(DEFAULT_BRAND_COLOR);
    setPendingFile(null);
    setPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";

    try {
      await brandingMut.mutateAsync({
        logoUrl: null,
        brandColor: null,
      });
      toast.success("המיתוג אופס לברירת המחדל");
    } catch {
      // handled above
    }
  }

  const dirty =
    !!pendingFile ||
    colorInput.toUpperCase() !== (branding.brandColor || DEFAULT_BRAND_COLOR).toUpperCase();

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-3xl">
        <div className="bg-white rounded-xl shadow-[0_1px_6px_rgba(0,0,0,0.08)] h-64 animate-pulse" />
      </div>
    );
  }

  if (!canEdit) {
    return (
      <div className="bg-white rounded-xl shadow-[0_1px_6px_rgba(0,0,0,0.08)] p-6 max-w-3xl">
        <p className="text-sm text-[#9699A6] flex items-center gap-2">
          <Lock size={14} />
          רק בעלים ומנהלים יכולים לשנות את המיתוג של סביבת העבודה
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-3xl">
      {/* Logo uploader */}
      <div className="bg-white rounded-xl shadow-[0_1px_6px_rgba(0,0,0,0.08)] p-6">
        <h2 className="text-base font-bold text-[#323338] mb-1 flex items-center gap-2">
          <ImageIcon size={16} className="text-[#0073EA]" />
          לוגו סביבת העבודה
        </h2>
        <p className="text-xs text-[#9699A6] mb-5">
          יוצג בסרגל הצד ובראש המערכת. PNG / JPG / GIF / WebP עד 2MB.
        </p>

        <div className="flex items-center gap-5">
          {/* Current logo */}
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center shadow-sm flex-shrink-0 overflow-hidden"
            style={{
              background: preview
                ? "#FFFFFF"
                : `linear-gradient(135deg, ${color}, ${color}CC)`,
            }}
          >
            {preview ? (
              <img
                src={preview}
                alt="לוגו"
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-white font-bold text-3xl">
                {(workspaces.find((w) => w.id === currentWorkspaceId)?.name || "W")
                  .charAt(0)
                  .toUpperCase()}
              </span>
            )}
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#0073EA] hover:bg-[#0060C2] text-white text-[13px] font-medium rounded-[4px] transition-all hover:shadow-md active:scale-[0.97]"
              >
                <Upload size={14} />
                {branding.logoUrl || pendingFile ? "החלף לוגו" : "העלה לוגו"}
              </button>
              {(branding.logoUrl || pendingFile) && (
                <button
                  onClick={() => {
                    setPendingFile(null);
                    setPreview(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                    // If there's already a saved logo, persist the removal too.
                    if (branding.logoUrl) {
                      brandingMut.mutate({ logoUrl: null });
                    }
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium text-[#676879] border border-[#D0D4E4] rounded-[4px] hover:border-[#E44258] hover:text-[#E44258] transition-colors"
                >
                  הסר
                </button>
              )}
            </div>
            {pendingFile && (
              <p className="text-xs text-[#9699A6] mt-2">
                נבחר: {pendingFile.name} — לחץ "שמור שינויים" כדי להעלות
              </p>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/gif,image/webp"
              className="hidden"
              onChange={onFileChange}
            />
          </div>
        </div>
      </div>

      {/* Brand color */}
      <div className="bg-white rounded-xl shadow-[0_1px_6px_rgba(0,0,0,0.08)] p-6">
        <h2 className="text-base font-bold text-[#323338] mb-1 flex items-center gap-2">
          <Palette size={16} className="text-[#0073EA]" />
          צבע מותג ראשי
        </h2>
        <p className="text-xs text-[#9699A6] mb-5">
          יחליף את הצבע הכחול שמשמש בכפתורים, קישורים ואלמנטים פעילים.
        </p>

        <div className="flex flex-wrap items-center gap-3 mb-4">
          <input
            type="color"
            value={color}
            onChange={(e) => {
              setColor(e.target.value);
              setColorInput(e.target.value.toUpperCase());
            }}
            className="w-12 h-10 rounded-[4px] border border-[#D0D4E4] cursor-pointer bg-white"
            aria-label="בחר צבע"
          />
          <input
            type="text"
            value={colorInput}
            onChange={(e) => {
              const v = e.target.value;
              setColorInput(v);
              if (HEX_REGEX.test(v)) {
                setColor(v);
              }
            }}
            maxLength={7}
            placeholder="#0073EA"
            className="w-32 px-3 py-2 border border-[#D0D4E4] rounded-[4px] text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#0073EA]/20 focus:border-[#0073EA]"
            aria-label="קוד HEX"
          />
          <span
            className="text-[11px] font-semibold px-2.5 py-1 rounded-full text-white"
            style={{ backgroundColor: color }}
          >
            תצוגה
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          {PRESET_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => {
                setColor(c);
                setColorInput(c);
              }}
              className={`w-8 h-8 rounded-[6px] border-2 transition-all hover:scale-110 ${
                color.toUpperCase() === c.toUpperCase()
                  ? "border-[#323338] scale-110 shadow-sm"
                  : "border-transparent"
              }`}
              style={{ backgroundColor: c }}
              aria-label={`צבע ${c}`}
              title={c}
            />
          ))}
        </div>
      </div>

      {/* Preview */}
      <div className="bg-white rounded-xl shadow-[0_1px_6px_rgba(0,0,0,0.08)] p-6">
        <h2 className="text-base font-bold text-[#323338] mb-1">תצוגה מקדימה</h2>
        <p className="text-xs text-[#9699A6] mb-5">כך ייראה הסרגל הצדדי עם המיתוג שלך.</p>

        <div className="bg-[#F6F7FB] rounded-xl p-4 border border-[#EEEFF3]" dir="rtl">
          <div className="bg-white rounded-lg overflow-hidden shadow-sm max-w-[240px]">
            {/* Mini header */}
            <div className="flex items-center gap-2.5 px-3 py-3 border-b border-[#EEEFF3]">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center overflow-hidden flex-shrink-0"
                style={{
                  background: preview
                    ? "#FFFFFF"
                    : `linear-gradient(135deg, ${color}, ${color}CC)`,
                }}
              >
                {preview ? (
                  <img
                    src={preview}
                    alt="לוגו"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-white font-bold text-xs">
                    {(workspaces.find((w) => w.id === currentWorkspaceId)?.name || "W")
                      .charAt(0)
                      .toUpperCase()}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-bold text-[#323338] truncate">
                  {workspaces.find((w) => w.id === currentWorkspaceId)?.name || "סביבת עבודה"}
                </p>
                <p className="text-[11px] text-[#9699A6]">CRM</p>
              </div>
            </div>

            {/* Mini nav items */}
            <div className="p-2 space-y-1">
              <MiniNavItem icon={LayoutDashboard} label="דשבורד" color={color} active />
              <MiniNavItem icon={Users} label="אנשי קשר" color={color} />
              <MiniNavItem icon={Handshake} label="עסקאות" color={color} />
              <MiniNavItem icon={CheckSquare} label="משימות" color={color} />
            </div>

            {/* Mini CTA */}
            <div className="border-t border-[#EEEFF3] p-3">
              <button
                className="w-full px-3 py-2 text-[12px] font-medium text-white rounded-[4px]"
                style={{ backgroundColor: color }}
                type="button"
                tabIndex={-1}
              >
                + משימה חדשה
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={onReset}
          disabled={brandingMut.isPending}
          className="flex items-center gap-1.5 px-4 py-2 text-[13px] font-medium text-[#676879] border border-[#D0D4E4] rounded-[4px] hover:border-[#0073EA] hover:text-[#0073EA] transition-colors disabled:opacity-50"
        >
          <RotateCcw size={14} />
          אפס לברירת מחדל
        </button>
        <button
          onClick={onSave}
          disabled={
            !dirty || uploadMut.isPending || brandingMut.isPending
          }
          className="flex items-center gap-1.5 px-5 py-2 bg-[#0073EA] hover:bg-[#0060C2] text-white text-[13px] font-medium rounded-[4px] transition-all hover:shadow-md active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {uploadMut.isPending || brandingMut.isPending
            ? "שומר..."
            : "שמור שינויים"}
        </button>
      </div>
    </div>
  );
}

function MiniNavItem({
  icon: Icon,
  label,
  color,
  active,
}: {
  icon: typeof LayoutDashboard;
  label: string;
  color: string;
  active?: boolean;
}) {
  if (active) {
    return (
      <div
        className="flex items-center gap-2.5 rounded-[4px] px-2.5 py-2 text-[13px] font-semibold border-r-[3px]"
        style={{
          backgroundColor: `${color}1A`,
          color,
          borderColor: color,
        }}
      >
        <Icon size={14} />
        {label}
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2.5 rounded-[4px] px-2.5 py-2 text-[13px] text-[#676879]">
      <Icon size={14} />
      {label}
    </div>
  );
}
