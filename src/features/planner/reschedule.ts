/**
 * Shifts a single date along the school year's instructional day list by
 * `shiftBy` days (positive = later, negative = earlier). If `dateKey` isn't
 * itself an instructional day (e.g. it drifted onto a weekend/holiday), the
 * shift anchors from the next instructional day on/after it. Out-of-range
 * results clamp to the first/last instructional day rather than falling off
 * the school year, mirroring the overflow stacking in `scheduleLessonDates`.
 */
export function shiftDateByInstructionalDays(
  dateKey: string,
  instructionalDayKeys: string[],
  shiftBy: number,
): string {
  if (instructionalDayKeys.length === 0 || shiftBy === 0) {
    return dateKey;
  }

  const anchorIndex = findAnchorIndex(dateKey, instructionalDayKeys);
  const targetIndex = clamp(
    anchorIndex + shiftBy,
    0,
    instructionalDayKeys.length - 1,
  );

  return instructionalDayKeys[targetIndex];
}

export type LessonDateShift = {
  id: string;
  date: string;
};

/**
 * Computes new dates for every lesson on or after `fromDate` (inclusive),
 * shifted by `shiftBy` instructional days. Lessons before `fromDate` are left
 * out of the result entirely. Every affected lesson moves by the same index
 * delta, so relative order and spacing are preserved automatically — this is
 * the "move a lesson" and "insert a lesson" cascade: move the lesson (or
 * create the new one) at `fromDate`, then apply this shift to push
 * everything that was already scheduled on/after it out of the way.
 */
export function computeCascadeShift(
  lessons: Array<{ id: string; date: string | null }>,
  fromDate: string,
  instructionalDayKeys: string[],
  shiftBy: number,
): LessonDateShift[] {
  // Undated lessons (issue #39) have nothing to shift -- they're not part
  // of the calendar cascade at all.
  return lessons
    .filter((lesson): lesson is { id: string; date: string } => lesson.date !== null)
    .filter((lesson) => lesson.date >= fromDate)
    .map((lesson) => ({
      id: lesson.id,
      date: shiftDateByInstructionalDays(lesson.date, instructionalDayKeys, shiftBy),
    }));
}

export type LessonDateAssignment = {
  id: string;
  date: string;
};

/**
 * Assigns the next available *class meeting* dates (in order) to every
 * undated lesson in a unit, in sequence order -- issue #44: a bulk-imported
 * unit's lessons land unscheduled, and this fills them onto the calendar
 * automatically instead of one at a time via the lesson editor's picker.
 * Already-dated lessons in the unit are left untouched, and their dates
 * are excluded as candidates so two lessons never land on the same day.
 * If there aren't enough meeting dates left in the year, the remaining
 * lessons stack onto the last available date rather than being dropped --
 * same overflow behavior as scheduleLessonDates/shiftDateByInstructionalDays
 * elsewhere in this file.
 */
export function assignSequentialMeetingDates(
  lessons: Array<{ id: string; date: string | null }>,
  meetingDates: string[],
  fromDate: string,
): LessonDateAssignment[] {
  const undated = lessons.filter((lesson) => lesson.date === null);

  if (undated.length === 0) {
    return [];
  }

  const usedDates = new Set(
    lessons.map((lesson) => lesson.date).filter((date): date is string => date !== null),
  );
  const candidates = meetingDates.filter((date) => date >= fromDate && !usedDates.has(date));
  const overflowDate = candidates.at(-1) ?? meetingDates.at(-1);

  if (!overflowDate) {
    // The class has no meeting dates at all this year -- nothing to assign.
    return [];
  }

  return undated.map((lesson, index) => ({
    id: lesson.id,
    date: index < candidates.length ? candidates[index] : overflowDate,
  }));
}

function findAnchorIndex(dateKey: string, days: string[]): number {
  const exact = days.indexOf(dateKey);

  if (exact !== -1) {
    return exact;
  }

  const next = days.findIndex((day) => day >= dateKey);
  return next === -1 ? days.length - 1 : next;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
