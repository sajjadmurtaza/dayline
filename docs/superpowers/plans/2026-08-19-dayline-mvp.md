# Dayline MVP Implementation Plan

> Inline execution in this session. Commits deferred unless the user asks.

**Goal:** Ship a local Dayline app whose Today view answers what / when / how long / now / next, with architecture that can take real connectors later.

**Architecture:** Domain items + pure planning engine + versioned local repository + thin connector interface. UI is shared components over application services.

**Tech stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind 4, next-intl, Zod, Vitest. Persistence: `localStorage` via a repository. No backend.

## Global Constraints

- Path: `/Users/sajjad/work/others/dayline` only. Do not modify Bustan or other apps.
- No user-facing strings in components (next-intl keys).
- Locales: `en`, `ar` with RTL.
- One canonical `Item` union. One `TaskCard` / `EventCard` / `Timeline`.
- Planning never moves fixed events.
- Connectors: interface + local ingest only; registry stubs for google-calendar / outlook disabled.
- No git commit unless the user explicitly asks.

## File map

```
src/i18n/                          locales, routing, request, validate
src/lib/types.ts                   Zod domain types
src/lib/clock.ts                   injectable now()
src/lib/store/                     schema, migrate, repository
src/domains/items/                 item service (CRUD, source ingest)
src/domains/tasks/                 status transitions, estimates
src/domains/events/                fixed events, conflicts
src/domains/notes/                 notes, stickies, convert-to-task
src/domains/projects/              projects
src/domains/timer/                 start/pause/complete sessions
src/domains/capture/               NL parse
src/domains/planning/              fit, now, free-time, proposal
src/domains/brain-dump/            line split → suggestions
src/domains/connectors/            types, registry, local, stubs
src/components/                    shell, timeline, cards, capture, progress
src/app/[locale]/                  today, inbox, upcoming, calendar, projects, notes, brain-dump, search
```

## Tasks

1. Scaffold Next.js + next-intl + Vitest + tokens + AGENTS.md
2. Domain types + store + clock + tests
3. Services: items, tasks, timer, events, notes, projects
4. Capture + brain dump + planning engine + tests
5. Connector types/registry (no live APIs)
6. Shared UI + i18n en/ar
7. Routes + Today golden path
8. Seed demo data + validate:i18n + unit tests green

Each later task consumes the public functions of the earlier domain modules; UI only calls services.
