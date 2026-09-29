# Dayline

A personal daily operating system. Open one place and see what to do, when it happens, how long it takes, what is happening now, and what comes next.

Events are time already committed. Tasks need a place. Notes hold context. Planning fits those pieces around the calendar without taking control away from you.

There are no accounts, no scores, no streaks, and no shame copy. Data stays in this browser.

Screenshots below are from `http://localhost:3000` at desktop width `1280×800`, except the phone still (`390×844`). English is the walkthrough language. Arabic, Japanese, and Korean stills are in [Language](#language). Recapture with `npm run capture:readme` while `npm run dev` is running. The stills live in `docs/readme/` for GitHub only — `.vercelignore` keeps that folder out of the Vercel upload. They are not in `public/`, so the live site never serves them. Capture freezes the clock at **10:30** so Today is a working morning, and at **20:15** for Closing today.

## How a day works

Today is the product. Other screens exist to feed it.

```mermaid
flowchart LR
  T["Today"] --> S["Now and next"]
  S --> C["Capture"]
  C --> P["Place or Plan my day"]
  P --> R["Start"]
  R --> D["Pause or Done"]
  D --> E["Closing today"]
```

| When                           | What you see                                                                                                    | What to do                                                                             |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| First visit                    | Demo day: standup, presentation, lunch, client call, inbox follow-ups, a sticky note, project **Acme proposal** | Stay on Today. Reset later from **More → Reset demo data**                             |
| Morning / afternoon            | Greeting, date, two lines: what is happening **now**, then **next** (or minutes until it)                       | Read those two lines before scrolling                                                  |
| Something appears in your head | Capture well: “Put anything in your head here.”                                                                 | Type a line. Confirm **Place this** when the parse looks right                         |
| You want a schedule            | **Plan my day** → “Suggested placements”                                                                        | **Accept plan**, **Change**, or **Cancel**. Fixed events never move                    |
| You want a specific gap        | Dashed drop targets on free blocks                                                                              | Drag an unplaced task onto a gap                                                       |
| It is time to work             | Timeline task with **Start**, or **Start** on a Needs a place chip                                              | Tap **Start**. Pause and Done sit on that object                                       |
| A session is live              | Orange live dot, elapsed vs estimate bar, Daymark “Stay with this”                                              | Keep going, **Pause**, or **Done**. **Undo** if that was a miss                        |
| Evening, work still open       | **Closing today** and “N things still need a home”                                                              | Per item **Tomorrow** or **Inbox**, or **Move all to tomorrow**, then **Finish today** |
| Evening, nothing left open     | “That’s today.”                                                                                                 | **Finish today**                                                                       |

The page is cream (`#fff9ed`). Elapsed vs estimate is a duration, not a productivity score.

## Walkthrough

### 1. Open the app

Requires Node 20+ and npm 10+. From the repo root:

```bash
npm install
npm run dev
```

Open [http://localhost:3000/en](http://localhost:3000/en). Every URL includes a locale prefix (`/en`, `/ar`, …). The app does not auto-detect language.

Persistence key: `dayline.local.v1`.

### 2. Today — the whole day

`/en` is the primary screen: greeting, now/next, capture, timeline, and the right rail (Daymark, unplaced work, pinned notes).

![Today](docs/readme/01-today.jpg)

Desktop: slim left nav (expands on hover) + **Add**. Mobile: Today / Inbox / Add / Calendar / More — see [Phone](#12-phone).

### 3. Greeting, date, and Plan my day

The header is the date, not a dashboard title. **Plan my day** is a proposal you accept — it does not rearrange the calendar on its own.

![Header](docs/readme/02-today-header.jpg)

### 4. Now and next

Two lines about _your_ day. Empty time is said plainly. There are no Past / Now / Next / Later beads.

![Now and next](docs/readme/03-today-summary.jpg)

### 5. Capture

Type a line. Regex parse classifies it as a task, event, or note. Uncertain times stay unset. Confirm with **Place this**.

![Capture](docs/readme/04-today-capture.jpg)

### 6. The NOW cut

One continuous timeline: past wash, orange **NOW** cut with clock time, then what is next. Events (solid edge) and tasks (dashed edge) share the same spine.

![NOW cut](docs/readme/05-today-now.jpg)

A flexible task that is due now shows **Ready when you are** and **Start**. Events never shake. Reduced motion uses a static dot instead of a loop.

### 7. Right rail

Daymark speaks to this moment. **Needs a place** holds Inbox work that is not on the timeline yet. Up to three sticky notes can sit on Today (convert to a task, or unpin).

![Right rail](docs/readme/06-today-rail.jpg)

Notices (overlap, running longer than planned, something coming up) attach to the object they are about: Keep going / Wrap up / Adjust day / Dismiss.

### 8. Plan my day

Tap **Plan my day**. Suggested blocks appear on free time, marked **Proposed**. Accept, change, or cancel. Lunch (12:30–13:30 by default) stays occupied. Working hours default to 09:00–18:00.

![Plan preview](docs/readme/07-today-plan.jpg)

### 9. Start a session

Tap **Start** on the presentation (or any task). The block becomes Current: live orange dot, elapsed vs estimate, **Pause** and **Done**. A short **Timer started** toast offers **Undo**. Off Today, the same running task docks above the page.

![Running Today](docs/readme/08-today-running.jpg)

![Live session](docs/readme/08-today-session.jpg)

### 10. Inbox, Calendar, Upcoming

| Screen   | URL            | What to do                                                                        |
| -------- | -------------- | --------------------------------------------------------------------------------- |
| Inbox    | `/en/inbox`    | Unplaced items. Start, move to tomorrow, or return to Today to drop them on a gap |
| Calendar | `/en/calendar` | The same duration blocks, one week at a time                                      |
| Upcoming | `/en/upcoming` | Scheduled after today. The demo seed has nothing here                             |

![Inbox](docs/readme/09-inbox.jpg)

![Calendar](docs/readme/10-calendar.jpg)

![Upcoming](docs/readme/11-upcoming.jpg)

### 11. Projects, Notes, Bookmarks, Sometime, Brain Dump, Search, More

| Screen     | URL              | What to do                                                                                          |
| ---------- | ---------------- | --------------------------------------------------------------------------------------------------- |
| Projects   | `/en/projects`   | Named projects with next work and notes. Demo: **Acme proposal**                                    |
| Notes      | `/en/notes`      | Ideas, remember, questions. Pin to Today                                                            |
| Bookmarks  | `/en/bookmarks`  | Private links in folders. Browse a folder, or search. Under **More**, not the main nav             |
| Sometime   | `/en/sometime`   | Someday / maybe, not on the calendar. Demo: **Read research paper**                                 |
| Brain Dump | `/en/brain-dump` | Write freely, review suggestions, save what you confirm                                             |
| Search     | `/en/search`     | Tasks, events, notes, projects, and bookmarks                                                       |
| More       | `/en/more`       | Language, Undo, Reset demo data, Bookmarks, and the other overflow links                           |

Bookmarks stay in `dayline.local.v1` with the rest of the day. The library starts empty. **Import browser bookmarks** accepts a Netscape HTML export after you review the preview, or add one link with **+ Bookmark**. A full `http` or `https` or `file` URL in Today’s capture box can also be saved as a bookmark.

The first screen is folders, not every link. Open a folder and only that folder and its children stay on the page. **Search** defaults to the open folder; **All bookmarks** searches the whole library. **Hide folders** removes the side panel and keeps that choice in this browser. **Show all** is a separate list of every link. **Pinned**, **Attached**, **Recent**, and **Local files** are filters. Open and **···** sit on each link (edit, pin, archive, delete). A link attached to the running task shows under that session.

![Projects](docs/readme/12-projects.jpg)

![Notes](docs/readme/13-notes.jpg)

![Sometime](docs/readme/14-sometime.jpg)

![Brain Dump](docs/readme/15-brain-dump.jpg)

![Search](docs/readme/16-search.jpg)

![More](docs/readme/17-more.jpg)

Undo covers the last 20 actions (capture, start, pause, complete, schedule, plan, inbox, delete, convert). Toast on Today; also **More → Undo**.

### 12. Phone

Same Today, stacked. Bottom nav: Today / Inbox / Add / Calendar / More.

![Today on a phone](docs/readme/21-today-mobile.jpg)

## Language

14 locales: `en`, `ar`, `ur`, `ja`, `de`, `fr`, `hi`, `bn`, `tr`, `es`, `id`, `ko`, `zh`, `ru`. RTL: `ar`, `ur`. `zh` serves as `zh-Hans`. Switch from **More** or the expanded nav.

Plus Jakarta Sans is the body font. Script fonts load only for the active locale.

New UI strings must exist in all 14 locale JSON files (`src/i18n/locales/`). Adding a locale is JSON + `src/i18n/config.ts` + `src/i18n/load-messages.ts`.

![Arabic Today (RTL)](docs/readme/18-today-arabic-rtl.jpg)

![Japanese Today](docs/readme/19-today-japanese.jpg)

![Korean Today](docs/readme/20-today-korean.jpg)

## Closing today

From 17:00, if flexible work is still open, Today switches to the evening ritual. Daymark asks whether to move unfinished things. Each item can go to tomorrow or Inbox.

![Closing today on the timeline](docs/readme/22-closing-today.jpg)

![Closing today ritual](docs/readme/23-closing-ritual.jpg)

**Move all to tomorrow** or decide per row, then **Finish today**. Settled copy: “That’s today.”

A missed planned task also shows **Still open** on the spine (Done / Start now / Find another time / Back to Inbox). Events do not.

## Work and time

- Item kinds: task, event, note, reminder (reminder is in the model; capture currently creates tasks, events, and notes)
- Task states: inbox, planned, ready, running, paused, completed, deferred, cancelled
- Start / pause / done. Elapsed vs estimate. Overrun copy when the session runs long
- Priorities, deadlines (none / target / due), life areas

## Planning and connectors

Heuristics, not a chat. Flexible work fits around fixed events. Capture parse is regex-based.

Live Google / Outlook calendars, Gmail, Slack, an LLM planner, Pomodoro, habits, and scores are out of this build. Connector stubs live in `src/domains/connectors/` so calendars can be added later without rewriting Today.

## Deploy and SEO

```bash
npm run verify
```

`verify` is local: format, lint, typecheck, tests, i18n key match, production build. Vercel runs `next build` only.

Canonical origin: `NEXT_PUBLIC_SITE_URL`, then the Vercel project host, then `http://localhost:3000`. Do not hardcode `dayline.vercel.app` — that domain is a different app.

Sitemap and robots use that origin. Indexed routes: Today, Inbox, Calendar, Upcoming, Projects, Notes, Sometime, Brain Dump, Search, More — in every locale. Bookmarks is in the app and omitted from the sitemap.

## Commands

```bash
npm run dev
npm run capture:readme
npm run build
npm test
npm run validate:i18n
npm run verify
```

`capture:readme` needs the dev server and Playwright Chromium (`npx playwright install chromium` once).

## Specs

- `docs/superpowers/specs/2026-08-19-dayline-mvp-design.md`
- `docs/superpowers/specs/2026-08-19-dayline-today-alive-design.md`
- `docs/superpowers/specs/2026-08-19-dayline-visual-system.md`
- `docs/superpowers/specs/2026-08-19-dayline-line-of-day-design.md`
