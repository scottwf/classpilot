"use server";

import { requireAuth } from "@/src/lib/auth/server";
import { getClassPilotDatabase } from "@/src/lib/db/classpilot-db";
import { getActiveSchoolYearId } from "@/src/lib/db/planner-repository";
import { createStudent } from "@/src/lib/db/students-repository";
import { parseStudentCsv, type StudentCsvError } from "@/src/lib/students/csv-import";

export type ImportRosterState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "done"; importedCount: number; errors: StudentCsvError[] };

export async function importRosterCsvAction(
  _prev: ImportRosterState,
  formData: FormData,
): Promise<ImportRosterState> {
  await requireAuth();

  const csvText = await getCsvText(formData);

  if (csvText === undefined) {
    return { status: "error", message: "Choose a CSV file or paste CSV text." };
  }

  const { rows, errors } = parseStudentCsv(csvText);
  const db = getClassPilotDatabase();
  const schoolYearId = getActiveSchoolYearId(db);

  for (const row of rows) {
    createStudent(db, { ...row.input, schoolYearId });
  }

  return { status: "done", importedCount: rows.length, errors };
}

async function getCsvText(formData: FormData): Promise<string | undefined> {
  const file = formData.get("rosterFile");

  if (file instanceof File && file.size > 0) {
    return file.text();
  }

  const pasted = String(formData.get("rosterCsv") ?? "").trim();

  return pasted || undefined;
}
