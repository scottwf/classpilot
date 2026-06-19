import { join } from "node:path";
import { plannerData } from "@/src/features/planner/seed-data";
import { seedDemoRoster } from "@/src/features/students/seed-students";
import type { PlannerData } from "@/src/features/planner/types";
import {
  getPlannerData,
  isPlannerSeeded,
  seedPlannerData,
} from "./planner-repository";
import { isRosterSeeded } from "./students-repository";
import { createClassPilotDatabase } from "./sqlite";

const databasePath =
  process.env.CLASSPILOT_DATABASE_PATH ?? join(process.cwd(), "data", "classpilot.sqlite");

let seedChecked = false;

export function getClassPilotDatabase() {
  const db = createClassPilotDatabase(databasePath);

  // Seed only when the database is empty so demo data never overwrites real
  // edits on restart. seedChecked avoids a redundant query per process.
  if (!seedChecked) {
    if (!isPlannerSeeded(db)) {
      seedPlannerData(db, plannerData);
    }
    if (!isRosterSeeded(db)) {
      seedDemoRoster(db);
    }
    seedChecked = true;
  }

  return db;
}

export function getClassPilotPlannerData(): PlannerData {
  return getPlannerData(getClassPilotDatabase());
}
