import type { NonInstructionalDay } from "./types";

const dateKeyPattern = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Parses and validates the JSON a CalendarGrid's hidden input carries —
 * re-checked here rather than trusted, since it's client-built. Used by
 * both the onboarding wizard (a brand-new year) and the Calendar settings
 * page (editing an existing year's blockedDates).
 */
export function parseBlockedDatesJson(raw: string): NonInstructionalDay[] {
  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }

  if (!Array.isArray(parsed)) {
    return [];
  }

  return parsed.filter((entry): entry is NonInstructionalDay => {
    return (
      typeof entry === "object" &&
      entry !== null &&
      typeof (entry as NonInstructionalDay).date === "string" &&
      dateKeyPattern.test((entry as NonInstructionalDay).date) &&
      typeof (entry as NonInstructionalDay).label === "string" &&
      typeof (entry as NonInstructionalDay).advancesCycle === "boolean"
    );
  });
}
