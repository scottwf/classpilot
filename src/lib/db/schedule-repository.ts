import type { Period, ScheduleSlot } from "@/src/features/planner/types";
import type { ClassPilotDatabase } from "./sqlite";

type PeriodRow = {
  id: string;
  school_year_id: string;
  label: string;
  start_time: string;
  end_time: string;
  sort_order: number;
};

type ScheduleSlotRow = {
  id: string;
  class_id: string;
  period_id: string;
  cycle_day: number;
};

export function getPeriods(db: ClassPilotDatabase, schoolYearId: string): Period[] {
  const rows = db
    .prepare(
      "SELECT id, school_year_id, label, start_time, end_time, sort_order FROM periods WHERE school_year_id = ? ORDER BY sort_order, start_time",
    )
    .all(schoolYearId) as PeriodRow[];

  return rows.map(mapPeriod);
}

export type CreatePeriodInput = {
  schoolYearId: string;
  label: string;
  startTime: string;
  endTime: string;
  sortOrder: number;
};

export function createPeriod(db: ClassPilotDatabase, input: CreatePeriodInput): string {
  const id = `period-${crypto.randomUUID()}`;

  db.prepare(
    "INSERT INTO periods (id, school_year_id, label, start_time, end_time, sort_order) VALUES (?, ?, ?, ?, ?, ?)",
  ).run(id, input.schoolYearId, input.label, input.startTime, input.endTime, input.sortOrder);

  return id;
}

export type UpdatePeriodInput = Omit<CreatePeriodInput, "schoolYearId"> & { id: string };

export function updatePeriod(db: ClassPilotDatabase, input: UpdatePeriodInput): void {
  const result = db
    .prepare(
      "UPDATE periods SET label = ?, start_time = ?, end_time = ?, sort_order = ? WHERE id = ?",
    )
    .run(input.label, input.startTime, input.endTime, input.sortOrder, input.id);

  if (result.changes === 0) {
    throw new Error(`Period not found: ${input.id}`);
  }
}

export function deletePeriod(db: ClassPilotDatabase, id: string): void {
  db.prepare("DELETE FROM periods WHERE id = ?").run(id);
}

export function getScheduleSlots(db: ClassPilotDatabase, schoolYearId: string): ScheduleSlot[] {
  const rows = db
    .prepare(
      `SELECT schedule_slots.id, schedule_slots.class_id, schedule_slots.period_id, schedule_slots.cycle_day
       FROM schedule_slots
       JOIN periods ON periods.id = schedule_slots.period_id
       WHERE periods.school_year_id = ?`,
    )
    .all(schoolYearId) as ScheduleSlotRow[];

  return rows.map(mapScheduleSlot);
}

export type AssignScheduleSlotInput = {
  classId: string;
  periodId: string;
  cycleDay: number;
};

export type AssignScheduleSlotResult = {
  id: string;
  /** Name of another class already occupying this (cycleDay, periodId), if
   * any. The assignment still happens — this is surfaced as a warning, not
   * a block (see ScheduleSlot's doc comment in types.ts). */
  conflictClassName?: string;
};

/**
 * Assigns a class to a period on a cycle day. A class has at most one slot
 * per cycle day — assigning a new period for a day it's already scheduled
 * replaces the old slot rather than creating a second one. Also adds the
 * cycle day to the class's `cycleDays` if it isn't already there, so cascade
 * rescheduling and "extend to next day" pick it up as a real meeting day.
 */
export function assignScheduleSlot(
  db: ClassPilotDatabase,
  input: AssignScheduleSlotInput,
): AssignScheduleSlotResult {
  const conflict = db
    .prepare(
      `SELECT class_sections.name AS name
       FROM schedule_slots
       JOIN class_sections ON class_sections.id = schedule_slots.class_id
       WHERE schedule_slots.cycle_day = ?
         AND schedule_slots.period_id = ?
         AND schedule_slots.class_id != ?`,
    )
    .get(input.cycleDay, input.periodId, input.classId) as { name: string } | undefined;

  db.prepare("DELETE FROM schedule_slots WHERE class_id = ? AND cycle_day = ?").run(
    input.classId,
    input.cycleDay,
  );

  const id = `slot-${crypto.randomUUID()}`;
  db.prepare(
    "INSERT INTO schedule_slots (id, class_id, period_id, cycle_day) VALUES (?, ?, ?, ?)",
  ).run(id, input.classId, input.periodId, input.cycleDay);

  const classRow = db
    .prepare("SELECT cycle_days_json FROM class_sections WHERE id = ?")
    .get(input.classId) as { cycle_days_json: string } | undefined;

  if (classRow) {
    const cycleDays = JSON.parse(classRow.cycle_days_json) as number[];

    if (!cycleDays.includes(input.cycleDay)) {
      const updated = [...cycleDays, input.cycleDay].sort((a, b) => a - b);
      db.prepare("UPDATE class_sections SET cycle_days_json = ? WHERE id = ?").run(
        JSON.stringify(updated),
        input.classId,
      );
    }
  }

  return { id, conflictClassName: conflict?.name };
}

export function removeScheduleSlot(db: ClassPilotDatabase, id: string): void {
  db.prepare("DELETE FROM schedule_slots WHERE id = ?").run(id);
}

function mapPeriod(row: PeriodRow): Period {
  return {
    id: row.id,
    schoolYearId: row.school_year_id,
    label: row.label,
    startTime: row.start_time,
    endTime: row.end_time,
    sortOrder: row.sort_order,
  };
}

function mapScheduleSlot(row: ScheduleSlotRow): ScheduleSlot {
  return {
    id: row.id,
    classId: row.class_id,
    periodId: row.period_id,
    cycleDay: row.cycle_day,
  };
}
