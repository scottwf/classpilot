import { describe, expect, it } from "vitest";
import { parseStudentCsv } from "./csv-import";

describe("parseStudentCsv", () => {
  it("parses valid rows with all columns", () => {
    const csv = [
      "first_name,last_name,preferred_name,pronouns,birthdate,student_number,interests,strengths,status",
      "Jamie,Smith,Jay,they/them,2015-04-12,12345,Lego and dinosaurs,Reading aloud,active",
    ].join("\n");

    const result = parseStudentCsv(csv);

    expect(result.errors).toEqual([]);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toEqual({
      rowNumber: 2,
      input: {
        firstName: "Jamie",
        lastName: "Smith",
        preferredName: "Jay",
        pronouns: "they/them",
        birthdate: "2015-04-12",
        studentNumber: "12345",
        interests: "Lego and dinosaurs",
        strengths: "Reading aloud",
        status: "active",
      },
    });
  });

  it("only requires first_name and last_name", () => {
    const csv = ["first_name,last_name", "Alex,Nguyen"].join("\n");

    const result = parseStudentCsv(csv);

    expect(result.errors).toEqual([]);
    expect(result.rows[0].input).toEqual({
      firstName: "Alex",
      lastName: "Nguyen",
      preferredName: undefined,
      pronouns: undefined,
      birthdate: undefined,
      studentNumber: undefined,
      interests: undefined,
      strengths: undefined,
      status: "active",
    });
  });

  it("handles quoted fields containing commas", () => {
    const csv = [
      "first_name,last_name,interests",
      'Sam,Lee,"Board games, hiking, and baking"',
    ].join("\n");

    const result = parseStudentCsv(csv);

    expect(result.rows[0].input.interests).toBe("Board games, hiking, and baking");
  });

  it("handles escaped double quotes inside quoted fields", () => {
    const csv = [
      "first_name,last_name,strengths",
      'Robin,Diaz,"Says ""please"" and ""thank you"" consistently"',
    ].join("\n");

    const result = parseStudentCsv(csv);

    expect(result.rows[0].input.strengths).toBe(
      'Says "please" and "thank you" consistently',
    );
  });

  it("flags a row missing last_name without stopping the whole import", () => {
    const csv = [
      "first_name,last_name",
      "Complete,Row",
      "Missing,",
      "Another,Complete",
    ].join("\n");

    const result = parseStudentCsv(csv);

    expect(result.rows).toHaveLength(2);
    expect(result.rows.map((row) => row.input.firstName)).toEqual([
      "Complete",
      "Another",
    ]);
    expect(result.errors).toEqual([
      { rowNumber: 3, message: "Missing first_name or last_name." },
    ]);
  });

  it("flags an invalid birthdate format", () => {
    const csv = [
      "first_name,last_name,birthdate",
      "Jordan,Kim,04/12/2015",
    ].join("\n");

    const result = parseStudentCsv(csv);

    expect(result.rows).toEqual([]);
    expect(result.errors).toEqual([
      {
        rowNumber: 2,
        message: 'Invalid birthdate "04/12/2015" — use YYYY-MM-DD.',
      },
    ]);
  });

  it("flags an invalid status", () => {
    const csv = [
      "first_name,last_name,status",
      "Taylor,Reed,graduated",
    ].join("\n");

    const result = parseStudentCsv(csv);

    expect(result.errors).toEqual([
      {
        rowNumber: 2,
        message: 'Invalid status "graduated" — use active, inactive, or transferred.',
      },
    ]);
  });

  it("skips blank lines", () => {
    const csv = [
      "first_name,last_name",
      "Casey,Park",
      "",
      "Drew,Morgan",
    ].join("\n");

    const result = parseStudentCsv(csv);

    expect(result.rows).toHaveLength(2);
  });

  it("reports missing required columns and doesn't attempt to parse rows", () => {
    const csv = ["first_name,pronouns", "Jamie,they/them"].join("\n");

    const result = parseStudentCsv(csv);

    expect(result.rows).toEqual([]);
    expect(result.errors).toEqual([
      { rowNumber: 1, message: "Missing required column(s): last_name." },
    ]);
  });

  it("reports an empty file", () => {
    const result = parseStudentCsv("");

    expect(result.rows).toEqual([]);
    expect(result.errors).toEqual([{ rowNumber: 1, message: "The file is empty." }]);
  });

  it("is case-insensitive and trims whitespace on headers and values", () => {
    const csv = [
      "First_Name , Last_Name",
      " Jamie , Smith ",
    ].join("\n");

    const result = parseStudentCsv(csv);

    expect(result.errors).toEqual([]);
    expect(result.rows[0].input.firstName).toBe("Jamie");
    expect(result.rows[0].input.lastName).toBe("Smith");
  });
});
