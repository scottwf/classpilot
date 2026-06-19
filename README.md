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
```

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

Create `.env` from `.env.example`, then set:

```bash
CLASSPILOT_PORT=3020
NEXT_PUBLIC_APP_URL=http://localhost:3020
CLASSPILOT_DATABASE_PATH=/app/data/classpilot.sqlite
CLASSPILOT_APP_PASSWORD=replace-me
CLASSPILOT_AUTH_SECRET=replace-with-a-long-random-secret
CLASSPILOT_COOKIE_SECURE=false
```

Start the container:

```bash
docker compose up -d --build
```

ClassPilot stores its SQLite database in `./data`, mounted into the container at `/app/data`.

## Privacy Notes

ClassPilot is being built for private classroom planning and eventual student information storage. Before entering real student data:

- Use a strong `CLASSPILOT_APP_PASSWORD`.
- Use a long random `CLASSPILOT_AUTH_SECRET`.
- Keep the app behind trusted homelab access controls.
- Use HTTPS and set `CLASSPILOT_COOKIE_SECURE=true` for remote access.
- Back up `./data` deliberately and protect those backups.
- Do not commit `.env`, `data/`, SQLite files, exported student data, or uploaded resources.

## Markdown Lesson Import

Use [docs/lesson-import-template.md](docs/lesson-import-template.md) as the starting format. Imports can be uploaded as `.md` files or pasted into `/lessons/import`.

The current import supports one lesson per Markdown file and maps sections into ClassPilot's structured lesson fields.

## Project Plan

The working product plan is tracked in [ClassPilot-summary-plan.md](ClassPilot-summary-plan.md).

A technical code summary, plan-vs-implementation gap analysis, and clean/secure code findings are tracked in [docs/CODEBASE-OVERVIEW.md](docs/CODEBASE-OVERVIEW.md).

The schema and privacy design for the upcoming Student Information CMS is in [docs/student-cms-plan.md](docs/student-cms-plan.md).

## Repository Hygiene

Ignored by Git:

- `.env` and local secret files
- `node_modules/`
- `.next/`
- `data/`
- SQLite database files
- coverage and logs

This keeps the repository safe to clone on another machine while preserving local planner data outside Git.
