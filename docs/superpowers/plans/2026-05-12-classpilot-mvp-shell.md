# ClassPilot MVP Shell Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first runnable ClassPilot PWA shell with a homelab-ready Next.js app, seeded planning data, and a year/unit timeline as the primary screen.

**Architecture:** Start as a single Next.js application with a focused data model module, a timeline calculation module, and page-level components. Use static seeded data for the first slice so the UI and planning model can be validated before adding PostgreSQL and authentication.

**Tech Stack:** Next.js, React, TypeScript, Tailwind CSS, Vitest, Testing Library, Docker-ready npm scripts.

---

### Task 1: Scaffold the App

**Files:**
- Create: `package.json`
- Create: `next.config.ts`
- Create: `tsconfig.json`
- Create: `postcss.config.mjs`
- Create: `eslint.config.mjs`
- Create: `app/layout.tsx`
- Create: `app/page.tsx`
- Create: `app/globals.css`
- Create: `public/manifest.webmanifest`

- [ ] Create a Next.js app configured for TypeScript, Tailwind, and PWA metadata.
- [ ] Add scripts for `dev`, `build`, `lint`, and `test`.
- [ ] Verify the default page builds.

### Task 2: Add Planner Domain Model

**Files:**
- Create: `src/features/planner/types.ts`
- Create: `src/features/planner/seed-data.ts`
- Create: `src/features/planner/timeline.ts`
- Test: `src/features/planner/timeline.test.ts`

- [ ] Write failing tests for school-day filtering and unit timeline positioning.
- [ ] Implement the date helpers and seeded planner data.
- [ ] Verify tests pass.

### Task 3: Build the Planner Screen

**Files:**
- Modify: `app/page.tsx`
- Create: `src/features/planner/ClassPilotPlanner.tsx`
- Create: `src/features/planner/PlannerHeader.tsx`
- Create: `src/features/planner/UnitTimeline.tsx`
- Create: `src/features/planner/LessonList.tsx`

- [ ] Render the year timeline as the app home screen.
- [ ] Show class rows, unit bars, lesson markers, and current-day planning details.
- [ ] Keep the layout responsive so desktop shows the timeline and phone prioritizes today plus upcoming units.

### Task 4: Add Homelab Run Path

**Files:**
- Create: `Dockerfile`
- Create: `compose.yaml`
- Create: `.env.example`
- Modify: `ClassPilot-summary-plan.md`

- [ ] Add a production Docker build.
- [ ] Add a simple compose file for local homelab deployment.
- [ ] Document how to run the app locally.

### Task 5: Verify

**Files:**
- Modify as needed based on failures.

- [ ] Run tests.
- [ ] Run lint.
- [ ] Run production build.
- [ ] Start the dev server and provide the local URL.

## Self-Review

- This plan keeps the first slice narrow: app shell, planning model, timeline UI, and homelab run path.
- PostgreSQL, authentication, imported curriculum outcomes, and AI generation are intentionally deferred until the core planner experience is visible and testable.
- The first tests target date and timeline behavior because that logic will become central once units are editable.
