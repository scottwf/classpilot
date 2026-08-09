# ClassPilot — Restart Here

**Read this first when you come back to the project.** It is the single
"where we left off and how to pick it up" document. It captures the exact
state at hand-off, how to get running cold, and the prioritized plan for the
next work session.

- **Hand-off date:** 2026-08-09
- **State at hand-off:** all gates green (37 files, 279 tests / lint / build /
  `mcp-server` typecheck), committed and deployed to production on echo
  (`feature/multi-year-onboarding`, never merged to `main` — see below).
- **Status:** active, in active testing use ahead of the school year starting.
  Feature-complete on the original MVP plan (day-cycle scheduling, multi-year
  data model, onboarding wizard, full lesson drafting, pacing/overload checks,
  interactive unit timeline, assistant chat with tool-calling, curriculum
  outcome picker/browser, birthday reminders, and a tabbed `/settings` area
  covering AI providers, classes, calendar, and schedule). Recent work: fixed
  a schedule-editor state bug (switching classes left stale day/time
  selections, causing false "conflict" warnings), removed the redundant
  day-cycle picker from the Class form (Schedule is now the single source of
  truth for which days a class meets — `set_class_schedule` overwrites
  `cycleDays` on save), added scheduled-vs-target instructional-minutes
  summaries to the Schedule page, and added subject/unit/grade/outcome
  filters to the lesson bank. **Branch is not on `main`** — confirm before
  assuming `main` reflects current production.
- **Deferred, tracked as GitHub issues for a later dedicated pass:**
  temporary/burst schedule swaps for irregularly-taught classes (#19),
  attachments — links/videos/files on lessons and units (#20), and
  multi-user auth + per-user data isolation + per-user MCP tokens + a
  security review (#21, required before any other teacher's real data goes
  near this app).

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
npm test           # expect: 37 files, 279 tests passing
npm run lint       # expect: clean
npm run build      # expect: success, incl. /assistant, /calendar/feed.ics, /settings, /settings/ai,
                    # /settings/classes, /settings/calendar, /settings/schedule
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

All of this is shipped and deployed on echo, on the `feature/multi-year-onboarding`
branch (not merged to `main` — check before assuming `main` is current):

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
- **Schedule** — `/settings/schedule` (moved from the old top-level `/schedule`
  in the 2026-08-08 Settings-tabs reorg): click a class, check off which
  cycle days it meets on and set a start/end time per day
  (`ClassScheduleEditor.tsx`, `schedule_slots` table — no separate `periods`
  table; each class's slots carry their own times directly). Saving a
  class's schedule replaces its whole slot list and overwrites its
  `cycleDays` to match — **this is now the single source of truth for which
  days a class meets** (the Class form's old day-cycle checkbox was removed
  2026-08-09 since it duplicated this and could drift out of sync). Two
  classes sharing a (day, time) is flagged as a warning, not blocked. The
  page also shows scheduled-vs-target instructional minutes per class,
  reusing `computeInstructionalTimeSummary` from `instructional-time.ts`
  (same logic the onboarding review step uses). `room` and `meetingPattern`
  on `ClassSection` are still just free text/labels, unrelated to this.
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
- **Settings** — tabbed as of 2026-08-08 (`SettingsTabs.tsx`, real routes not
  client-side tabs): `/settings` (school years + danger-zone reset),
  `/settings/ai` (hosted + local AI provider config — API key, base URL,
  model for each; a "Test connection" action validates the model ID against
  the provider's `/models` endpoint before saving), `/settings/classes`
  (class CRUD), `/settings/calendar` (term dates, cycle length,
  non-instructional days — moved from the old top-level `/calendar`, which
  now only has `/calendar/feed.ics`, the ICS endpoint, left at its original
  URL since external calendar apps subscribe to a fixed URL), and
  `/settings/schedule` (see above). AI settings: single-row `app_settings`
  table (`src/lib/db/settings-repository.ts`), API key encrypted at rest via
  the same field-cipher used for student data, DB settings take priority
  over `CLASSPILOT_AI_*` env vars when set. The API key is never
  re-displayed once saved; leaving the field blank on a later save keeps the
  existing key, and a separate "Clear API key" action removes it explicitly.
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
  (echo, port 3900) exposes units/lessons/classes/schedule/outcomes as MCP
  tools over Streamable HTTP so any MCP client (this session's own
  `mcp__classpilot__*` tools, or a separately-configured Claude Code/Desktop
  on another machine) can read and write plans directly —
  `get_planner_data`, `create_unit`, `update_unit`, `create_class`,
  `update_class`, `delete_class`, `get_schedule`, `set_class_schedule`,
  `shift_lessons`, `create_unit_with_lessons`, `create_lesson`,
  `update_lesson`, `extend_lesson`, `get_unit`, `get_lesson`,
  `import_lesson_markdown`. Deliberately has no access to the Student CMS
  tables. `create_class`/`update_class` no longer accept `cycleDays`
  directly (fixed 2026-08-09 to match the Class-form change above) — use
  `set_class_schedule` to set meeting days/times; `update_class` preserves
  whatever `cycleDays` the class already has. Auth is a single shared
  header token (`x-classpilot-mcp-key`, `CLASSPILOT_MCP_TOKEN`) — fine for
  one homelab user, needs real per-user tokens before another teacher gets
  access (tracked in issue #21, alongside the same problem for app login).
  Shares the same SQLite file as the main app; `sqlite.ts` sets `PRAGMA
  journal_mode = WAL` so the two processes don't lock each other out.

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
| Bell schedule / class periods (`/schedule`) | ✅ done |
| Full lesson drafting (AI) | 🚧 partial (prompt/parse only) |
| Pacing / overload checks | ❌ not started |
| Interactive timeline (drag/resize) | ❌ not started |
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

## 5. Next session — check GitHub issues, not this list

This section used to hardcode a prioritized plan; it drifted stale enough to
be actively misleading (several "next" items below were done weeks ago, and
one duplicated a feature already shipped). **The live backlog is GitHub
issues on `scottwf/classpilot`** (`gh issue list --state open`) — that's
where `ROADMAP.md` gets swept into as ideas come up, and where deferred
architectural work gets its design notes. As of 2026-08-09, open issues
include: docx lesson import (#9), pre-seeding common onboarding classes
(#15), verifying alternating/mid-year-start classes end to end (#16), burst
scheduling for irregularly-taught classes (#19), lesson/unit attachments
(#20), and multi-user auth + data isolation (#21, gating — required before
any other teacher's real data touches this app). `#5`/`#6` (unit notes,
cross-year unit duplication) are smaller and still open too.

Everything from the original Priority A–D plan referenced in earlier
versions of this doc (cascade rescheduling, ICS feed, settings/AI config,
PWA, full lesson drafting, pacing checks, the interactive timeline, coverage
tooling, lesson bank filters) is done — see section 2.

---

## 6. Environment variables

Full reference (every variable, default, prod-required status, and which
container reads it) is in
[docs/CONFIG-REFERENCE.md](CONFIG-REFERENCE.md). Template with inline
comments is in [`.env.example`](../.env.example).

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
