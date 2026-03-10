# Vixy CRM - Design System (Master)

## Identity
- **Product Type:** CRM & Client Management SaaS
- **Audience:** Israeli businesses, agencies, sales teams
- **Language:** Hebrew (RTL-first), English fallback
- **Inspiration:** Monday.com — vibrant, functional, data-dense

---

## Style: Flat Design + Micro-interactions

- 2D, clean lines, no decorative gradients
- Subtle shadows for card elevation only
- Typography-focused hierarchy
- Color-coded modules for quick scanning
- Transitions: 150-200ms ease

---

## Color Palette

### Core
| Token | Hex | Usage |
|-------|-----|-------|
| `primary` | `#6161FF` | Brand, primary actions, active states |
| `primary-hover` | `#4E4ED9` | Hover on primary buttons |
| `primary-light` | `#E8E8FF` | Primary tint backgrounds |
| `primary-dark` | `#4040CC` | Deep emphasis |

### Semantic
| Token | Hex | Usage |
|-------|-----|-------|
| `success` | `#00CA72` | Closed-won, completed, active |
| `warning` | `#FDAB3D` | In-progress, pending, caution |
| `danger` | `#FB275D` | Error, overdue, closed-lost |
| `purple` | `#A25DDC` | Secondary accent, automations |
| `orange` | `#FF642E` | Tertiary accent, documents |
| `sky` | `#66CCFF` | Info, new tickets, leads |
| `info` | `#579BFC` | Links, companies, general info |

### Surfaces
| Token | Hex | Usage |
|-------|-----|-------|
| `surface-default` | `#FFFFFF` | Cards, modals |
| `surface-secondary` | `#F5F6F8` | Page background |
| `surface-tertiary` | `#EBEBEF` | Inset areas, disabled |

### Text
| Token | Hex | Usage |
|-------|-----|-------|
| `text-primary` | `#323338` | Headings, body text |
| `text-secondary` | `#676879` | Subtitles, descriptions |
| `text-tertiary` | `#C3C6D4` | Placeholders, disabled |

### Borders
| Token | Hex | Usage |
|-------|-----|-------|
| `border-default` | `#D0D4E4` | Card borders, dividers |
| `border-light` | `#EEEFF3` | Subtle separators |

### Module Colors (Navigation Dots)
| Module | Color |
|--------|-------|
| Dashboard | `#6161FF` |
| Contacts | `#6161FF` |
| Companies | `#579BFC` |
| Deals | `#00CA72` |
| Leads | `#FDAB3D` |
| Tasks | `#A25DDC` |
| Tickets | `#FB275D` |
| Documents | `#FF642E` |
| Knowledge | `#66CCFF` |
| Automations | `#A25DDC` |

---

## Typography

| Property | Value |
|----------|-------|
| Font family | `Poppins, Inter, system-ui, sans-serif` |
| Letter spacing | `-0.01em` |
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

---

## Spacing & Radius

| Token | Value |
|-------|-------|
| Base unit | 4px |
| Common gaps | 8, 12, 16, 24, 32, 48 |
| Page padding | 24px (`p-6`) |
| Card padding | 16-24px |
| `radius-default` | 8px |
| `radius-lg` | 12px |
| `radius-xl` | 16px |

---

## Shadows

| Token | Value | Usage |
|-------|-------|-------|
| `shadow-card` | `0 1px 4px rgba(0,0,0,0.08)` | Cards at rest |
| `shadow-card-hover` | `0 4px 12px rgba(0,0,0,0.12)` | Card hover |
| `shadow-modal` | `0 8px 32px rgba(0,0,0,0.16)` | Modals, dropdowns |
| `shadow-sidebar` | `1px 0 8px rgba(0,0,0,0.06)` | Fixed sidebar |

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
| Active/Press | `scale(0.98)` subtle press |
| Focus | `ring-2 ring-primary/30 border-primary` |
| Disabled | `opacity-50`, no pointer events |
| Loading | `animate-pulse` or skeleton |

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

- Emojis as icons (use Lucide SVG)
- Dark mode by default (light is primary)
- Excessive animation (keep functional)
- Raw hex in components (use Tailwind tokens)
- LTR-only patterns (always test RTL)
- Placeholder-only form labels
- Gray-on-gray low-contrast text
