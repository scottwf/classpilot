import { join } from "node:path";
import { plannerData } from "@/src/features/planner/seed-data";
import type { PlannerData } from "@/src/features/planner/types";
import { getPlannerData, seedPlannerData } from "./planner-repository";
import { createClassPilotDatabase } from "./sqlite";

const databasePath =
  process.env.CLASSPILOT_DATABASE_PATH ?? join(process.cwd(), "data", "classpilot.sqlite");

let seeded = false;

export function getClassPilotDatabase() {
  const db = createClassPilotDatabase(databasePath);

  if (!seeded) {
    seedPlannerData(db, plannerData);
    seeded = true;
  }

  return db;
}

export function getClassPilotPlannerData(): PlannerData {
  return getPlannerData(getClassPilotDatabase());
}
