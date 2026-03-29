# Architecture Review — Change #30
**Date:** 2026-03-29
**Reviewer:** Claude (automated improve-loop)

---

## Summary

After 30 iterative improvements, the Vixy CRM codebase has matured significantly. This review identifies structural patterns, technical debt, and future improvement opportunities.

---

## Strengths

### 1. Consistent Design System
- All UI follows Monday.com design language: `#0073EA` blue, `#323338` text, `#E6E9EF` borders
- `PageShell` component enforces consistent board-style page layout
- `MondayBoard`, `KanbanBoard`, `DataTable` — clear separation of view modes
- `useWorkspaceOptions()` provides centralized, customizable workspace config with sensible defaults

### 2. Clean Server Architecture
- Express + Prisma stack with clean separation: routes → services → DB
- Zod validation on all routes (`validate` middleware)
- `requireRole` middleware enforces RBAC
- `enqueueAutomationTrigger` fire-and-forget pattern keeps response times fast
- All services follow consistent `list/getById/create/update/remove` interface

### 3. React Query Usage
- Consistent use of `useQuery`/`useMutation` throughout
- Cache invalidation is reliable: most mutations invalidate relevant query keys
- `useWorkspaceOptions` context uses `staleTime: 5m` to avoid excessive refetches

### 4. Auth & Session Management
- JWT + session marker in localStorage for persistence
- `refreshUser()` gracefully clears state on expired tokens
- `useAuth` context exposes `user`, `workspaces`, `currentWorkspaceId`

---

## Issues & Technical Debt

### HIGH: Duplicated Helper Functions Across Components

Multiple components define their own `formatRelativeTime`, `timeAgo`, `avatarColor`, `getWhatsAppUrl` helpers:
- `DealDetailPanel.tsx` has its own `formatRelativeTime` (lines 83–94)
- `TicketsPage.tsx` has its own `timeAgo`
- `ContactDetailPanel.tsx` has its own `timeAgo`
- `lib/utils.ts` and `utils/avatar.ts` and `utils/phone.ts` already export canonical versions

**Fix needed:** Remove all local duplicates, import from shared utilities.

### HIGH: Hardcoded "אני" Avatar in DealDetailPanel

`DealDetailPanel` line 565 uses `<Avatar name="אני" />` for the current user's compose avatar. The `useAuth` hook is already imported but `user` is not destructured. The avatar shows generic initials instead of the real user's name/initials.

### MEDIUM: Pages with Unmaintainable Size

Several pages are 1000–1400 lines with multiple large sub-components inlined:
- `SettingsPage.tsx` (1383 lines) — should split setting tabs into separate files (already partially done with AutomationTab, etc., but `GeneralTab`, `ProfileTab`, `MembersTab` etc. are still inline)
- `TasksPage.tsx` (1337 lines) — `TaskRow`, `InlineCreateRow`, board view all inline
- `BoardPage.tsx` (1355 lines) — `BoardItemDetailPanel` is separate but many sub-components are inlined

**Fix needed:** Extract major sub-components from SettingsPage (GeneralTab, ProfileTab, MembersTab, CannedTab, SlaTab) into separate files under `client/src/components/settings/`.

### MEDIUM: Missing Error Boundaries Around Detail Panels

`DealDetailPanel`, `ContactDetailPanel`, and `TicketDetailPage` lack error boundaries. A thrown exception (e.g., invalid deal data) will crash the entire app rather than showing a graceful error state. `ErrorBoundary.tsx` exists in shared/ but is not used around these panels.

### MEDIUM: No Rate Limiting on Activity Creation

The `POST /api/v1/activities` route has no rate limiting — a single misbehaving client could spam thousands of activities. The `rateLimit.ts` middleware exists but isn't applied to activities routes.

### MEDIUM: Contact Search Doesn't Search Phone Prefix Properly

In `contacts.service.ts`, phone search uses `{ contains: search }` without `mode: "insensitive"`. For Israeli phone numbers (0501234567), users may search "050" and get matches, but "972" or "+972" style numbers won't match because the prefix differs. Could add normalized phone search.

### LOW: `useDebounce` Defined in Multiple Files

`TasksPage.tsx` (line 166) defines its own local `useDebounce` function even though `client/src/hooks/useDebounce.ts` exists as a shared hook. Same pattern likely in other pages.

**Fix needed:** Remove local definitions, import from `../hooks/useDebounce`.

### LOW: `DealDetailPanel` hardcodes only 5 activity types

The compose tabs in `DealDetailPanel` are hardcoded as `["NOTE", "CALL", "EMAIL", "MEETING", "WHATSAPP"]` while the `activityTypes` from `useWorkspaceOptions()` already includes dynamic workspace-customized types. Custom types added in Settings > Options won't appear in the deal compose.

### LOW: WhatsApp "Send" Button is a No-Op

Both `ContactDetailPage` and `ContactDetailPanel` render a WhatsApp message input with a Send button that has no onClick handler and does nothing. This is confusing UX — should either be hidden (marked "coming soon") or removed until the Jony integration is ready.

### LOW: Missing `lastActivityAt` Stamp on Contact Update

`contacts.service.ts` always stamps `lastActivityAt: new Date()` on any update (line 246), even for trivial changes like fixing a typo in `position`. This incorrectly marks the contact as "recently active" and skews recency filters.

---

## Architecture Patterns to Adopt

1. **Shared Pagination Component** — The pagination UI is now duplicated between `ContactsPage` cards view (just added) and `DataTable`. Extract to a `<PaginationBar pagination={...} onPageChange={...} />` shared component.

2. **Shared Activity Compose** — The same "activity type tabs + textarea + submit" compose UI appears in `DealDetailPanel`, `ContactDetailPanel`, `CompanyDetailPage`, and `TicketDetailPage`. Extract to a `<ActivityCompose entityId contactId? dealId? ticketId? />` component.

3. **React Error Boundary Wrapper** — Wrap all detail panels in `ErrorBoundary` for graceful degradation.

4. **Rate Limiting on Write Routes** — Apply rate limits to `activities`, `tasks` creation routes.

---

## Priority Action Items (Next Iterations)

1. Fix `DealDetailPanel` avatar showing "אני" → use real user name
2. Extract shared `ActivityCompose` component (high code reuse)
3. Extract shared `PaginationBar` component
4. Remove local `useDebounce`/`timeAgo`/`formatRelativeTime` duplicates
5. Apply `ErrorBoundary` around `DealDetailPanel` and `ContactDetailPanel`
6. Rate limit activities creation route
