import { describe, expect, it } from "vitest";
import { calculateAge } from "./age";

describe("calculateAge", () => {
  it("calculates age when the birthday has already happened this year", () => {
    expect(calculateAge("2015-04-12", new Date(2026, 7, 6))).toBe(11);
  });

  it("calculates age when the birthday hasn't happened yet this year", () => {
    expect(calculateAge("2015-11-30", new Date(2026, 7, 6))).toBe(10);
  });

  it("counts the birthday itself as already turned", () => {
    expect(calculateAge("2015-08-06", new Date(2026, 7, 6))).toBe(11);
  });

  it("counts the day before a birthday as not yet turned", () => {
    expect(calculateAge("2015-08-07", new Date(2026, 7, 6))).toBe(10);
  });

  it("returns undefined for an empty or malformed birthdate", () => {
    expect(calculateAge("", new Date(2026, 7, 6))).toBeUndefined();
    expect(calculateAge("04/12/2015", new Date(2026, 7, 6))).toBeUndefined();
  });
});
