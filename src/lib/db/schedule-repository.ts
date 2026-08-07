import type { ScheduleSlot } from "@/src/features/planner/types";
import type { ClassPilotDatabase } from "./sqlite";

type ScheduleSlotRow = {
  id: string;
  class_id: string;
  cycle_day: number;
  start_time: string;
  end_time: string;
};

export function getScheduleSlots(db: ClassPilotDatabase, schoolYearId: string): ScheduleSlot[] {
  const rows = db
    .prepare(
      `SELECT schedule_slots.id, schedule_slots.class_id, schedule_slots.cycle_day, schedule_slots.start_time, schedule_slots.end_time
       FROM schedule_slots
       JOIN class_sections ON class_sections.id = schedule_slots.class_id
       WHERE class_sections.school_year_id = ?
       ORDER BY schedule_slots.cycle_day, schedule_slots.start_time`,
    )
    .all(schoolYearId) as ScheduleSlotRow[];

  return rows.map(mapScheduleSlot);
}

export function getScheduleSlotsForClass(db: ClassPilotDatabase, classId: string): ScheduleSlot[] {
  const rows = db
    .prepare(
      "SELECT id, class_id, cycle_day, start_time, end_time FROM schedule_slots WHERE class_id = ? ORDER BY cycle_day",
    )
    .all(classId) as ScheduleSlotRow[];

  return rows.map(mapScheduleSlot);
}

export type ClassScheduleSlotInput = {
  cycleDay: number;
  startTime: string;
  endTime: string;
};

export type ScheduleConflict = {
  cycleDay: number;
  className: string;
};

function timeRangesOverlap(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string,
): boolean {
  return aStart < bEnd && bStart < aEnd;
}

/**
 * Replaces a class's entire schedule in one atomic step — the whole point
 * of the "click a class, check off days and times" editing model, versus
 * assigning one slot at a time. Also sets the class's `cycleDays` to
 * exactly the days being scheduled, so cascade rescheduling and "extend to
 * next day" pick up the right meeting days. Returns any conflicts against
 * other classes' slots on the same cycle day with an overlapping time
 * range — surfaced as a warning, not blocked (a teacher may have a
 * legitimate reason, e.g. team teaching).
 */
export function setClassSchedule(
  db: ClassPilotDatabase,
  classId: string,
  slots: ClassScheduleSlotInput[],
): ScheduleConflict[] {
  const conflicts: ScheduleConflict[] = [];

  db.exec("BEGIN;");
  try {
    db.prepare("DELETE FROM schedule_slots WHERE class_id = ?").run(classId);

    for (const slot of slots) {
      const id = `slot-${crypto.randomUUID()}`;
      db.prepare(
        "INSERT INTO schedule_slots (id, class_id, cycle_day, start_time, end_time) VALUES (?, ?, ?, ?, ?)",
      ).run(id, classId, slot.cycleDay, slot.startTime, slot.endTime);
    }

    const cycleDays = Array.from(new Set(slots.map((slot) => slot.cycleDay))).sort(
      (a, b) => a - b,
    );
    db.prepare("UPDATE class_sections SET cycle_days_json = ? WHERE id = ?").run(
      JSON.stringify(cycleDays),
      classId,
    );

    const otherSlots = db
      .prepare(
        `SELECT schedule_slots.cycle_day, schedule_slots.start_time, schedule_slots.end_time, class_sections.name
         FROM schedule_slots
         JOIN class_sections ON class_sections.id = schedule_slots.class_id
         WHERE schedule_slots.class_id != ?`,
      )
      .all(classId) as Array<{
      cycle_day: number;
      start_time: string;
      end_time: string;
      name: string;
    }>;

    for (const slot of slots) {
      for (const other of otherSlots) {
        if (
          other.cycle_day === slot.cycleDay &&
          timeRangesOverlap(slot.startTime, slot.endTime, other.start_time, other.end_time)
        ) {
          conflicts.push({ cycleDay: slot.cycleDay, className: other.name });
        }
      }
    }

    db.exec("COMMIT;");
  } catch (error) {
    db.exec("ROLLBACK;");
    throw error;
  }

  return conflicts;
}

function mapScheduleSlot(row: ScheduleSlotRow): ScheduleSlot {
  return {
    id: row.id,
    classId: row.class_id,
    cycleDay: row.cycle_day,
    startTime: row.start_time,
    endTime: row.end_time,
  };
}
