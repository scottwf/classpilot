import { readFileSync } from "node:fs";
import { join } from "node:path";
import { AppShell } from "@/src/features/planner/AppShell";
import { ImportRosterPage } from "@/src/features/students/ImportRosterPage";
import { requireAuth } from "@/src/lib/auth/server";
import { getClassPilotPlannerData } from "@/src/lib/db/classpilot-db";
import { importRosterCsvAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function ImportRosterRoute() {
  const userId = await requireAuth();

  const plannerData = getClassPilotPlannerData(userId);
  const sampleCsv = readFileSync(
    join(process.cwd(), "public", "samples", "student-import-sample.csv"),
    "utf8",
  );

  return (
    <AppShell activePage="students" data={plannerData}>
      <ImportRosterPage action={importRosterCsvAction} sampleCsv={sampleCsv} />
    </AppShell>
  );
}
