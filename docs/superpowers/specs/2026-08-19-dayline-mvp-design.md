# Dayline MVP — Product & Architecture Spec

**Date:** 2026-08-19  
**Status:** Approved for implementation  
**Product:** Dayline  
**Location:** `/Users/sajjad/work/others/dayline`

## 1. Purpose

Dayline is a personal daily operating system. The user opens one place and immediately understands: what they need to do, when it should happen, how long it will take, what they are doing now, and what is next.

It is not a checklist app, not a calendar clone, and not a notes app. Calendar events consume time. Tasks need time. Notes hold context. Planning fits those pieces into a realistic day without taking control away from the user.

## 2. Golden path (v1)

```
Open Dayline
  → understand today
  → capture something quickly
  → place or plan it
  → start a task
  → see elapsed vs estimated time
  → complete it
  → know what is next
```

Primary surface is **Today**. Other routes exist to support Today, not to compete with it.

## 3. In v1

- Visual daily timeline with a NOW marker
- Tasks and calendar events on the same timeline (fixed vs flexible)
- Estimated duration + running timer + progress (elapsed / estimate)
- Task states: inbox, planned, ready, running, paused, completed, deferred, cancelled
- Quick capture + Inbox
- Notes, sticky notes (max 3 pinned on Today), Brain Dump
- Projects
- Local planning heuristics: fit flexible tasks around fixed events; “what should I do now?”; conflict detection
- Reusable connector interface with a local connector only
- Undo for complete / schedule / delete / move
- English + Arabic (RTL) to prove localization architecture
- Desktop sidebar + mobile bottom nav
- Accessibility: keyboard, labels, contrast, reduced motion, non-color status

## 4. Out of v1

Gmail, Slack, LMS, live Google/Outlook calendars, LLM chat, Pomodoro, exam/assignment planners, energy-aware AI, habits/streaks, location reminders, productivity scores.

These must be addable later **without rewriting** Today, the item model, or the planning engine.

## 5. Mental models (preserve)

| Concept | Meaning |
|---|---|
| Event | Time already committed. Never auto-moved. |
| Task | Work that needs a place. May be scheduled, inbox, or sometime. |
| Estimate | A guess, labeled as such. |
| Timer | Elapsed / estimate. Neutral if over. Not a score. |
| Note | Context. May become a task. Not a schedule. |
| Inbox | Unplaced items. AI/heuristics suggest; user confirms. |
| Connector | External source. Items keep `source`. No silent duplicates. |

## 6. Architecture

Layering (deletion test: swap persistence or add a calendar connector without rewriting Today):

```
UI (app routes + shared components)
        ↓
Application services (task, event, note, project, timer, capture, review)
        ↓
Planning engine (pure functions, no I/O)
        ↓
Domain types (canonical items)
        ↑
Persistence repository (versioned JSON, localStorage)
        ↑
Connector adapters (normalize inbound → domain upsert)
```

- UI never reads `localStorage`.
- Connectors never call the planner.
- Planner never knows about Google vs local.
- Pages compose shared components; they do not own task cards, timers, or notes.

### Canonical model

Discriminated `Item`: `task | event | note | reminder`.

Shared fields: `id`, `title`, `createdAt`, `updatedAt`, `projectId`, `areaId`, `tags`, `source`.

Task-only: status, estimate, actual/elapsed, scheduled start/end, deadline + kind (`none | target | due`), priority, notes, one-level subtasks, dependencies.

Event-only: start/end, location, conference URL, description. Always `flexibility: fixed`.

Note-only: body, `noteType`, `pinnedToday`, links to items.

Wire (storage) is a versioned document. Rehydrate at the repository read seam. Domain code does not persist snake_case JSON shapes.

### Connector contract (v1 unimplemented except local)

```
id, capabilities[], connect, sync, create?, update?, delete?, subscribe?, disconnect
```

`sync()` returns a `NormalizedBatch` of events/tasks/notes/files. An ingest service upserts by `(connectorId, externalId)`. Local items use `source: { kind: "local" }`. Live providers are stubs in the registry with `enabled: false`.

### Planning engine (heuristics, not an LLM)

Inputs: date, working hours, fixed events, flexible tasks, running task.  
Outputs: a **proposal** the user accepts. Never mutates fixed events.  
Also: free-slot matching, “now” recommendation, conflict list, deadline-risk hint.

Natural-language capture is regex/heuristic classification. Uncertain parses surface as “time not set” rather than invented times.

## 7. UI structure

**Today:** date header, quick add, active-task pin, daily summary (next event / free block — not stats), timeline, unscheduled list, up to 3 pinned stickies.

**Secondary:** Inbox, Upcoming, Calendar, Projects, Notes, Brain Dump, Search, Sometime.

**Desktop:** left nav. **Mobile:** Today / Inbox / Add / Calendar / More.

One `TaskCard`, `EventCard`, `NoteCard`, `StickyNote`, `Timeline`, `ProgressBar`, `DurationPicker`, `SourceBadge` used on every screen.

## 8. Design system

CSS tokens: paper background, ink text, event/task/personal/study/focus hues, radius, timeline hour height, motion. No page invents a palette. Color is never the only status signal (icon + text).

## 9. Localization

All user-visible strings live in `src/i18n/locales/{locale}/*.json`. Components call `useTranslations` / `getTranslations`. Dates/times via `Intl`. `dir` from locale config. `validate:i18n` fails on missing keys or hardcoded English in `src/components` / `src/app`.

v1 locales: `en`, `ar`. Adding a locale is JSON + config, not a UI fork.

## 10. Persistence & privacy

Single local document `dayline.local.v1`. No accounts in v1. No outbound sync. Seeded demo day on first launch; user can clear. Undo stack in-memory + persisted last N actions.

## 11. Testing

Domain/planning/capture/store: Vitest. No UI snapshot theater. Golden path covered by unit tests on services + planner.

## 12. Success

A new user can, in one session, see a realistic today, capture “Call Ahmed tomorrow at 3”, start a task, watch elapsed vs estimate, complete it, and see what is next — without leaving Today except to dump a brain or open a project.
