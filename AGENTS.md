# Dayline

Personal daily operating system. Today is the primary product.

## Law

- Do not hard-code user-facing strings. Use next-intl.
- One canonical `Item` union. Reuse `TaskCard`, `EventCard`, `Timeline`, `StickyNote`.
- UI → services → domain. Persistence and connectors stay at the edge.
- Planning never moves fixed events without an explicit user accept.
- No productivity scores, streaks, or shame copy.
- Locales: `en`, `ar`, `ur`, `ja`, `de`, `fr`, `hi`, `bn`, `tr`, `es`, `id`, `ko`, `zh`, `ru`. RTL: `ar`, `ur`. Adding a locale is JSON + `src/i18n/config.ts` + `load-messages.ts`.
- Time is the interface. `day-view` owns bands; `DayTimeline` / `buildSpine` own spatial layout.
- Icons: custom SVG through `DaylineIcon` (`public/favicon.svg`, `public/og.svg`). Daymark owns companion drawing.
- Motion explains start / complete / drop. Gaps are spatial; human copy lives in the companion.
- Do not show database timestamps. Prefer human clock ranges.

## Commands

```
npm run dev
npm test
npm run validate:i18n
npm run verify
```

Specs:

- `docs/superpowers/specs/2026-08-19-dayline-mvp-design.md`
- `docs/superpowers/specs/2026-08-19-dayline-today-alive-design.md`
- `docs/superpowers/specs/2026-08-19-dayline-visual-system.md`

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
