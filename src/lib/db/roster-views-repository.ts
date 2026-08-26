import { randomUUID } from "node:crypto";
import type { RosterView } from "@/src/features/students/types";
import type { ClassPilotDatabase } from "./sqlite";

type RosterViewRow = {
  id: string;
  school_year_id: string;
  name: string;
  columns_json: string;
  created_at: string;
};

function notFound(kind: string, id: string): Error {
  return new Error(`${kind} not found: ${id}`);
}

function now(): string {
  return new Date().toISOString();
}

function schoolYearOwnedByUser(
  db: ClassPilotDatabase,
  schoolYearId: string,
  userId: string,
): boolean {
  return !!db
    .prepare("SELECT 1 FROM school_years WHERE id = ? AND user_id = ?")
    .get(schoolYearId, userId);
}

function viewOwnedByUser(db: ClassPilotDatabase, viewId: string, userId: string): boolean {
  return !!db
    .prepare(
      `SELECT 1 FROM roster_views
       JOIN school_years ON school_years.id = roster_views.school_year_id
       WHERE roster_views.id = ? AND school_years.user_id = ?`,
    )
    .get(viewId, userId);
}

function mapView(row: RosterViewRow): RosterView {
  return {
    id: row.id,
    schoolYearId: row.school_year_id,
    name: row.name,
    columns: JSON.parse(row.columns_json) as string[],
    createdAt: row.created_at,
  };
}

export function listRosterViews(
  db: ClassPilotDatabase,
  userId: string,
  schoolYearId: string,
): RosterView[] {
  if (!schoolYearOwnedByUser(db, schoolYearId, userId)) {
    return [];
  }

  const rows = db
    .prepare(`SELECT * FROM roster_views WHERE school_year_id = ? ORDER BY created_at`)
    .all(schoolYearId) as RosterViewRow[];

  return rows.map(mapView);
}

export function createRosterView(
  db: ClassPilotDatabase,
  userId: string,
  input: { schoolYearId: string; name: string; columns: string[] },
): string {
  if (!schoolYearOwnedByUser(db, input.schoolYearId, userId)) {
    throw notFound("School year", input.schoolYearId);
  }

  const name = input.name.trim();

  if (!name) {
    throw new Error("View name can't be empty.");
  }

  const id = `view-${randomUUID()}`;

  db.prepare(
    `INSERT INTO roster_views (id, school_year_id, name, columns_json, created_at)
     VALUES (?, ?, ?, ?, ?)`,
  ).run(id, input.schoolYearId, name, JSON.stringify(input.columns), now());

  return id;
}

export function deleteRosterView(db: ClassPilotDatabase, userId: string, id: string): void {
  if (!viewOwnedByUser(db, id, userId)) {
    throw notFound("Roster view", id);
  }

  db.prepare("DELETE FROM roster_views WHERE id = ?").run(id);
}
