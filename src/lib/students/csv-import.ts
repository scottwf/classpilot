import type { StudentStatus } from "@/src/features/students/types";
import type { CreateStudentInput } from "@/src/lib/db/students-repository";

export type StudentCsvRow = {
  /** 1-based row number matching what a spreadsheet would show (the header
   * is row 1), for error messages that point back to the source file. */
  rowNumber: number;
  input: Omit<CreateStudentInput, "schoolYearId">;
};

export type StudentCsvError = {
  rowNumber: number;
  message: string;
};

export type StudentCsvParseResult = {
  rows: StudentCsvRow[];
  errors: StudentCsvError[];
};

const requiredHeaders = ["first_name", "last_name"];
const validStatuses = new Set<StudentStatus>(["active", "inactive", "transferred"]);
const birthdatePattern = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Parses raw CSV text into a table of fields, handling quoted fields
 * (commas, newlines, and escaped "" quotes inside them) — a hand-rolled
 * parser since the project has no CSV dependency and the format is simple
 * enough not to need one.
 */
function parseCsvTable(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = 0;

  const endField = () => {
    row.push(field);
    field = "";
  };
  const endRow = () => {
    endField();
    rows.push(row);
    row = [];
  };

  while (i < text.length) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      field += char;
      i += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }
    if (char === ",") {
      endField();
      i += 1;
      continue;
    }
    if (char === "\r") {
      i += 1;
      continue;
    }
    if (char === "\n") {
      endRow();
      i += 1;
      continue;
    }
    field += char;
    i += 1;
  }

  // Last row won't have a trailing newline to trigger endRow().
  if (field !== "" || row.length > 0) {
    endRow();
  }

  return rows;
}

/**
 * Parses a student roster CSV into rows ready for createStudent() plus a
 * report of any rows that failed validation (missing name, bad birthdate
 * format, unrecognized status). Valid and invalid rows are both collected
 * so the caller can decide whether to import the valid ones or reject the
 * whole file — see docs/student-import-sample.csv for the expected format.
 */
export function parseStudentCsv(csvText: string): StudentCsvParseResult {
  const table = parseCsvTable(csvText).filter(
    (fields) => !(fields.length === 1 && fields[0].trim() === ""),
  );

  if (table.length === 0) {
    return { rows: [], errors: [{ rowNumber: 1, message: "The file is empty." }] };
  }

  const header = table[0].map((cell) => cell.trim().toLowerCase());
  const missingHeaders = requiredHeaders.filter((name) => !header.includes(name));

  if (missingHeaders.length > 0) {
    return {
      rows: [],
      errors: [
        {
          rowNumber: 1,
          message: `Missing required column(s): ${missingHeaders.join(", ")}.`,
        },
      ],
    };
  }

  const rows: StudentCsvRow[] = [];
  const errors: StudentCsvError[] = [];

  for (let index = 1; index < table.length; index += 1) {
    const rowNumber = index + 1;
    const fields = table[index];
    const record: Record<string, string> = {};
    header.forEach((key, columnIndex) => {
      record[key] = (fields[columnIndex] ?? "").trim();
    });

    const firstName = record.first_name ?? "";
    const lastName = record.last_name ?? "";

    if (!firstName || !lastName) {
      errors.push({ rowNumber, message: "Missing first_name or last_name." });
      continue;
    }

    const birthdate = record.birthdate ?? "";
    if (birthdate && !birthdatePattern.test(birthdate)) {
      errors.push({
        rowNumber,
        message: `Invalid birthdate "${birthdate}" — use YYYY-MM-DD.`,
      });
      continue;
    }

    const statusRaw = (record.status ?? "").toLowerCase();
    if (statusRaw && !validStatuses.has(statusRaw as StudentStatus)) {
      errors.push({
        rowNumber,
        message: `Invalid status "${record.status}" — use active, inactive, or transferred.`,
      });
      continue;
    }

    rows.push({
      rowNumber,
      input: {
        firstName,
        lastName,
        preferredName: record.preferred_name || undefined,
        pronouns: record.pronouns || undefined,
        birthdate: birthdate || undefined,
        studentNumber: record.student_number || undefined,
        interests: record.interests || undefined,
        strengths: record.strengths || undefined,
        status: statusRaw ? (statusRaw as StudentStatus) : "active",
      },
    });
  }

  return { rows, errors };
}
