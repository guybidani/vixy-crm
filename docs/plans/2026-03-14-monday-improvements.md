# Monday.com-Inspired CRM Improvements Plan

> Based on hands-on exploration of Monday.com's real UI (March 14, 2026)

## Executive Summary

After thoroughly studying Monday.com's board interactions — cell editing, date picker, owner picker, status dropdown, item detail panel, column center, filter/sort/group-by toolbar, column header options, row context menu, group management, and summary bars — here are the key improvements to bring vixy-crm to Monday.com's level.

**Already done (previous session):** Inline editing cells (Text, Number, Date, Person, Status), useInlineUpdate hook, all pages wired with inline editing.

**This plan:** 12 improvement areas, prioritized by impact.

---

## Phase 1: High Impact, Board-Level UX (Priority: Critical)

### 1. Custom Calendar Date Picker
**Problem:** MondayDateCell uses native HTML5 `<input type="date">` — ugly, inconsistent across browsers, no quick actions.
**Monday.com pattern:** Custom floating calendar with "Today" button, "Add time" option, month/year dropdowns, editable date text input, overdue highlighting, and X to clear.

**Implementation:**
- **File:** `client/src/components/shared/MondayDateCell.tsx` — REWRITE
- **New component:** `client/src/components/shared/CalendarPopover.tsx` — NEW
- Features:
  - Custom calendar grid (Mo–Su, starts Monday for IL locale)
  - "Today" quick-select button
  - Month dropdown + Year dropdown + prev/next arrows
  - Editable date text input at top (type date directly)
  - Today's date has blue circle outline, selected date has solid blue bg
  - Past dates (overdue) show red text in cell display
  - X button on cell to clear
  - Click-outside or Escape to close
  - Positioned with `@floating-ui/react` or absolute positioning
  - Consider using `react-day-picker` library for calendar grid (lightweight, accessible, customizable) instead of building from scratch
- **No server changes**
- **New dependency:** `react-day-picker` (optional, or build custom grid)

### 2. Column Sort in MondayBoard
**Problem:** MondayBoard has NO sort capability. Only DataTable (used in some pages) supports sorting. The board's column headers are not clickable for sorting.
**Monday.com pattern:** Click column header → sort indicator arrow appears. Sort panel in toolbar with multi-column sort, column picker + Ascending/Descending.

**Implementation:**
- **File:** `client/src/components/shared/MondayBoard.tsx` — EDIT
- Add to MondayColumn type: `sortable?: boolean`
- Add sort state: `sortColumn`, `sortDirection` (asc/desc)
- Click column header → toggles sort (none → asc → desc → none)
- Visual: Small arrow indicator in header (↑/↓)
- Sort logic: Applied to items before grouping
- **Toolbar sort panel** (new component):
  - `client/src/components/shared/MondayBoardToolbar.tsx` — NEW
  - Multi-column sort support
  - Column picker dropdown + direction toggle
  - "+ New sort" button for multi-level
- **No server changes** (client-side sort)

### 3. Group By Feature
**Problem:** Groups are hardcoded per page. No way to dynamically group items by a different field.
**Monday.com pattern:** "Group by" button in toolbar → dropdown to pick column → items reorganize into groups based on field values.

**Implementation:**
- **File:** `client/src/components/shared/MondayBoard.tsx` — EDIT
- Add prop: `groupByColumns?: Array<{ key: string; label: string }>`
- Add state: `activeGroupBy: string | null`
- When groupBy is active: client-side groups items by that field value
- Generate colored groups dynamically from unique values
- "Show empty groups" checkbox option
- **Toolbar integration:** Group by dropdown in MondayBoardToolbar
- **No server changes**

### 4. Row Context Menu
**Problem:** No right-click menu on rows. Only a hover-revealed "..." button on some rows.
**Monday.com pattern:** Click "..." or right-click → menu with: Open, Open in new tab, Copy link, Move to, Duplicate, Create new below, Add subitem, Archive, Delete.

**Implementation:**
- **New component:** `client/src/components/shared/RowContextMenu.tsx` — NEW
- Add `onContextMenu` handler to board rows
- Menu items (customizable per page via props):
  - Open (opens detail panel)
  - Copy link (copies URL to clipboard)
  - Duplicate (calls create API with copied data)
  - Move to group (submenu with group list)
  - Delete (with confirmation)
- Positioned at cursor location
- Click-outside to close
- **File:** `client/src/components/shared/MondayBoard.tsx` — EDIT (add context menu trigger)
- **No server changes** (uses existing APIs)

---

## Phase 2: Toolbar & Navigation (Priority: High)

### 5. Enhanced Board Toolbar
**Problem:** Each page has its own ad-hoc toolbar with inconsistent Search/Filter/Export buttons. No unified toolbar pattern.
**Monday.com pattern:** Consistent toolbar below board name: "New item" button + Search + Person filter + Filter + Sort + Hide + Group by + "..." menu.

**Implementation:**
- **New component:** `client/src/components/shared/MondayBoardToolbar.tsx` — NEW
- Props: `onSearch`, `onFilter`, `onSort`, `onGroupBy`, `onHideColumns`, `onExport`, `onNewItem`
- Unified layout matching Monday.com:
  - Left: "New [entity]" primary blue button with dropdown arrow
  - Right: Search | Person | Filter | Sort | Hide | Group by | "..." (export, etc.)
- Active states: Blue text + underline when filter/sort is active, badge count for active filters
- **Integrate into each page** replacing current ad-hoc toolbars
- Pages: DealsPage, ContactsPage, TasksPage, TicketsPage, CompaniesPage — EDIT (5 files)

### 6. Column Visibility Toggle (Hide/Show)
**Problem:** All columns always visible. No way to hide irrelevant columns.
**Monday.com pattern:** "Hide" button in toolbar → checkboxes for each column → toggle visibility.

**Implementation:**
- **Part of MondayBoardToolbar** (new component from #5)
- Dropdown showing all columns with checkboxes
- Hidden columns stored in localStorage per page
- "Show all" / "Hide all" quick actions
- Badge showing count of hidden columns
- **File:** `client/src/components/shared/MondayBoard.tsx` — EDIT (filter columns by visibility)

### 7. Advanced Quick Filters
**Problem:** Current filter system is basic column-value picker. No faceted view, no date presets, no count badges.
**Monday.com pattern:** Quick filters panel with ALL columns shown as facets. Each column shows its unique values with counts. Date columns show smart presets (Overdue, Today, This week, etc.). Status columns show colored labels.

**Implementation:**
- **New component:** `client/src/components/shared/QuickFilterPanel.tsx` — NEW
- Shows all filterable columns as horizontal sections
- Each section: column name + clickable value chips with counts
- Date columns: Smart presets (Overdue, Today, Tomorrow, This week, This month, etc.)
- Status columns: Color-coded labels with counts
- Person columns: Avatar + name + count
- "Clear all" button + "Save as view" placeholder
- Active filters highlighted with blue background
- Replace current filter dropdown in MondayBoard
- **File:** `client/src/components/shared/MondayBoard.tsx` — EDIT

---

## Phase 3: Detail Panel & Communication (Priority: Medium)

### 8. Item Detail Panel - Updates/Activity Tab
**Problem:** Detail panels (DealDetailPanel, ContactDetailPanel) are property editors only. No communication, notes, or activity log.
**Monday.com pattern:** Item detail is primarily an Updates/conversation panel with rich text editor, file attachments, @mentions, and activity log.

**Implementation:**
- **New component:** `client/src/components/shared/ItemUpdatesTab.tsx` — NEW
- Rich text area (basic: bold, italic, bullet lists — use existing textarea with markdown)
- Updates list (newest first) with avatar, timestamp, text
- **New API routes:**
  - `POST /api/notes` — create a note on any entity
  - `GET /api/notes?entityType=deal&entityId=xxx` — list notes
  - `DELETE /api/notes/:id` — delete a note
- **New Prisma model:** `Note` (id, entityType, entityId, content, authorId, createdAt)
- **Database migration** required
- **Integrate into:** DealDetailPanel, ContactDetailPanel, CompanyDetailPage, TasksPage (detail modal)
- **Activity log sub-tab:** Show recent changes (field updates) — read from audit trail or compute from updatedAt

### 9. Column Summary/Aggregation Bar
**Problem:** MondayBoard has a status distribution bar at the bottom of groups, but no column-level aggregation (sum, count, average).
**Monday.com pattern:** Bottom summary row per group showing: status distribution chart, date range (e.g., "Mar 13–15"), number sums, people count.

**Implementation:**
- **File:** `client/src/components/shared/MondayBoard.tsx` — EDIT
- Add optional `summary` function to MondayColumn type
- Built-in summary types:
  - Status: colored distribution bar (already exists for status — extend to all columns)
  - Numbers: sum with currency formatting
  - Dates: range display ("Mar 13 – 15")
  - People: avatar stack
  - Count: item count
- Render summary row after last item in each group
- **No server changes**

---

## Phase 4: Polish & Micro-Interactions (Priority: Nice-to-Have)

### 10. Column Header Enhancements
**Problem:** Column header menu only has Rename and Delete. No sort indicator, no field type icon.
**Monday.com pattern:** Column headers show sort arrows, field type icons, info button, rich options menu (Settings, AI actions, Filter, Sort, Collapse, Group by, Duplicate, Add column, Change type, Rename, Delete).

**Implementation:**
- **File:** `client/src/components/shared/MondayBoard.tsx` — EDIT
- Add sort direction arrow to sorted columns
- Expand column header dropdown:
  - Sort ascending/descending
  - Filter by this column
  - Hide this column
  - Duplicate column (N/A for CRM — skip)
  - Rename
  - Delete
- Field type mini-icon next to column name (optional)

### 11. Keyboard Shortcuts
**Problem:** No keyboard navigation support. Can't navigate cells with arrow keys, can't use Enter to edit, Tab to move between cells.
**Monday.com pattern:** Full keyboard navigation — arrows to move between cells, Enter to edit, Escape to cancel, Tab to move right.

**Implementation:**
- **File:** `client/src/components/shared/MondayBoard.tsx` — EDIT
- Track focused cell state (row index, column index)
- Arrow key navigation between cells
- Enter key to activate edit mode on focused cell
- Tab to move to next cell
- Escape to exit edit mode
- Visual focus ring on focused cell
- This is complex — could be a future phase

### 12. Drag-to-Reorder Rows Between Groups
**Problem:** Items can't be dragged between groups in table view (only in Kanban).
**Monday.com pattern:** Drag row to different group → item moves and updates its group field.

**Implementation:**
- **File:** `client/src/components/shared/MondayBoard.tsx` — EDIT
- Use `@dnd-kit/core` (already used for Kanban)
- Make rows draggable
- Groups are drop targets
- On drop: call update API to change group/status field
- Visual: Blue insertion line between rows during drag
- This is complex — could be a future phase

---

## Implementation Order

| # | Feature | Files | Effort | Impact |
|---|---------|-------|--------|--------|
| 1 | Custom Date Picker | 2 files (rewrite + new) | Medium | High |
| 2 | Column Sort | 2 files (edit + new) | Medium | High |
| 3 | Group By | 1 file (edit) | Medium | High |
| 4 | Row Context Menu | 2 files (new + edit) | Low | Medium |
| 5 | Enhanced Toolbar | 6 files (new + 5 edits) | High | High |
| 6 | Column Visibility | 2 files (toolbar + board) | Low | Medium |
| 7 | Quick Filters | 2 files (new + edit) | High | High |
| 8 | Updates/Activity Tab | 5+ files (new API + UI) | High | High |
| 9 | Column Summaries | 1 file (edit) | Medium | Medium |
| 10 | Column Header Enhancements | 1 file (edit) | Low | Low |
| 11 | Keyboard Shortcuts | 1 file (edit) | High | Medium |
| 12 | Drag Reorder | 1 file (edit) | High | Low |

**Recommended order:** 1 → 2 → 4 → 5 → 3 → 6 → 7 → 9 → 10 → 8 → 11 → 12

---

## Files Summary

| # | File | Action |
|---|------|--------|
| 1 | `client/src/components/shared/MondayDateCell.tsx` | REWRITE |
| 2 | `client/src/components/shared/CalendarPopover.tsx` | NEW |
| 3 | `client/src/components/shared/MondayBoardToolbar.tsx` | NEW |
| 4 | `client/src/components/shared/RowContextMenu.tsx` | NEW |
| 5 | `client/src/components/shared/QuickFilterPanel.tsx` | NEW |
| 6 | `client/src/components/shared/ItemUpdatesTab.tsx` | NEW |
| 7 | `client/src/components/shared/MondayBoard.tsx` | EDIT (sort, groupby, summaries, context menu, column visibility, keyboard) |
| 8 | `client/src/pages/DealsPage.tsx` | EDIT (toolbar) |
| 9 | `client/src/pages/ContactsPage.tsx` | EDIT (toolbar) |
| 10 | `client/src/pages/TasksPage.tsx` | EDIT (toolbar) |
| 11 | `client/src/pages/TicketsPage.tsx` | EDIT (toolbar) |
| 12 | `client/src/pages/CompaniesPage.tsx` | EDIT (toolbar) |
| 13 | `server/src/routes/notes.routes.ts` | NEW (for updates tab) |
| 14 | `server/prisma/schema.prisma` | EDIT (Note model) |

**Total: 6 new files, 8 edits. Server changes only for Phase 3 (Notes/Updates).**

---

## Monday.com Observations Summary

### What Monday.com Does Best (that we should copy):
1. **Every cell is a button** — clicking any cell opens its editor (we already do this)
2. **Custom date picker** with "Today" shortcut and month/year navigation (we use native input)
3. **Faceted quick filters** showing all columns with value counts (we have basic column-value picker)
4. **Multi-level sort** via toolbar (we have no sort in board view)
5. **Dynamic "Group by"** any column (we have hardcoded groups)
6. **Rich column header options** with sort/filter/hide/rename/delete (we only have rename/delete)
7. **Row context menu** with full CRUD actions (we have none)
8. **Summary/aggregation row** per group (status bars, date ranges, number sums)
9. **Item detail = conversation** — updates, files, activity log (we have property editors)
10. **Consistent toolbar** across all boards (Search, Person, Filter, Sort, Hide, Group by)

### What We Already Do Well:
1. Inline editing cells (Text, Number, Date, Person, Status) ✅
2. Group management (rename, color, collapse) ✅
3. Kanban + Table view toggle ✅
4. Bulk selection with bottom action bar ✅
5. Status cell with color picker and edit labels ✅
6. Search across records ✅
7. Export to CSV ✅
8. Multi-workspace support ✅
9. RTL Hebrew UI ✅
10. Responsive sidebar navigation ✅

---

## Deferred / Future Considerations
- **Subitems** — Monday.com supports expandable nested sub-rows. Not critical for CRM but could be useful for deal activities or task breakdowns.
- **Saved Views** — Monday.com allows saving filter/sort/group-by combos as named view tabs. Could add later as localStorage-persisted presets.
- **Column Resize** — Drag column border to adjust width. Low priority, can use fixed reasonable widths.
- **Automations per Board** — Monday.com has per-board automation rules. Our Automations page handles this differently.

---

## Verification Checklist
1. Custom date picker: Click date cell → calendar opens → select date → saved
2. Column sort: Click column header → items reorder → arrow indicator shown
3. Group by: Select "Group by Status" → items reorganize into status groups
4. Context menu: Right-click row → menu appears → "Delete" works
5. Toolbar: Consistent toolbar visible on all board pages
6. Hide columns: Click Hide → uncheck column → column disappears
7. Quick filters: Click Filter → faceted panel → click "Working on it" → board filters
8. Column summaries: Bottom of each group shows date range and status bars
9. `npx tsc --noEmit` passes on client
