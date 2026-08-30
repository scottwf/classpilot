import { describe, expect, it } from "vitest";
import { escapeCsvValue, toCsv } from "./csv";

describe("escapeCsvValue", () => {
  it("leaves a plain value untouched", () => {
    expect(escapeCsvValue("Grade 6 Math")).toBe("Grade 6 Math");
  });

  it("quotes and doubles embedded quotes when a value has a comma", () => {
    expect(escapeCsvValue("Winter Break, Day 1")).toBe('"Winter Break, Day 1"');
  });

  it("quotes and doubles an embedded double quote", () => {
    expect(escapeCsvValue('The "big" test')).toBe('"The ""big"" test"');
  });

  it("quotes a value containing a newline", () => {
    expect(escapeCsvValue("line one\nline two")).toBe('"line one\nline two"');
  });
});

describe("toCsv", () => {
  it("joins headers and rows with CRLF and escapes as needed", () => {
    const csv = toCsv(
      ["date", "label"],
      [
        ["2026-09-07", "Labour Day"],
        ["2026-12-24", "Winter Break, Day 1"],
      ],
    );

    expect(csv).toBe(
      'date,label\r\n2026-09-07,Labour Day\r\n2026-12-24,"Winter Break, Day 1"',
    );
  });

  it("renders just the header row when there are no data rows", () => {
    expect(toCsv(["date", "label"], [])).toBe("date,label");
  });
});
