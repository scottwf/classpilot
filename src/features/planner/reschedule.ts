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
  lessons: Array<{ id: string; date: string }>,
  fromDate: string,
  instructionalDayKeys: string[],
  shiftBy: number,
): LessonDateShift[] {
  return lessons
    .filter((lesson) => lesson.date >= fromDate)
    .map((lesson) => ({
      id: lesson.id,
      date: shiftDateByInstructionalDays(lesson.date, instructionalDayKeys, shiftBy),
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
