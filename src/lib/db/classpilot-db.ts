import { join } from "node:path";
import { getAppPassword, getAppUsername } from "@/src/lib/auth/secrets";
import { plannerData } from "@/src/features/planner/seed-data";
import { seedDemoRoster } from "@/src/features/students/seed-students";
import type { PlannerData } from "@/src/features/planner/types";
import {
  getPlannerData,
  hasCurriculumOutcomes,
  isPlannerSeeded,
  seedPlannerData,
} from "./planner-repository";
import { isRosterSeeded } from "./students-repository";
import { createClassPilotDatabase } from "./sqlite";
import { ensureBackfilledUser } from "./users-repository";

const databasePath =
  process.env.CLASSPILOT_DATABASE_PATH ?? join(process.cwd(), "data", "classpilot.sqlite");

let seedChecked = false;
let usersChecked = false;

export function getClassPilotDatabase() {
  const db = createClassPilotDatabase(databasePath);

  // Existing installs have zero `users` rows — create the one account for
  // the current teacher from the shared app password so login keeps
  // working with zero manual steps (issue #21 Phase 1). No-ops once any
  // user exists. usersChecked mirrors seedChecked below: avoid a redundant
  // COUNT(*) query per request once this process has confirmed it.
  if (!usersChecked) {
    ensureBackfilledUser(db, getAppPassword(), getAppUsername());
    usersChecked = true;
  }

  // Seed the demo fixture (classes/units/lessons/students) only on a
  // genuinely fresh install — neither a school year nor any curriculum
  // outcomes exist yet. Checking both (not just the school year, like
  // before resetPlannerData() existed) means an intentional reset — which
  // deliberately preserves outcomes while clearing everything else —
  // doesn't get the demo data silently recreated on the next request, and
  // a real school year set up via onboarding never gets fake demo
  // students injected into it either. seedChecked avoids a redundant
  // query per process.
  if (!seedChecked) {
    if (!isPlannerSeeded(db) && !hasCurriculumOutcomes(db)) {
      seedPlannerData(db, plannerData);
      if (!isRosterSeeded(db)) {
        seedDemoRoster(db);
      }
    }
    seedChecked = true;
  }

  return db;
}

export function getClassPilotPlannerData(): PlannerData {
  return getPlannerData(getClassPilotDatabase());
}
