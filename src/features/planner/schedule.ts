/**
 * Places `count` lessons onto instructional days, starting on or after
 * `startDateKey`, aiming for roughly `lessonsPerWeek` lessons per school week.
 *
 * Pure and deterministic so the AI "save draft as a unit" flow can schedule
 * lessons predictably and be unit-tested. `instructionalDayKeys` must be the
 * sorted (ascending) list of school days (weekends/holidays already removed),
 * e.g. from `buildInstructionalDays(...).map((d) => d.key)`.
 */
export function scheduleLessonDates(
  instructionalDayKeys: string[],
  startDateKey: string,
  count: number,
  lessonsPerWeek: number,
): string[] {
  if (count <= 0) {
    return [];
  }

  const available = instructionalDayKeys.filter((key) => key >= startDateKey);

  // No instructional days left (start past the year's end): stack everything on
  // the start date so the caller still gets a usable, in-range schedule.
  if (available.length === 0) {
    return Array.from({ length: count }, () => startDateKey);
  }

  const perWeek = Math.min(Math.max(1, Math.round(lessonsPerWeek)), 5);
  const stride = Math.max(1, Math.round(5 / perWeek));

  const chosen: string[] = [];
  const used = new Set<number>();

  for (let i = 0; i < available.length && chosen.length < count; i += stride) {
    chosen.push(available[i]);
    used.add(i);
  }

  // Strided picks ran out before reaching count: backfill the skipped days in
  // order so we use real, distinct instructional days before stacking.
  for (let i = 0; i < available.length && chosen.length < count; i += 1) {
    if (!used.has(i)) {
      chosen.push(available[i]);
    }
  }

  // More lessons than instructional days remain in the year: stack the overflow
  // on the last available day rather than dropping lessons.
  const lastKey = available[available.length - 1];
  while (chosen.length < count) {
    chosen.push(lastKey);
  }

  return chosen.sort((left, right) => left.localeCompare(right));
}
