# ClassPilot

ClassPilot is a personal, self-hosted teacher plan book for a Grade 6 homeroom classroom. It combines a daily/weekly plan book, unit timeline, lesson bank, curriculum outcome tracking, Markdown lesson import, and a foundation for privacy-conscious student information workflows.

This is not a public SaaS product. The first version is designed to run on a homelab for one teacher, with SQLite persistence and a future path to PostgreSQL if the app grows.

## Current Features

- Password-protected single-user access
- Daily and weekly lesson plan book
- Unit timeline for the school year
- Unit planning hub with lesson sequence and outcome coverage
- Lesson bank with client-side sorting by date, subject, unit, and outcome
- Dedicated lesson teaching/review pages
- Structured lesson sections:
  - Learning goals
  - Materials
  - Minds On
  - Lesson flow
  - Assessment
  - Differentiation
  - Resources
  - Reflection
- Markdown lesson import from upload or pasted text
- Resource parsing for Markdown links, images, plain URLs, and local attachment notes
- Saskatchewan Grade 6 curriculum outcome import
- SQLite persistence through a small repository layer
- Docker Compose deployment for homelab testing

## Tech Stack

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- SQLite using Node's built-in `node:sqlite`
- Vitest and Testing Library
- Docker Compose

## Local Development

### Setup With Claude Code or Codex

If you want an AI coding assistant to set this up on another machine, start by
cloning the repo, then ask the assistant to follow the README exactly and avoid
committing local secrets or data.

Clone the repository:

```bash
git clone git@github.com:scottwf/classpilot.git
cd classpilot
```

Recommended first prompt for Claude Code:

```text
You are working in the ClassPilot repository. Read README.md, docs/RESTART-HERE.md,
and .env.example first. Set up the app for local development without committing
secrets or local data. Create .env from .env.example, tell me which values I must
fill in, install dependencies, run tests/lint/build, and start the app on an
available local port.
```

Recommended first prompt for Codex:

```text
We are in the ClassPilot repository. Read README.md, docs/RESTART-HERE.md, and
.env.example first. Help me set up a local/persistent test copy. Do not commit
.env, data/, SQLite files, .next/, or node_modules/. Verify with npm test,
npm run lint, and npm run build before saying setup is complete.
```

For a persistent homelab test instance, use the Docker Compose path below rather
than `npm run dev`. Keep `.env` and `./data` on the target machine only. If you
plan to enter real student information, configure `CLASSPILOT_DATA_KEY` before
creating records and store that key separately from database backups.

### Manual Local Setup

Install dependencies:

```bash
npm install
```

Copy the environment example:

```bash
cp .env.example .env
```

Set a real local password and auth secret in `.env` before entering meaningful data:

```bash
CLASSPILOT_APP_PASSWORD=replace-me
CLASSPILOT_AUTH_SECRET=replace-with-a-long-random-secret
CLASSPILOT_COOKIE_SECURE=false
CLASSPILOT_DATA_KEY=replace-with-openssl-rand-base64-32
```

`CLASSPILOT_DATA_KEY` encrypts sensitive Student CMS fields at rest. Generate one
with `openssl rand -base64 32`. In development a derived key is used if it is
unset; in production the app refuses to start without it.

Run the development server:

```bash
npm run dev
```

The app will use `data/classpilot.sqlite` by default for local persistence.

## Production Build Check

```bash
npm test
npm run lint
npm run build
```

The build script uses `next build --webpack`.

## Docker Compose

Use Docker Compose when you want ClassPilot to keep running on another machine
for regular testing.

Create `.env` from `.env.example`, then set:

```bash
CLASSPILOT_PORT=3020
NEXT_PUBLIC_APP_URL=http://localhost:3020
CLASSPILOT_DATABASE_PATH=/app/data/classpilot.sqlite
CLASSPILOT_APP_PASSWORD=replace-me
CLASSPILOT_AUTH_SECRET=replace-with-a-long-random-secret
CLASSPILOT_COOKIE_SECURE=false
CLASSPILOT_DATA_KEY=replace-with-openssl-rand-base64-32
```

Generate strong secrets on the target machine:

```bash
openssl rand -base64 32
```

Start the container:

```bash
docker compose up -d --build
```

ClassPilot stores its SQLite database in `./data`, mounted into the container at `/app/data`.

Useful maintenance commands:

```bash
docker compose pull
docker compose up -d --build
docker compose logs -f classpilot
docker compose down
```

## Configuration Reference

Every environment variable, its default, and which container reads it is
documented in [docs/CONFIG-REFERENCE.md](docs/CONFIG-REFERENCE.md).

## MCP Server (AI Tool Access)

ClassPilot also runs a separate MCP server (`classpilot-mcp`, started
alongside the main app by the same `docker compose up`) so an MCP client
like Claude Code or Claude Desktop can read and write your units, lessons,
classes, and schedule directly — no Student CMS access. See
[docs/MCP-SETUP.md](docs/MCP-SETUP.md) for the token setup, host allow-list,
and how to connect a client.

## Privacy Notes

ClassPilot is being built for private classroom planning and eventual student information storage. Before entering real student data:

- Use a strong `CLASSPILOT_APP_PASSWORD`.
- Use a long random `CLASSPILOT_AUTH_SECRET`.
- Set `CLASSPILOT_DATA_KEY` and store it in a password manager, separate from backups.
- Keep the app behind trusted homelab access controls.
- Use HTTPS and set `CLASSPILOT_COOKIE_SECURE=true` for remote access.
- Back up `./data` deliberately and protect those backups.
- Do not commit `.env`, `data/`, SQLite files, exported student data, or uploaded resources.

Sensitive Student CMS fields are encrypted at rest with `CLASSPILOT_DATA_KEY`.
Before entering real student data, follow the
[backup & recovery runbook](docs/backup-and-recovery.md) and complete its
pre-real-data checklist.

## Markdown Lesson Import

Use [docs/lesson-import-template.md](docs/lesson-import-template.md) as the starting format. Imports can be uploaded as `.md` files or pasted into `/lessons/import`.

The current import supports one lesson per Markdown file and maps sections into ClassPilot's structured lesson fields.

## Project Plan

> **Picking the project back up after a break?** Start with
> [docs/RESTART-HERE.md](docs/RESTART-HERE.md) — it has the hand-off state, a
> 5-minute resume checklist, and the prioritized plan for the next session.

The working product plan is tracked in [ClassPilot-summary-plan.md](ClassPilot-summary-plan.md).

A technical code summary, plan-vs-implementation gap analysis, and clean/secure code findings are tracked in [docs/CODEBASE-OVERVIEW.md](docs/CODEBASE-OVERVIEW.md).

Setting up the MCP server so an AI assistant can read/write your plan directly is covered in [docs/MCP-SETUP.md](docs/MCP-SETUP.md).

The schema and privacy design for the upcoming Student Information CMS is in [docs/student-cms-plan.md](docs/student-cms-plan.md).

## Roadmap

Tracked, not yet built. Grouped by area; roughly the order they'll get picked up.

**Navigation & Settings**
- Rename/evolve Plan Book into "Dashboard" — same home page, but surfaces
  daily notes/reminders (e.g. upcoming birthdays) alongside the lesson view.
- Add a real mobile bottom tab bar (Dashboard, Lessons, Students, Schedule,
  More) instead of the current hamburger-only mobile nav. Assistant is the
  leading candidate to take a tab slot once it becomes a real chat interface.
- Move Classes into Settings as its own section (setup-time task, not a
  daily-use page).
- Move School Year management (switch/create/delete years) from Calendar
  into Settings; Calendar refocuses purely on showing the active year's
  calendar, styled like the onboarding wizard's calendar grid.

**Onboarding wizard**
- Range-select multiple calendar days (shift-click first + last day of a
  break) to label them all in one action, instead of one day per click.
- Default a new class's color to one not already in use in the active year,
  instead of every class starting out blue.
- Grade-driven class picker: pick a grade, then check off which curriculum
  subjects to add (each pre-wired to that subject's outcomes) plus common
  non-instructional defaults (recess, lunch, staff meeting), instead of
  adding classes one at a time. Support adding a second grade afterward, and
  combined/split-grade classes (e.g. a single Grade 6/7 Science class whose
  outcomes span both grades).
- Bell-schedule step: show all cycle days at once instead of one day per
  tab; reconsider whether "periods" are still needed as a separate concept
  now that instructional and non-instructional classes both exist, versus
  clicking a class directly onto a day/time grid.

**Plan Book**
- Real week view — the Day/Week toggle currently renders the same content
  either way.
- Once classes are scheduled, show that day/week's actual timetable and let
  the teacher click a slot to add a lesson directly into it.

**Units & lessons**
- Unit creation: enter a start date and a number of lesson days instead of
  an end date, with the end date computed from the class's actual
  instructional days (respecting calendar non-instructional days and the
  class's cycle days). Show the class's previous unit's end date so new
  units don't accidentally overlap.
- Fix the unit outcome picker — it currently lists every curriculum outcome
  from every subject and grade unfiltered, instead of just the outcomes for
  the unit's own class subject, and shows only the code, not the outcome's
  title.
- Click the unit timeline to open an add-lesson modal instead of
  navigating to a separate page with no context.
- Unit-level notes/comments, and a "copy this unit to another school year"
  action that surfaces last year's lesson reflections and unit notes so a
  re-taught unit gets improved instead of blindly repeated.

**Students**
- Show calculated age on the student profile.
- Upcoming-birthday reminders on the dashboard.
- A real chat interface for the AI Assistant with tool-calling, so
  reminders and notes can be created conversationally instead of only
  through manual forms.

**Other**
- Pacing / overload checks across a class's units.
- Interactive unit-timeline drag/resize.
- Full AI lesson drafting UI (the prompt/parse layer already exists;
  the orchestrator and UI to use it don't yet).

## Repository Hygiene

Ignored by Git:

- `.env` and local secret files
- `node_modules/`
- `.next/`
- `data/`
- SQLite database files
- coverage and logs

This keeps the repository safe to clone on another machine while preserving local planner data outside Git.
