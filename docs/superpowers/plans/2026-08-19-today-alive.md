# Today Alive Implementation Plan

> Inline execution in this session. Commits deferred unless the user asks.

**Goal:** Make Today feel alive and readable in five seconds without changing routes or domain models.

**Architecture:** One `buildDaySnapshot` owner for PAST/NOW/NEXT/LATER and quiet cues. Timeline splits into geometry + CurrentTimeMarker + TimelineItem. Companion and Notice consume the snapshot.

**Tech Stack:** Existing Next.js 16, React 19, next-intl, Vitest, Tailwind 4.

## Global Constraints

- Path: `/Users/sajjad/work/others/dayline` only.
- No user-facing strings in components.
- Locales: `en`, `ar` with RTL.
- One `Item` union. Reuse `TaskCard` / `EventCard` / `StickyNote`.
- Planning never moves fixed events.
- No git commit unless asked.

---

### Task 1: Day snapshot

**Files:**
- Create: `src/domains/planning/day-view.ts`
- Test: `src/domains/planning/day-view.test.ts`
- Modify: `src/domains/workspace/commands.ts` (batch unfinished)

### Task 2: Tokens + icons + reusable Today pieces

**Files:** `src/app/globals.css`, `src/components/icons.tsx`, `active-task.tsx`, `companion.tsx`, `notice-banner.tsx`, `evening-close.tsx`, `today-summary.tsx`

### Task 3: Timeline composition

**Files:** `src/components/timeline/geometry.ts`, `current-time-marker.tsx`, `timeline-item.tsx`, `day-timeline.tsx`; `timeline.tsx` re-exports.

### Task 4: Wire Today + shell + i18n

**Files:** `today-view.tsx`, `app-provider.tsx`, `app-shell.tsx`, `en`/`ar` JSON.

### Task 5: Verify

`npm test`, lint, typecheck, `validate:i18n`, browser Today in `en` and `ar`.
