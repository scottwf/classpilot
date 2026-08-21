# ClassPilot Codebase Overview

A living technical summary of the ClassPilot code, written to keep implementation
aligned with [ClassPilot-summary-plan.md](../ClassPilot-summary-plan.md) and to
flag clean-code and security work before real student data is entered.

Last verified: 2026-05-31 against commit `a30f216` (Initial ClassPilot planner app).

## Verification Snapshot

All gates pass on a clean `npm install`:

| Gate | Command | Result |
| --- | --- | --- |
| Tests | `npm test` | 9 files, 29 tests passing |
| Lint | `npm run lint` | clean |
| Build | `npm run build` | compiles, 13 routes |

> Note: `node_modules/` is not committed, so `npm install` is required before any
> gate will run (`vitest: command not found` otherwise).

## Architecture at a Glance

ClassPilot is a Next.js App Router app (Next 16 / React 19 / TS) with a
server-rendered planner UI, server actions for writes, and a thin repository
layer over a single SQLite file via Node's built-in `node:sqlite`.

```
app/                         Next.js routes (RSC pages + "use server" actions)
  page.tsx                   Plan book (day/week)
  login/                     Password sign-in + logout
  units/, units/[unitId]/    Unit list, detail, new, edit
  lessons/, lessons/[id]/    Lesson list, detail, new, edit, import
  outcomes/                  Curriculum outcome browser
  layout.tsx                 Root layout + PWA manifest/metadata

src/features/planner/        UI components + view logic (the "signature" timeline)
  ClassPilotPlanner.tsx      Entry composing AppShell + PlanBookPage
  AppShell, PlannerHeader    Navigation chrome
  UnitTimeline, timeline.ts  Year grid + instructional-day math (pure, tested)
  *Page.tsx, *Form.tsx       Plan book, units, lessons, outcomes views/forms
  seed-data.ts               Initial Grade 6 SK demo dataset
  types.ts                   Shared domain types (single source of truth)

src/lib/
  auth/        session.ts (HMAC token), server.ts (cookies/guards), cookie-policy
  db/          sqlite.ts (schema/migrate), planner-repository.ts (CRUD), classpilot-db.ts (wiring/seed)
  curriculum/  sk-outcomes.ts (CSV parser for SK Grade 6)
  lessons/     markdown-import.ts, lesson-sections.ts, lesson-resources.ts
  ai/          config.ts (provider config), prompt.ts/parse.ts (pure, tested),
               provider.ts (fetch), unit-outline.ts (orchestrator)
               (planner/schedule.ts places drafted lessons on instructional days)

docs/SK outcomes to import/  8 subject CSVs (read at runtime by sk-outcomes.ts)
data/classpilot.sqlite       Local DB (gitignored)
```

### Data flow

1. Pages call `requireAuth()`, then `getClassPilotPlannerData()` to read.
2. `classpilot-db.ts` opens the DB, runs `migrate()`, and seeds once per process.
3. Repository functions map snake_case rows ↔ camelCase domain types and
   JSON-encode array/section fields (`outcome_ids_json`, `sections_json`,
   `blocked_dates_json`).
4. Forms post to `"use server"` actions that re-check auth, validate, write via
   the repository, then `redirect()` back with a status query param.

### Data model (SQLite)

`school_years` → `class_sections` → `unit_plans` (FK, cascade) → `lesson_plans`
(FK, cascade); `curriculum_outcomes` referenced by id arrays stored as JSON on
units and lessons. `PRAGMA foreign_keys = ON` is set. Schema migration is
idempotent (`CREATE TABLE IF NOT EXISTS` + `addColumnIfMissing`).

## Plan vs. Implementation

Built and working (matches MVP):

- Multi-user accounts, identity-bound sessions (HMAC-signed, httpOnly cookie,
  14-day TTL), per-user data isolation, per-user MCP tokens, login rate
  limiting (issue #21)
- Daily/weekly plan book, unit timeline grid, unit detail/coverage hub
- Unit + lesson CRUD with validation; lesson bank with sorting; outcome browser
- Structured lesson sections (8 fields) + Markdown import (file or paste)
- Saskatchewan Grade 6 outcome import (custom, dependency-free CSV parser)
- SQLite persistence behind a repository layer; Docker Compose; PWA manifest
- **Student Information CMS** — roster, profiles, contacts, notes, support plans,
  reminders (Phase 1), with sensitive fields encrypted at rest (Phase 2)
- **School-year / calendar setup** — `/calendar` edits term title/dates and
  labeled non-instructional days (single or range); back-compatible with the
  legacy `blockedDates` string form
- **AI Planning Assistant (first slice)** — `/assistant` drafts a unit outline
  (big ideas, lesson sequence, assessment + differentiation ideas) from a
  provider-agnostic AI layer (`src/lib/ai/`). Opt-in via `CLASSPILOT_AI_API_KEY`
  or a local `CLASSPILOT_AI_BASE_URL` (Ollama/LM Studio); OpenAI-compatible
  `fetch`, no SDK. Prompt/parse are pure + tested; data minimization is
  structural — only subject/grade/timing/outcome context is sent, never student
  records. Disabled gracefully with a setup hint when unconfigured.
- **Save draft → planner** — the draft can be saved as a real unit + lessons:
  lessons are scheduled across instructional days (`schedule.ts`, pure + tested),
  outcome codes map back to outcome ids, and the unit + lessons are written
  atomically (`createUnitWithLessons`). Unit-level guidance (big ideas, essential
  questions, assessment, differentiation) is folded into the first lesson's
  sections so nothing is lost (the unit model has no description field yet).

Not yet started (largest remaining MVP gaps, in plan priority order):

- **AI assistant depth** — lesson-plan drafting (full sections), pacing/overload
  checks, and teacher-approved student-context summaries.
- **Interactive timeline** — the timeline renders as a static grid; drag/resize
  and auto-reschedule (a signature design goal) are not implemented.
- **Coverage tooling** — gap/overlap detection and pacing/overload warnings.
- **Lesson library reuse** — duplicate/version, richer filters.
- **Student CMS Phase 2b** — file attachments (private storage + auth download).

## Findings — Clean & Secure Code

Prioritized for a self-hosted, soon-to-hold-student-data app. None block current
local use; most should be addressed before real data is entered.

### Resolved (2026-05-31)

1. ~~**Fail-closed secrets in production.**~~ Secret resolution moved to
   `src/lib/auth/secrets.ts`; `getAuthSecret()` / `getAppPassword()` now throw when
   `NODE_ENV === "production"` and the env vars are unset, and keep dev defaults
   otherwise.
2. ~~**Auth has no defense-in-depth backstop.**~~ Added `proxy.ts` (Next 16's
   Node.js-runtime replacement for `middleware.ts`) that reuses the existing HMAC
   `verifySessionToken` to redirect unauthenticated requests to `/login`. Per-route
   `requireAuth()` checks are retained. Verified by smoke test: no/tampered cookie →
   307 to `/login`; valid cookie → 200.
4. ~~**Seed overwrites edited seed rows on restart.**~~ `getClassPilotDatabase()`
   now seeds only when the DB is empty (`isPlannerSeeded()` guard), so demo data
   never clobbers real edits. `seedPlannerData()` keeps its upsert behavior for the
   explicit re-seed path covered by tests.
5. ~~**Login comparison isn't constant-time.**~~ `loginAction` now calls
   `verifyAppPassword()`, which SHA-256 hashes both sides and compares with
   `timingSafeEqual` (length-independent, constant-time).

### Resolved (2026-06-18)

3. ~~**Encryption/backups not in place.**~~ Sensitive Student CMS columns are now
   encrypted at rest via `src/lib/crypto/field-cipher.ts` (AES-256-GCM,
   fail-closed `CLASSPILOT_DATA_KEY`), with encryption-at-rest tests. The
   encrypted-backup and key-custody procedure is documented in
   [backup-and-recovery.md](backup-and-recovery.md). Operational steps (encrypted
   volume, scheduled backups, restore test) must still be completed by the
   operator before real data; AI data minimization remains for the AI phase.

### Low — polish / maintainability

6. **DB connection opened per call.** `getClassPilotDatabase()` constructs a new
   `DatabaseSync` on every invocation. Fine for SQLite, but memoizing one instance
   per process is cleaner and avoids repeated `migrate()` work.
7. **`cookie-policy.ts` ignores `nodeEnv`.** The type accepts `nodeEnv` but it is
   unused; either use it (force secure in production) or drop it from the type.
8. **Static asset reads at runtime.** `sk-outcomes.ts` reads CSVs from `docs/` via
   `process.cwd()`. Works under Docker, but treat `docs/SK outcomes to import/` as
   a runtime dependency (it must ship in the image) or move it under app data.

## Conventions Worth Preserving

- Domain types live only in `src/features/planner/types.ts`; repositories map to/from rows.
- All DB access goes through `src/lib/db/planner-repository.ts` — never query from components.
- Every page and server action begins with `await requireAuth()`.
- Pure logic (timeline math, parsers, auth token, lesson queries) is unit-tested;
  keep new business logic pure and tested rather than embedding it in components.
- Validation lives in server actions and redirects with `?error=` codes; keep the
  client thin.

## Suggested Next Steps

1. Land the **fail-closed secrets** + **`middleware.ts` backstop** (small, high value).
2. Make **seeding idempotent** (seed only when the DB is empty).
3. Scope the **Student Information CMS** schema with privacy/backup design first.
4. Stand up a small **AI service layer** boundary (no provider calls yet) so AI
   features attach cleanly later.
