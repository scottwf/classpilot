import { describe, expect, it } from "vitest";
import { findUpcomingBirthdays } from "./birthdays";

function student(overrides: Partial<Parameters<typeof findUpcomingBirthdays>[0][number]>) {
  return {
    birthdate: "2015-01-01",
    firstName: "First",
    id: "id",
    lastName: "Last",
    preferredName: "",
    ...overrides,
  };
}

describe("findUpcomingBirthdays", () => {
  it("includes a birthday later this month within the default window", () => {
    const results = findUpcomingBirthdays(
      [student({ id: "a", birthdate: "2015-08-12", lastName: "Alpha" })],
      { today: new Date(2026, 7, 6) },
    );

    expect(results).toEqual([
      {
        birthdate: "2015-08-12",
        daysUntil: 6,
        firstName: "First",
        lastName: "Alpha",
        preferredName: "",
        studentId: "a",
        turningAge: 11,
      },
    ]);
  });

  it("counts today's birthday as daysUntil 0", () => {
    const results = findUpcomingBirthdays([student({ id: "a", birthdate: "2015-08-06" })], {
      today: new Date(2026, 7, 6),
    });

    expect(results[0]).toMatchObject({ daysUntil: 0, turningAge: 11 });
  });

  it("rolls a birthday that already passed this year over to next year", () => {
    const results = findUpcomingBirthdays(
      [student({ id: "a", birthdate: "2015-01-01" })],
      { today: new Date(2026, 7, 6), withinDays: 365 },
    );

    // Jan 1 2027 is 148 days from Aug 6 2026 — well within the window, but
    // it must be *next* year's Jan 1, not this year's (already passed).
    expect(results[0]).toMatchObject({ daysUntil: 148, turningAge: 12 });
  });

  it("wraps a birthday near year-end correctly when it's within the window", () => {
    const results = findUpcomingBirthdays(
      [student({ id: "a", birthdate: "2015-12-31" })],
      { today: new Date(2026, 11, 28), withinDays: 14 },
    );

    expect(results[0]).toMatchObject({ daysUntil: 3, turningAge: 11 });
  });

  it("excludes birthdays outside the window", () => {
    const results = findUpcomingBirthdays(
      [student({ id: "a", birthdate: "2015-12-25" })],
      { today: new Date(2026, 7, 6), withinDays: 14 },
    );

    expect(results).toEqual([]);
  });

  it("skips students with an empty or malformed birthdate", () => {
    const results = findUpcomingBirthdays(
      [student({ id: "a", birthdate: "" }), student({ id: "b", birthdate: "not-a-date" })],
      { today: new Date(2026, 7, 6) },
    );

    expect(results).toEqual([]);
  });

  it("sorts by soonest first, then by last name", () => {
    const results = findUpcomingBirthdays(
      [
        student({ id: "a", birthdate: "2015-08-10", lastName: "Zeta" }),
        student({ id: "b", birthdate: "2015-08-07", lastName: "Beta" }),
        student({ id: "c", birthdate: "2015-08-07", lastName: "Alpha" }),
      ],
      { today: new Date(2026, 7, 6) },
    );

    expect(results.map((entry) => entry.studentId)).toEqual(["c", "b", "a"]);
  });

  it("respects a custom withinDays window", () => {
    const results = findUpcomingBirthdays(
      [student({ id: "a", birthdate: "2015-08-20" })],
      { today: new Date(2026, 7, 6), withinDays: 5 },
    );

    expect(results).toEqual([]);
  });
});
