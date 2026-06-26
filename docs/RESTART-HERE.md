# ClassPilot — Restart Here

**Read this first when you come back to the project.** It is the single
"where we left off and how to pick it up" document. It captures the exact
state at hand-off, how to get running cold, and the prioritized plan for the
next work session.

- **Hand-off date:** 2026-06-26
- **State at hand-off:** clean working tree, all gates green, all work pushed to
  `origin/main`. Last commit: `cbb1b6b` (Save AI unit-outline drafts as units).
- **Status:** paused / retired for a while. Nothing is half-finished on disk —
  this is a safe stopping point.

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
npm test           # expect: 15 files, 68 tests passing
npm run lint       # expect: clean
npm run build      # expect: success, ~19 routes incl. /assistant
```

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
- **Calendar setup** — `/calendar` edits term dates and labeled
  non-instructional days (single or range).
- **AI Planning Assistant (first slice)** — `/assistant` drafts a unit outline
  and can **save it as a real unit + scheduled lessons**. Provider-agnostic
  (`src/lib/ai/`), opt-in, local-model friendly, data-minimized (no student
  data is ever sent). See section 4.
- **Infra** — SQLite via `node:sqlite` behind a repository layer; Docker via
  `compose.yaml`; PWA manifest.

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

### Priority A — finish the AI planning value loop
1. **Full lesson drafting.** Today saved lessons only carry a one-line focus.
   Add an AI action that drafts complete lesson sections (learning goals, minds
   on, lesson flow, materials, assessment, differentiation) for a single lesson
   or a whole unit. Reuse the `src/lib/ai/` pattern: pure prompt + parser +
   orchestrator, isolate the `fetch`.
2. **Pacing / overload checks.** Compare planned lessons vs. available
   instructional days per unit and warn on overload/underfill. Pure function +
   surface on the unit detail and timeline. (Data already exists.)

### Priority B — the signature interaction
3. **Interactive timeline.** Drag/resize unit blocks with auto lesson
   rescheduling. This is the headline design goal and the biggest UX win; it is
   also the largest single piece of client work. Plan it before coding.

### Priority C — coverage + reuse
4. **Coverage tooling.** Outcome gap detection (outcomes not yet planned) and
   overlap detection; a coverage report view.
5. **Lesson library reuse.** Duplicate / version a lesson or unit; richer
   filters in the lesson bank.

### Priority D — student CMS depth (only with real-data safeguards done)
6. **Attachments (Phase 2b).** Private file storage + authenticated download,
   following the same encryption/privacy rules as the CMS.
7. **Exports.** Student summaries for meetings/report writing.

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
