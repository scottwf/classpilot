# ClassPilot — Restart Here

**Read this first when you come back to the project.** It is the single
"where we left off and how to pick it up" document. It captures the exact
state at hand-off, how to get running cold, and the prioritized plan for the
next work session.

- **Hand-off date:** 2026-08-05
- **State at hand-off:** all gates green (19 files, 110 tests / lint / build),
  deployed and verified against production data on echo — but **not yet
  committed**. `git status` on echo shows the changes below uncommitted on
  top of `397ba78`. Commit + push when ready; nothing is half-finished, this
  is a safe stopping point either way.
- **Status:** active. This session added the MCP server, cascade
  rescheduling, the ICS calendar feed, a full day-cycle scheduling system
  (cycle length, per-class cycle-day membership, class management UI,
  cycle-aware cascade, and lesson extend/duplicate), the `/settings` admin
  page for AI provider config, and — in a fourth pass — a real installable
  PWA (icons, service worker, offline page) plus a mobile nav fix (see
  section 2), and reordered the plan in section 5 after a competitive pass
  against other teacher plan books. **All of Priority A is now done.**

---

## 1. Resume in 5 minutes

```bash
# from the repo root
nvm use            # or otherwise select the Node version (Next 16 / React 19)
npm install        # node_modules is NOT committed — this is required first
cp .env.example .env   # only if .env is missing; then fill in secrets (section 6)
npm run dev        # http://localhost:3000 (or CLASSPILOT_PORT)
```

Then confirm everything is healthy before writing any new code:

```bash
npm test           # expect: 19 files, 110 tests passing
npm run lint       # expect: clean
npm run build      # expect: success, 24 routes incl. /assistant, /calendar/feed.ics, /classes, /settings
```

If you also touch `mcp-server/`, run `cd mcp-server && npm install && npx tsc --noEmit`
too — it isn't wired into the root `npm test`/`build` scripts, so it's easy to
introduce a type error there (or in a `*.test.ts` file, since `mcp-server`'s
`tsconfig.json` includes all of `../src/**/*.ts`) without noticing.

> If `npm test` errors with `vitest: command not found`, you skipped
> `npm install`. The whole `node_modules/` tree is intentionally not in git.

Default login password in dev is `classpilot` (from `src/lib/auth/secrets.ts`)
unless you set `CLASSPILOT_APP_PASSWORD`. Local data lives in
`data/classpilot.sqlite` (gitignored) and is seeded with demo content on first
run when the DB is empty.

---

## 2. What works today (built + verified)

All of this is shipped on `main`:

- **Auth** — password-gated single-user access (HMAC-signed httpOnly cookie,
  14-day TTL), constant-time password check, fail-closed secrets in production,
  and a `proxy.ts` middleware backstop that redirects unauthenticated requests.
- **Plan book** — daily/weekly views.
- **Unit timeline** — static year grid with instructional-day math.
- **Units & lessons** — full CRUD with validation; structured lesson sections
  (8 fields); lesson bank with sorting.
- **Markdown lesson import** — upload or paste at `/lessons/import`.
- **Curriculum outcomes** — Saskatchewan Grade 6 import (dependency-free CSV
  parser) + outcome browser.
- **Student Information CMS** — roster, profiles, contacts, notes, support
  plans, reminders (Phase 1), with sensitive fields **encrypted at rest**
  (AES-256-GCM, Phase 2).
- **Calendar setup** — `/calendar` edits term dates, day-cycle length (2 for
  odd/even, 5/6 for a rotation, or any N), and labeled non-instructional days
  (single or range). Each non-instructional day has a per-entry "advances the
  cycle" toggle (defaults on for planned closures) plus a separate one-click
  "Cancel a school day" quick action for snow days (always defaults off —
  see `src/features/planner/cycle.ts` for the full rationale).
- **Classes** — `/classes` (list/new/edit) manages the subject rows on the
  unit timeline, including which of the school's cycle days each class meets
  on (`cycleDays: number[]`; empty means every instructional day — the
  backward-compatible default). Previously classes only existed via seed
  data with no UI at all.
- **Cascade lesson rescheduling** — a form on the unit detail page
  (`/units/[unitId]`) and the `shift_lessons` MCP tool push every lesson in a
  unit on/after a date forward or backward by N of the unit's *class's
  actual meeting days* (cycle-day aware, not just any instructional day), so
  moving or inserting a lesson doesn't mean manually re-dating everything
  after it. Pure logic in `src/features/planner/reschedule.ts` +
  `cycle.ts`, atomic bulk update via `cascadeRescheduleUnitLessons` in
  `planner-repository.ts`.
- **Lesson extend/duplicate** — an "Extend to next day" button on the lesson
  detail page and the `extend_lesson` MCP tool duplicate a lesson onto its
  class's next actual meeting date (cycle-day aware) as a linked
  continuation (`continuesFromLessonId`), for when a lesson runs long and
  needs a second day.
- **ICS calendar subscription feed** — `GET /calendar/feed.ics?token=...`
  emits one all-day `VEVENT` per scheduled lesson (RFC 5545, line-folded,
  escaped) for "subscribe by URL" in Apple/Google/Outlook Calendar. Separate
  token from the login password (`CLASSPILOT_CALENDAR_TOKEN`, query string —
  calendar apps can't send custom headers), exempted from the `proxy.ts`
  session-cookie backstop. The subscribe URL is shown on `/calendar`. Pure
  builder in `src/lib/calendar/ics.ts`.
- **AI Planning Assistant (first slice)** — `/assistant` drafts a unit outline
  and can **save it as a real unit + scheduled lessons**. Provider-agnostic
  (`src/lib/ai/`), opt-in, local-model friendly, data-minimized (no student
  data is ever sent). See section 4.
- **Settings page** — `/settings` configures the AI provider (API key, base
  URL, model) in-app instead of editing `.env` and restarting. Single-row
  `app_settings` table (`src/lib/db/settings-repository.ts`), API key
  encrypted at rest via the same field-cipher used for student data. DB
  settings take priority over `CLASSPILOT_AI_*` env vars when set;
  `getAiConfig()`/`isAiConfigured()` in `src/lib/ai/config.ts` gained an
  `overrides` param for this (fully backward compatible — no-args calls
  behave exactly as before). The API key is never re-displayed once saved;
  leaving the field blank on a later save keeps the existing key, and a
  separate "Clear API key" action removes it explicitly.
- **Infra** — SQLite via `node:sqlite` behind a repository layer; Docker via
  `compose.yaml`.
- **Installable PWA** — real icons (`public/icon-*.png`, generated from
  `icon-source.svg`/`icon-maskable-source.svg` via `sharp-cli`, not checked
  into any design tool — regenerate by re-running the `sharp-cli resize`
  commands in shell history / RESTART-HERE if the source SVGs ever change)
  and a hand-written service worker (`public/sw.js`, registered by
  `ServiceWorkerRegistration.tsx` in the root layout). Scope is deliberately
  narrow: cache-first for hashed `/_next/static/` assets and icons,
  network-first for page navigations falling back to `/offline` when there's
  no connection. Full offline *data* access was explicitly not attempted —
  this app is server-rendered against live SQLite behind auth, so that would
  need a client-side data layer, a much bigger change. `/offline` and the
  new static assets are exempted from the `proxy.ts` auth backstop (see its
  comments) so they work with no session and no network.
- **Mobile nav** — `AppShell`'s top nav (9 items) was a horizontally-scrolling
  row with no visual affordance, the one real mobile breakage found in a
  full audit of all 26 `src/features` components. Now a proper hamburger
  menu below `md` (`MobileNav.tsx`, a small Client Component so `AppShell`
  itself stays a Server Component). Everything else audited clean — the
  codebase was already built mobile-first (grid breakpoints throughout,
  `overflow-x-auto` on the unit timeline's wide day-grid) despite what the
  earlier "3/19 pages" grep suggested; that number only checked thin `app/`
  route wrappers, not the actual `src/features` UI.
- **MCP server** (`mcp-server/`) — a separate `classpilot-mcp` container
  exposes units/lessons/classes/outcomes as MCP tools over Streamable HTTP so
  an MCP client (Claude Code, Claude Desktop) can read and write plans
  directly — `get_planner_data`, `create_unit`, `update_unit`, `create_class`,
  `update_class`, `delete_class`, `shift_lessons`, `create_unit_with_lessons`,
  `create_lesson`, `update_lesson`, `extend_lesson`, `get_unit`, `get_lesson`,
  `import_lesson_markdown`. Deliberately has no access to the Student CMS
  tables. Auth is a single shared header token (`x-classpilot-mcp-key`,
  `CLASSPILOT_MCP_TOKEN`) — fine for one homelab user, would need real
  per-user auth before ever leaving the LAN. Shares the same SQLite file as
  the main app; `sqlite.ts` now sets `PRAGMA journal_mode = WAL` so the two
  processes don't lock each other out.

For the architecture, data model, conventions, and file map, read
[CODEBASE-OVERVIEW.md](CODEBASE-OVERVIEW.md). Do not duplicate that here.

---

## 3. The big picture (where this is going)

ClassPilot is a self-hosted Grade 6 homeroom plan book. The product vision and
full feature list live in [../ClassPilot-summary-plan.md](../ClassPilot-summary-plan.md).
The MVP is the **planning loop**: set up the year → build units → plan lessons →
teach/adjust → track coverage, plus a private student CMS and AI assistance.

We are roughly here against that MVP:

| Area | Status |
| --- | --- |
| Year setup / calendar | ✅ done |
| Unit timeline (view) | ✅ done (static) |
| Unit timeline (drag/resize) | ❌ not started |
| Units + lessons CRUD | ✅ done |
| Curriculum outcomes (SK G6) | ✅ done |
| Outcome tagging | ✅ done |
| Coverage / gap detection | ❌ not started |
| Student CMS | ✅ Phase 1 + encryption; attachments deferred |
| AI: unit outline + save | ✅ first slice |
| AI: lesson drafting, pacing | ❌ not started |
| Lesson library reuse (duplicate/version) | ❌ not started |
| MCP server (import/edit via Claude) | ✅ done |
| Cascade lesson rescheduling (move/insert bumps rest forward) | ✅ done, cycle-day aware |
| ICS calendar subscription feed | ✅ done |
| Day-cycle scheduling (cycle length, per-class cycle days) | ✅ done |
| Class management UI (`/classes`) | ✅ done |
| Lesson extend/duplicate to next meeting day | ✅ done |
| Admin/settings UI (AI key/model in-app, not just env) | ✅ done |
| Real PWA (icons + service worker, installable/offline) | ✅ done |
| Mobile-responsive UI pass | ✅ done (nav was the only real gap; rest already mobile-first) |
| Shareable read-only plan link (for admin/colleague/sub) | ❌ not started |
| Print / PDF / Word export | ❌ not started |
| In-app backup export (zip download) | ❌ not started |

---

## 4. Where the AI assistant stands

The AI layer is a clean, provider-agnostic boundary in `src/lib/ai/`:

- `config.ts` — opt-in config; disabled until `CLASSPILOT_AI_API_KEY` or a local
  `CLASSPILOT_AI_BASE_URL` is set. Pure logic, tested.
- `prompt.ts` / `parse.ts` — pure prompt builder + defensive JSON parser, tested.
- `provider.ts` — OpenAI-compatible `/chat/completions` over `fetch` (no SDK).
  The only side-effecting file.
- `unit-outline.ts` — orchestrator.
- `src/features/planner/schedule.ts` — pure lesson scheduler used by the save
  flow.

**Privacy guarantee (important):** data minimization is structural. The request
type carries only subject/grade/timing/outcome context; there is no field for
student data, and a test asserts the prompt never contains student-identifying
terms. Keep it that way — any future "summarize student notes" feature must go
through an explicit, teacher-approved, de-identified path (see
[student-cms-plan.md](student-cms-plan.md)).

**To actually run AI locally:** set `CLASSPILOT_AI_BASE_URL` to a local
OpenAI-compatible server (Ollama/LM Studio) so nothing leaves the homelab, or
set `CLASSPILOT_AI_API_KEY` for a hosted provider. Unconfigured = the page
shows a setup hint instead of erroring.

---

## 5. Next session — prioritized plan

Pick up from the top. Each item is sized to be a focused session and follows
the existing conventions (pure tested logic, repository for DB, server actions
re-check auth, validation redirects with `?error=`).

Priorities were reordered on 2026-08-04 after a competitive pass against
Planbook, Common Curriculum, Planboard, and iDoceo (see
[../ClassPilot-summary-plan.md](../ClassPilot-summary-plan.md) for the
product vision these support). Cascade rescheduling in particular is
Planbook's headline feature ("bumps your plans automatically on a snow day"),
which is why it jumped to the top instead of waiting for the full interactive
timeline.

### Priority A — quick, high-leverage wins
1. ~~**Cascade lesson rescheduling.**~~ ✅ Done 2026-08-04, made cycle-day
   aware later the same day. Move a lesson or insert a new one and push
   every later lesson in the unit forward by the same number of *the unit's
   class's actual meeting days*. Pure shift function in
   `src/features/planner/reschedule.ts` + `cycle.ts`, atomic multi-row
   repository update (`cascadeRescheduleUnitLessons`), a form on the unit
   detail page, and the `shift_lessons` MCP tool. Also shipped alongside:
   day-cycle scheduling (cycle length + per-class cycle-day membership +
   `/classes` management UI, since none existed before — see
   `src/features/planner/cycle.ts`) and lesson extend/duplicate
   (`duplicateLessonAsContinuation`, `extend_lesson` MCP tool).
2. ~~**ICS calendar subscription feed.**~~ ✅ Done 2026-08-04. Token-gated
   `GET /calendar/feed.ics` emitting one all-day `VEVENT` per scheduled
   lesson; subscribe URL shown on `/calendar`. Note: subscribing from Google
   Calendar specifically requires the URL to be reachable from Google's
   servers, not just the teacher's device — that needs public exposure via
   CPM later, a separate decision from building the feed itself. Apple
   Calendar/Outlook on a LAN device can subscribe today without any of that.
3. ~~**Admin/settings page.**~~ ✅ Done 2026-08-04. `/settings` configures the
   AI provider in-app (DB-backed, encrypted API key, overrides env vars when
   set) — see section 2. `CLASSPILOT_MCP_TOKEN`/`CLASSPILOT_CALENDAR_TOKEN`
   deliberately stayed env-only (they're tied to container networking/restart
   anyway, less of a "hot-swap while running" need than the AI key).
4. ~~**Real PWA + mobile-responsive pass.**~~ ✅ Done 2026-08-05. Real icons
   (`icon-source.svg`/`icon-maskable-source.svg` → PNG via `sharp-cli`) and a
   hand-written `public/sw.js` (network-first navigations → `/offline`
   fallback, cache-first static assets — no offline *data* access attempted,
   see section 2). Turned out the "3/19 pages" number only reflected thin
   `app/` route wrappers; auditing the actual 26 `src/features` components
   found the codebase was already mobile-first throughout except the nav
   (fixed with a hamburger menu, `MobileNav.tsx`). **Priority A is now
   fully done** — see Priority C for the next planned/bigger UI investment
   (the interactive timeline).

### Priority B — finish the AI planning value loop
5. **Full lesson drafting.** Today saved lessons only carry a one-line focus.
   Add an AI action that drafts complete lesson sections (learning goals, minds
   on, lesson flow, materials, assessment, differentiation) for a single lesson
   or a whole unit. Reuse the `src/lib/ai/` pattern: pure prompt + parser +
   orchestrator, isolate the `fetch`.
6. **Pacing / overload checks.** Compare planned lessons vs. available
   instructional days per unit and warn on overload/underfill. Pure function +
   surface on the unit detail and timeline. (Data already exists.)

### Priority C — the signature interaction
7. **Interactive timeline.** Drag/resize unit blocks with auto lesson
   rescheduling. This is the headline design goal and the biggest UX win; it is
   also the largest single piece of client work. Plan it before coding. Reuse
   `cascadeRescheduleUnitLessons` (Priority A, done) for the auto-reschedule
   part instead of rebuilding it.

### Priority D — coverage, reuse, and sharing
8. **Coverage tooling.** Outcome gap detection (outcomes not yet planned) and
   overlap detection; a coverage report view.
9. **Lesson library reuse.** Duplicate / version a lesson or unit; richer
   filters in the lesson bank.
10. **Shareable read-only plan link.** A single-link view (no account needed)
    for an admin, colleague, or substitute — matches what every competitor
    plan book offers and nothing in ClassPilot does today.
11. **Print / PDF / Word export.** Teachers still print physical plans for
    office binders; no export/print code exists yet.
12. **In-app backup export.** A "download everything as a zip" button so
    backups don't require the manual
    [backup & recovery runbook](backup-and-recovery.md) every time.

### Priority E — student CMS depth (only with real-data safeguards done)
13. **Attachments (Phase 2b).** Private file storage + authenticated download,
    following the same encryption/privacy rules as the CMS.
14. **Exports.** Student summaries for meetings/report writing.

---

## 6. Environment variables (quick reference)

Full template with comments is in [`.env.example`](../.env.example).

| Variable | Purpose | Notes |
| --- | --- | --- |
| `CLASSPILOT_APP_PASSWORD` | Login password | Required in production |
| `CLASSPILOT_AUTH_SECRET` | Session HMAC secret | Long random; required in prod |
| `CLASSPILOT_COOKIE_SECURE` | Secure cookies | `true` for HTTPS/remote |
| `CLASSPILOT_DATA_KEY` | Encrypts student fields at rest | `openssl rand -base64 32`; store in a password manager, **never** beside backups |
| `CLASSPILOT_DATABASE_PATH` | SQLite path | Defaults to `data/classpilot.sqlite` |
| `CLASSPILOT_PORT` / `NEXT_PUBLIC_APP_URL` | Port / app URL | For Docker |
| `CLASSPILOT_AI_API_KEY` | Hosted AI provider key | Optional; enables `/assistant` |
| `CLASSPILOT_AI_BASE_URL` | Local/alt AI endpoint | Optional; enables `/assistant` without a key |
| `CLASSPILOT_AI_MODEL` | Model name | Defaults to `gpt-4o-mini` |
| `CLASSPILOT_MCP_TOKEN` | MCP server auth | Header `x-classpilot-mcp-key`; `openssl rand -base64 32` |
| `CLASSPILOT_MCP_PORT` | MCP server port | Defaults to `3900` |
| `CLASSPILOT_CALENDAR_TOKEN` | ICS feed auth | Query string `?token=`; `openssl rand -hex 32` (base64's `+`/`/`/`=` break in a URL) |

---

## 7. Before entering REAL student data (do not skip)

The app encrypts sensitive CMS fields at rest, but operational steps remain.
Follow the [backup & recovery runbook](backup-and-recovery.md) and complete its
pre-real-data checklist. At minimum:

- [ ] Strong `CLASSPILOT_APP_PASSWORD` + long random `CLASSPILOT_AUTH_SECRET`.
- [ ] `CLASSPILOT_DATA_KEY` set and stored in a password manager, separate from
      any backup.
- [ ] HTTPS + `CLASSPILOT_COOKIE_SECURE=true` if reachable beyond localhost.
- [ ] Encrypted, tested backups of `./data` (restore at least once).
- [ ] Confirm AI is either off or pointed at a local model if you are uneasy
      about any context leaving the homelab.

---

## 8. Known gaps / tech debt (low priority)

From [CODEBASE-OVERVIEW.md](CODEBASE-OVERVIEW.md) "Findings":

- DB connection is opened per call; memoizing one `DatabaseSync` per process is
  cleaner.
- `cookie-policy.ts` accepts `nodeEnv` but does not use it — use it or drop it.
- `sk-outcomes.ts` reads CSVs from `docs/` at runtime via `process.cwd()`; treat
  `docs/SK outcomes to import/` as a shipped runtime dependency (it is in the
  Docker image) or move it under app data.
- Saved AI lessons fold unit-level guidance (big ideas, etc.) into the first
  lesson's sections because the **unit model has no description field**. If unit
  overviews matter, add a unit description column (schema migration touches
  types, repo, `UnitForm`, unit detail).
- The day cycle (`getCycleDayForDate` in `cycle.ts`) is computed and drives
  scheduling/cascade/extend, but isn't displayed anywhere yet — the daily/
  weekly plan book doesn't show "Day 3 of 5" for today. Small, self-contained
  addition if it turns out to matter day-to-day (it's pure + tested already,
  this is purely a display gap).
- `mcp-server/` isn't wired into the root `npm test`/`build`/lint scripts —
  see the warning in section 1. A `predev`/CI step running
  `cd mcp-server && npx tsc --noEmit` would catch this automatically instead
  of relying on remembering to do it by hand.

---

## 9. Document map

| Doc | What it is |
| --- | --- |
| **RESTART-HERE.md** (this file) | Hand-off state + restart steps + next plan |
| [../README.md](../README.md) | Setup, features, run instructions |
| [../ClassPilot-summary-plan.md](../ClassPilot-summary-plan.md) | Product vision + full feature plan |
| [CODEBASE-OVERVIEW.md](CODEBASE-OVERVIEW.md) | Architecture, data model, conventions, findings |
| [student-cms-plan.md](student-cms-plan.md) | Student CMS schema + privacy design |
| [backup-and-recovery.md](backup-and-recovery.md) | Encrypted backup + recovery runbook |
| [lesson-import-template.md](lesson-import-template.md) | Markdown lesson import format |

---

## 10. Working conventions (so future work stays consistent)

- Domain types live only in `src/features/planner/types.ts`; repositories map
  rows ↔ types.
- All DB access goes through repository modules — never query from components.
- Every page and server action starts with `await requireAuth()`.
- Keep business logic **pure and unit-tested** (timeline, scheduling, prompts,
  parsers); keep components thin.
- Validation lives in server actions; redirect with `?error=` codes.
- `next-env.d.ts` is auto-generated — do not commit its churn.
- Only commit when intended; keep the three gates (`test`, `lint`, `build`)
  green before committing.
