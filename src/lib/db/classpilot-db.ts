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
import { ensureBackfilledUser, getSoleUser } from "./users-repository";

const databasePath =
  process.env.CLASSPILOT_DATABASE_PATH ?? join(process.cwd(), "data", "classpilot.sqlite");

let seedChecked = false;
let usersChecked = false;

export function getClassPilotDatabase() {
  const db = createClassPilotDatabase(databasePath);

  // Existing installs have zero `users` rows and every school_years row has
  // a NULL user_id — create the one account for the current teacher from
  // the shared app password, then attribute every pre-existing school year
  // to them, so login and all their existing data keep working with zero
  // manual steps (issue #21 Phases 1-2). Both steps are no-ops once already
  // done (ensureBackfilledUser no-ops once any user exists; the UPDATE only
  // touches NULL rows). usersChecked mirrors seedChecked below: avoid
  // redundant queries per request once this process has confirmed it.
  if (!usersChecked) {
    ensureBackfilledUser(db, getAppPassword(), getAppUsername());
    const soleUser = getSoleUser(db);
    if (soleUser) {
      db.prepare("UPDATE school_years SET user_id = ? WHERE user_id IS NULL").run(soleUser.id);

      // Existing installs tracked the active year in the old app_state
      // singleton, not users.active_school_year_id (issue #21 Phase 2)  —
      // carry it over so the teacher's app doesn't come up with no active
      // year after this deploy. Only runs once (guarded by
      // active_school_year_id IS NULL) and only if app_state actually has
      // a row (a genuinely fresh install has neither app_state nor a
      // school year yet; seedPlannerData sets active_school_year_id
      // itself in that case).
      const appState = db
        .prepare("SELECT active_school_year_id FROM app_state WHERE id = 'current'")
        .get() as { active_school_year_id: string } | undefined;

      if (appState) {
        db.prepare(
          "UPDATE users SET active_school_year_id = ? WHERE id = ? AND active_school_year_id IS NULL",
        ).run(appState.active_school_year_id, soleUser.id);
      }
    }
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
  // query per process. Runs after the users backfill above so the sole
  // user always exists to attribute the seeded school year to.
  if (!seedChecked) {
    if (!isPlannerSeeded(db) && !hasCurriculumOutcomes(db)) {
      const soleUser = getSoleUser(db);
      if (soleUser) {
        seedPlannerData(db, soleUser.id, plannerData);
        if (!isRosterSeeded(db)) {
          seedDemoRoster(db, soleUser.id, plannerData.schoolYear.id);
        }
      }
    }
    seedChecked = true;
  }

  return db;
}

export function getClassPilotPlannerData(userId: string): PlannerData {
  return getPlannerData(getClassPilotDatabase(), userId);
}
