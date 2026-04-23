# Vixy CRM - Design System (Master)

## Identity
- **Product Type:** CRM & Client Management SaaS
- **Audience:** Israeli businesses, agencies, sales teams
- **Language:** Hebrew (RTL-first), English fallback
- **Inspiration:** Monday.com — exact visual language (Figtree type, #0073EA blue, slight blue-tinted surfaces)

---

## Style: Flat Design + Micro-interactions

- 2D, clean lines, no decorative gradients
- Subtle shadows for card elevation only
- Typography-focused hierarchy
- Color-coded modules for quick scanning
- Transitions: 100ms ease for buttons, 150-200ms ease for other state changes

---

## Color Palette (Monday.com tokens)

### Primary (Monday blue — NOT purple)
| Token | Hex | Usage |
|-------|-----|-------|
| `--primary` | `#0073EA` | Brand, primary actions, active states, focus rings |
| `--primary-hover` | `#0060C2` | Hover on primary buttons |
| `--primary-active` | `#0060C2` | Pressed state |
| `--primary-selected` | `#CCE5FF` | Selected row/chip tint background |

### Surfaces
| Token | Hex | Usage |
|-------|-----|-------|
| `--bg-primary` | `#FFFFFF` | Cards, modals, sidebars |
| `--bg-secondary` | `#F6F7FB` | Page background (slight blue tint — Monday signature) |
| `--bg-tertiary` | `#E6E9EF` | Inset areas, disabled fields |

### Text
| Token | Hex | Usage |
|-------|-----|-------|
| `--text-primary` | `#323338` | Headings, body text |
| `--text-secondary` | `#676879` | Subtitles, descriptions |
| `--text-tertiary` | `#9699A6` | Muted labels, helper text |
| `--text-placeholder` | `#C5C7D0` | Input placeholders |

### Borders
| Token | Hex | Usage |
|-------|-----|-------|
| `--border` | `#E6E9EF` | Card/table borders, dividers |
| `--border-hover` | `#D0D4E4` | Hovered field borders |
| `--border-focus` | `#0073EA` | Focused field borders |

### Status
| Token | Hex | Usage |
|-------|-----|-------|
| `--success` | `#00C875` | Closed-won, completed, active |
| `--warning` | `#FDAB3D` | In-progress, pending, caution |
| `--danger` | `#E2445C` | Error, overdue, closed-lost |
| `--danger-hover` | `#D62A41` | Danger button hover |
| `--info` | `#579BFC` | Informational, links |

### Accent (non-primary module colors)
| Token | Hex | Usage |
|-------|-----|-------|
| `purple` | `#A25DDC` | Automations, secondary accent |
| `orange` | `#FF642E` | Documents, tertiary accent |
| `sky` | `#66CCFF` | Knowledge base, leads |

### Module Colors (Navigation Dots)
| Module | Color |
|--------|-------|
| Dashboard | `#0073EA` |
| Contacts | `#0073EA` |
| Companies | `#579BFC` |
| Deals | `#00C875` |
| Leads | `#FDAB3D` |
| Tasks | `#A25DDC` |
| Tickets | `#E2445C` |
| Documents | `#FF642E` |
| Knowledge | `#66CCFF` |
| Automations | `#A25DDC` |

---

## Typography

Monday.com uses **Figtree** (primary) with system fallback. Hebrew uses **Rubik** for better native rendering.

| Property | Value |
|----------|-------|
| Font family | `Figtree, Rubik, Poppins, Inter, system-ui, sans-serif` |
| Weights loaded | 400, 500, 600, 700 |
| Letter spacing | `-0.01em` body, `0.15px` buttons |
| Font smoothing | Antialiased |
| Base size | `14px` (data-dense CRM) |
| Line height | `1.5` (body), `1.25` (headings) |

### Scale
| Name | Size | Weight | Usage |
|------|------|--------|-------|
| Page title | `1.5rem` (24px) | 700 | Page headings |
| Section title | `1.125rem` (18px) | 600 | Card/section headers |
| Body | `0.875rem` (14px) | 400 | Default text |
| Small | `0.75rem` (12px) | 400-500 | Badges, captions |
| Label | `0.8125rem` (13px) | 500 | Form labels, nav items |

Google Fonts link is declared in `client/index.html`.

---

## Spacing & Radius

| Token | Value |
|-------|-------|
| Base unit | 4px |
| Common gaps | 8, 12, 16, 24, 32, 48 |
| Page padding | 24px (`p-6`) |
| Card padding | 16-24px |
| `radius-sm` / `DEFAULT` | 4px (buttons, inputs — Monday sharp feel) |
| `radius-md` | 6px |
| `radius-lg` | 8px (cards) |
| `radius-xl` | 12px |
| `radius-2xl` | 16px |

---

## Shadows (Monday tokens)

| Token | Value | Usage |
|-------|-------|-------|
| `--shadow-sm` | `0 1px 2px rgba(0,0,0,0.04)` | Cards at rest |
| `--shadow` | `0 4px 12px rgba(0,0,0,0.08)` | Card hover, low elevation |
| `--shadow-lg` | `0 8px 24px rgba(0,0,0,0.12)` | Modals, raised panels |
| `--shadow-popover` | `0 4px 20px rgba(0,0,0,0.15)` | Popovers, dropdowns, menus |

Tailwind aliases: `shadow-sm`, `shadow`, `shadow-lg`, `shadow-popover`, plus legacy `shadow-card`, `shadow-card-hover`, `shadow-modal`, `shadow-sidebar`, `shadow-glass`.

---

## Buttons

All buttons share: `font-weight: 500`, `letter-spacing: 0.15px`, `border-radius: 4px`, `transition: 0.1s ease`.

| Variant | Class | Background | Hover | Text | Border |
|---------|-------|-----------|-------|------|--------|
| Primary | `.btn .btn-primary` | `#0073EA` | `#0060C2` | white | — |
| Secondary | `.btn .btn-secondary` | white | `#F6F7FB` | `#323338` | `#C5C7D0` |
| Ghost | `.btn .btn-ghost` | transparent | `#F6F7FB` | `#323338` | — |
| Danger | `.btn .btn-danger` | `#E2445C` | `#D62A41` | white | — |

Sizes: default `36px` (padding `0 20px`), `.btn-sm` `30px`, `.btn-lg` `42px`.

Focus: `border-color: #0073EA; box-shadow: 0 0 0 2px rgba(0,115,234,0.25)`.

Modal-specific variants (`.modal-btn-primary`, `.modal-btn-secondary`, `.modal-btn-danger`, `.modal-btn-warning`) are kept for backward compat.

---

## Form Elements

Pre-built component classes in `globals.css`:
- `.input`, `.select`, `.textarea` — 36px height, `#C5C7D0` border, focus ring `rgba(0,115,234,0.1)`
- `.input-error` — red border + light red tint
- `.checkbox`, `.radio` — 16px, checked uses `#0073EA`
- `.form-label`, `.help-text`, `.error-text`, `.form-required`

---

## Layout

| Property | Value |
|----------|-------|
| Direction | RTL (`dir="rtl"`) |
| Sidebar | Fixed right, 240px (collapsed: 64px) |
| Header | Fixed top, 56px height |
| Content max-width | Fluid (with `p-6` padding) |
| Breakpoints | 375 / 640 / 768 / 1024 / 1440 |

---

## Interactive States

| State | Treatment |
|-------|-----------|
| Hover | Lighter background + shadow elevation |
| Active/Press | `scale(0.97)` global button press |
| Focus | `box-shadow: 0 0 0 2px rgba(0,115,234,0.25)`, `border-color: #0073EA` |
| Disabled | `opacity-50`, no pointer events |
| Loading | `animate-pulse` or `.animate-shimmer` |

---

## Components

- **Icon library:** Lucide React
- **No external UI kit** (custom Tailwind components)
- **StatusBadge:** Colored pills for status display
- **DataTable:** Sortable, paginated, searchable
- **KanbanBoard:** DnD columns + cards (dnd-kit)
- **MondayBoard:** Monday.com-style table with groups
- **SidePanel:** Slide-in detail view
- **PageShell:** Page wrapper (title + subtitle + actions)
- **RichTextEditor:** TipTap-based
- **Charts:** Recharts

---

## Anti-Patterns (Avoid)

- Purple `#6161FF` — Monday's primary is blue `#0073EA`
- Emojis as icons (use Lucide SVG)
- Dark mode by default (light is primary)
- Excessive animation (keep functional)
- Raw hex in components (use Tailwind tokens / CSS vars)
- LTR-only patterns (always test RTL)
- Placeholder-only form labels
- Gray-on-gray low-contrast text
