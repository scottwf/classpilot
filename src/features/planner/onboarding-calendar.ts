export type CalendarDayCell = {
  date: string;
  inRange: boolean;
  isWeekend: boolean;
};

export type MonthGrid = {
  label: string;
  weeks: Array<Array<CalendarDayCell | null>>;
};

const monthFormatter = new Intl.DateTimeFormat("en-CA", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

function parseDateKey(key: string): Date {
  return new Date(`${key}T00:00:00.000Z`);
}

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function startOfMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function addMonths(date: Date, months: number): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1));
}

/**
 * Builds one grid per calendar month spanning startDateKey..endDateKey
 * (inclusive), for the onboarding wizard's click-to-mark year calendar.
 * Each week is a fixed 7-cell row (Sun..Sat); leading/trailing cells
 * outside the month are `null`. Days outside [startDateKey, endDateKey]
 * are still rendered (so a month isn't visually cut off mid-week) but
 * flagged `inRange: false` so the caller can gray them out and refuse
 * clicks on them.
 */
export function buildMonthGrids(startDateKey: string, endDateKey: string): MonthGrid[] {
  if (!startDateKey || !endDateKey || endDateKey < startDateKey) {
    return [];
  }

  const grids: MonthGrid[] = [];
  const lastMonth = startOfMonth(parseDateKey(endDateKey));
  let monthCursor = startOfMonth(parseDateKey(startDateKey));

  while (monthCursor <= lastMonth) {
    const year = monthCursor.getUTCFullYear();
    const month = monthCursor.getUTCMonth();
    const firstOfMonth = new Date(Date.UTC(year, month, 1));
    const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    const leadingBlanks = firstOfMonth.getUTCDay();

    const cells: Array<CalendarDayCell | null> = [];
    for (let i = 0; i < leadingBlanks; i += 1) {
      cells.push(null);
    }
    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = new Date(Date.UTC(year, month, day));
      const key = toDateKey(date);
      const dayOfWeek = date.getUTCDay();
      cells.push({
        date: key,
        inRange: key >= startDateKey && key <= endDateKey,
        isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
      });
    }
    while (cells.length % 7 !== 0) {
      cells.push(null);
    }

    const weeks: Array<Array<CalendarDayCell | null>> = [];
    for (let i = 0; i < cells.length; i += 7) {
      weeks.push(cells.slice(i, i + 7));
    }

    grids.push({ label: monthFormatter.format(firstOfMonth), weeks });
    monthCursor = addMonths(monthCursor, 1);
  }

  return grids;
}
