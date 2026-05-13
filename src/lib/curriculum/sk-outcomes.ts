import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { CurriculumOutcome } from "@/src/features/planner/types";

type CsvImportInput = {
  csv: string;
  grade: string;
  subject: string;
};

const grade6OutcomeFiles = [
  ["Arts Education", "13_Arts_Education_6_.csv"],
  ["Career Education", "203_Career_Education_6_.csv"],
  ["English Language Arts", "32_English_Language_Arts_6_.csv"],
  ["Health Education", "50_Health_Education_6_.csv"],
  ["Mathematics", "150_Mathematics_6_.csv"],
  ["Physical Education", "196_Physical_Education_6_.csv"],
  ["Science", "59_Science_6_.csv"],
  ["Social Studies", "169_Social_Studies_6_.csv"],
] as const;

export function loadSaskatchewanGrade6Outcomes(): CurriculumOutcome[] {
  const basePath = join(process.cwd(), "docs", "SK outcomes to import");

  return grade6OutcomeFiles.flatMap(([subject, fileName]) =>
    parseSaskatchewanOutcomeCsv({
      csv: readFileSync(join(basePath, fileName), "utf8"),
      grade: "6",
      subject,
    }),
  );
}

export function parseSaskatchewanOutcomeCsv({
  csv,
  grade,
  subject,
}: CsvImportInput): CurriculumOutcome[] {
  return parseCsvRows(csv)
    .filter(([rowType]) => rowType === "Outcome")
    .map(([, code, description]) => ({
      id: outcomeIdFor(subject, code),
      code,
      description: cleanDescription(description),
      grade,
      strand: strandFromCode(code),
      subject,
    }));
}

export function outcomeIdFor(subject: string, code: string): string {
  return `sk-grade-6-${slugify(subject)}-${slugify(code)}`;
}

function parseCsvRows(csv: string): string[][] {
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;

  for (let index = 0; index < csv.length; index += 1) {
    const character = csv[index];
    const nextCharacter = csv[index + 1];

    if (character === '"' && inQuotes && nextCharacter === '"') {
      field += '"';
      index += 1;
      continue;
    }

    if (character === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (character === "," && !inQuotes) {
      row.push(field);
      field = "";
      continue;
    }

    if ((character === "\n" || character === "\r") && !inQuotes) {
      if (character === "\r" && nextCharacter === "\n") {
        index += 1;
      }

      row.push(field);
      if (row.some((value) => value.trim().length > 0)) {
        rows.push(row);
      }
      row = [];
      field = "";
      continue;
    }

    field += character;
  }

  row.push(field);
  if (row.some((value) => value.trim().length > 0)) {
    rows.push(row);
  }

  return rows.map((values) => values.map((value) => value.trim()));
}

function cleanDescription(description: string): string {
  return description
    .replace(/<li>/gi, "")
    .replace(/<\/li>/gi, "; ")
    .replace(/<\/?(ul|ol|p|i|strong|em|br)\s*\/?>/gi, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .replace(/\s+;/g, ";")
    .replace(/;\s*$/g, "")
    .trim();
}

function strandFromCode(code: string): string {
  return code.split(/[0-9.]/)[0] || "Outcome";
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
