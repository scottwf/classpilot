import { describe, expect, it } from "vitest";
import { parseBlockedDatesJson } from "./blocked-dates";

describe("parseBlockedDatesJson", () => {
  it("parses a valid array", () => {
    const json = JSON.stringify([
      { date: "2026-09-07", label: "Labour Day", advancesCycle: true },
    ]);

    expect(parseBlockedDatesJson(json)).toEqual([
      { date: "2026-09-07", label: "Labour Day", advancesCycle: true },
    ]);
  });

  it("returns an empty array for invalid JSON", () => {
    expect(parseBlockedDatesJson("not json")).toEqual([]);
  });

  it("returns an empty array when the JSON isn't an array", () => {
    expect(parseBlockedDatesJson('{"date": "2026-09-07"}')).toEqual([]);
  });

  it("filters out entries with a malformed date", () => {
    const json = JSON.stringify([
      { date: "09/07/2026", label: "Bad date", advancesCycle: true },
      { date: "2026-09-07", label: "Good date", advancesCycle: true },
    ]);

    expect(parseBlockedDatesJson(json)).toEqual([
      { date: "2026-09-07", label: "Good date", advancesCycle: true },
    ]);
  });

  it("filters out entries missing required fields", () => {
    const json = JSON.stringify([
      { date: "2026-09-07", label: "No advancesCycle" },
      { date: "2026-09-08", advancesCycle: true },
      { date: "2026-09-09", label: "Complete", advancesCycle: false },
    ]);

    expect(parseBlockedDatesJson(json)).toEqual([
      { date: "2026-09-09", label: "Complete", advancesCycle: false },
    ]);
  });
});
