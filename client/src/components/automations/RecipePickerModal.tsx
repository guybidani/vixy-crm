import { useMemo, useState } from "react";
import { Search, Zap } from "lucide-react";
import Modal from "../shared/Modal";
import { cn } from "../../lib/utils";
import {
  RECIPE_CATEGORIES,
  RECIPE_TEMPLATES,
  type RecipeCategory,
  type RecipeTemplate,
} from "../../lib/automation-recipes";

interface RecipePickerModalProps {
  open: boolean;
  onClose: () => void;
  onPickRecipe: (recipe: RecipeTemplate) => void;
  /** Called when the user clicks "custom automation" — should open the advanced builder. */
  onPickCustom: () => void;
}

type CategoryFilter = "all" | RecipeCategory;

/**
 * Render the recipe sentence with {{placeholder}} tokens styled as blue pills
 * (the unfilled variant shown on the picker card).
 */
function RecipeSentence({ sentence }: { sentence: string }) {
  const parts = sentence.split(/(\{\{\w+\}\})/g);
  return (
    <span className="text-[13px] leading-7 text-[#323338]">
      {parts.map((part, i) => {
        const match = part.match(/^\{\{(\w+)\}\}$/);
        if (match) {
          return (
            <span
              key={i}
              className="inline-block mx-0.5 px-2 py-0.5 rounded-full bg-[#CCE5FF] text-[#0073EA] font-medium text-[12px] align-middle"
            >
              {match[1]}
            </span>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </span>
  );
}

export default function RecipePickerModal({
  open,
  onClose,
  onPickRecipe,
  onPickCustom,
}: RecipePickerModalProps) {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>("all");

  const counts = useMemo<Record<string, number>>(() => {
    const byCategory: Record<string, number> = {};
    for (const r of RECIPE_TEMPLATES) {
      byCategory[r.category] = (byCategory[r.category] || 0) + 1;
    }
    return { all: RECIPE_TEMPLATES.length, ...byCategory };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return RECIPE_TEMPLATES.filter((r) => {
      if (activeCategory !== "all" && r.category !== activeCategory) {
        return false;
      }
      if (!q) return true;
      return (
        r.sentence.toLowerCase().includes(q) ||
        r.template.name.toLowerCase().includes(q)
      );
    });
  }, [query, activeCategory]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="מרכז האוטומציות"
      maxWidth="max-w-4xl"
      className="max-h-[90vh] flex flex-col"
    >
      {/* Search */}
      <div className="px-6 pt-4 pb-3 border-b border-[#E6E9EF]">
        <div className="relative">
          <Search
            size={16}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9699A6] pointer-events-none"
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="חיפוש מתכון אוטומציה..."
            className="w-full pr-9 pl-3 py-2 border border-[#E6E9EF] rounded-[4px] text-[13px] focus:ring-2 focus:ring-[#0073EA]/20 focus:border-[#0073EA] outline-none"
          />
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Sidebar: categories */}
        <aside className="w-[200px] flex-shrink-0 border-l border-[#E6E9EF] bg-[#F6F7FB] overflow-y-auto py-3">
          <button
            onClick={() => setActiveCategory("all")}
            className={cn(
              "w-full flex items-center justify-between px-4 py-2 text-right text-[13px] transition-colors",
              activeCategory === "all"
                ? "bg-white text-[#0073EA] font-semibold border-r-[3px] border-[#0073EA]"
                : "text-[#323338] hover:bg-white/60",
            )}
          >
            <span>כל המתכונים</span>
            <span className="text-[11px] text-[#9699A6]">{counts.all}</span>
          </button>
          {RECIPE_CATEGORIES.map((cat) => {
            const count = counts[cat.id] || 0;
            const active = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={cn(
                  "w-full flex items-center justify-between px-4 py-2 text-right text-[13px] transition-colors",
                  active
                    ? "bg-white font-semibold"
                    : "text-[#323338] hover:bg-white/60",
                )}
                style={active ? { color: cat.color, borderRight: `3px solid ${cat.color}` } : undefined}
              >
                <span className="flex items-center gap-2">
                  <span className="text-base leading-none">{cat.icon}</span>
                  <span>{cat.label}</span>
                </span>
                <span className="text-[11px] text-[#9699A6]">{count}</span>
              </button>
            );
          })}

          {/* Custom automation shortcut */}
          <div className="mt-4 px-3">
            <button
              onClick={onPickCustom}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-[4px] text-[12px] text-[#676879] hover:bg-white hover:text-[#323338] transition-colors text-right"
            >
              <Zap size={14} />
              אוטומציה מותאמת אישית
            </button>
          </div>
        </aside>

        {/* Cards grid */}
        <div className="flex-1 overflow-y-auto p-5">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-14 h-14 rounded-2xl bg-[#F6F7FB] flex items-center justify-center mb-3">
                <Search size={24} className="text-[#9699A6]" />
              </div>
              <h3 className="text-[14px] font-bold text-[#323338] mb-1">
                לא נמצאו מתכונים
              </h3>
              <p className="text-[12px] text-[#9699A6]">
                נסו חיפוש אחר או בחרו קטגוריה אחרת
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filtered.map((recipe) => {
                const cat = RECIPE_CATEGORIES.find(
                  (c) => c.id === recipe.category,
                );
                const color = cat?.color || "#0073EA";
                return (
                  <button
                    key={recipe.id}
                    onClick={() => onPickRecipe(recipe)}
                    className="group text-right p-4 bg-white border border-[#E6E9EF] rounded-[8px] hover:border-[#0073EA]/40 hover:shadow-[0_4px_12px_rgba(0,115,234,0.08)] transition-all"
                    style={{ ["--accent" as string]: color }}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-[20px]"
                        style={{
                          backgroundColor: `${color}1A`,
                          color,
                        }}
                      >
                        {recipe.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <RecipeSentence sentence={recipe.sentence} />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
