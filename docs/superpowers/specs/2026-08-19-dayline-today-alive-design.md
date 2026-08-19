# Dayline Today Alive — Design

**Date:** 2026-08-19  
**Status:** Approved (pass A)  
**Scope:** Elevate Today only. No new routes. No new product surfaces.

## Goal

A user opening Today understands within five seconds: where they are in the day, what is happening now, what comes next, how much time they have, and what already happened.

## Architecture (craft ledger)

`$dev` classified this as **design**. Branches: `deep-modules`, `refactor-types`.

| Owner | Fact | Consumers |
|---|---|---|
| `src/domains/planning/day-view.ts` | Time bands, greeting period, next item, minutes free, unfinished list, quiet companion/notice cue | Today, Timeline, Companion, EveningClose, NoticeBanner |
| `src/components/timeline/geometry.ts` | Hour range, Y mapping | DayTimeline, CurrentTimeMarker, TimelineItem |
| `src/components/icons.tsx` | One SVG family | Today surfaces only this pass |
| Existing `Item` / engine / timer / connectors | Unchanged | All |

Deletion test: swapping `day-view.ts` must not require rewriting capture, Inbox, or connectors. Timeline items stay one `TimelineItem` with a `TimeBand` variant — not per-page copies.

`TimeBand` is a closed set: `past | now | next | later`. UI does not re-derive bands with scattered date compares.

Companion is presentational. It does not own copy or scheduling. It renders only when `day-view` returns a cue (not `idle`). Evening close is a separate reusable block driven by the same unfinished list.

Notification foundation is an in-app `Notice` (id, kind, i18n key, optional actions). No OS push, no notification center route.

## Today composition

1. Greeting + date (typography tokens)
2. One-line summary: now / next / free minutes
3. Quick capture (unchanged)
4. Hero `ActiveTask` when running
5. At most one companion+notice
6. `DayTimeline` (past wash, NOW divider, banded items including completed)
7. Evening close when evening/night and unfinished items exist
8. Unscheduled list + pinned stickies (existing `TaskCard` / `StickyNote`)

`AppShell` shows a compact `ActiveTask` dock when a task is running and the user is not on Today.

## Out of this pass

LLM planner, learning estimates, assignment breakdown, brainstorming, rich notes, extra providers, new nav, scores, greeting personal name (no profile field yet).
