export type MiniCalendarDay = {
  date: string;
  dayOfMonth: number;
  inCurrentMonth: boolean;
};

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function parseMonthKey(monthKey: string): { year: number; month: number } {
  const [year, month] = monthKey.split("-").map(Number);
  return { year, month };
}

/**
 * Full weeks (Sunday-Saturday) covering the given month, including the
 * leading/trailing days from adjacent months needed to fill each week —
 * the standard mini-calendar grid shape.
 */
export function buildMiniCalendarDays(monthKey: string): MiniCalendarDay[] {
  const { year, month } = parseMonthKey(monthKey);
  const firstOfMonth = new Date(Date.UTC(year, month - 1, 1));
  const lastOfMonth = new Date(Date.UTC(year, month, 0));

  const gridStart = new Date(firstOfMonth);
  gridStart.setUTCDate(gridStart.getUTCDate() - firstOfMonth.getUTCDay());

  const gridEnd = new Date(lastOfMonth);
  gridEnd.setUTCDate(gridEnd.getUTCDate() + (6 - lastOfMonth.getUTCDay()));

  const days: MiniCalendarDay[] = [];
  for (
    let cursor = new Date(gridStart);
    cursor <= gridEnd;
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  ) {
    days.push({
      date: toDateKey(cursor),
      dayOfMonth: cursor.getUTCDate(),
      inCurrentMonth: cursor.getUTCMonth() === month - 1,
    });
  }

  return days;
}

export function monthKeyFromDate(dateKey: string): string {
  return dateKey.slice(0, 7);
}

export function monthLabel(monthKey: string): string {
  const { year, month } = parseMonthKey(monthKey);
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function shiftMonthKey(monthKey: string, monthsToShift: number): string {
  const { year, month } = parseMonthKey(monthKey);
  const shifted = new Date(Date.UTC(year, month - 1 + monthsToShift, 1));
  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, "0")}`;
}
