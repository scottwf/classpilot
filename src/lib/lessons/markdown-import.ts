import type { LessonSections, LessonStatus } from "@/src/features/planner/types";
import { emptyLessonSections } from "./lesson-sections";

export type ParsedLessonMarkdown = {
  date: string;
  durationMinutes: number;
  outcomeRefs: string[];
  sections: LessonSections;
  status: LessonStatus;
  summary: string;
  title: string;
  unitRef: string;
};

const validStatuses = new Set<LessonStatus>([
  "planned",
  "taught",
  "delayed",
  "skipped",
]);

const metadataKeys = new Set([
  "date",
  "duration",
  "duration minutes",
  "outcomes",
  "status",
  "unit",
]);

export function parseLessonMarkdown(markdown: string): ParsedLessonMarkdown {
  const normalized = markdown.replace(/\r\n/g, "\n").trim();
  const lines = normalized.split("\n");
  const title = parseTitle(lines);
  const metadata = parseMetadata(lines);
  const date = requiredMetadata(metadata, "date");
  const unitRef = requiredMetadata(metadata, "unit");
  const status = parseStatus(metadata.get("status") ?? "planned");
  const durationMinutes = parseDuration(metadata.get("duration minutes") ?? metadata.get("duration"));
  const outcomeRefs = splitRefs(metadata.get("outcomes") ?? "");
  const summary = stripImportMetadata(lines).trim();
  const sections = parseSections(summary.split("\n"));

  if (!summary) {
    throw new Error("Lesson markdown must include lesson sections.");
  }

  return {
    date,
    durationMinutes,
    outcomeRefs,
    sections,
    status,
    summary,
    title,
    unitRef,
  };
}

function parseTitle(lines: string[]) {
  const heading = lines.find((line) => line.trim().startsWith("# "));

  if (!heading) {
    throw new Error("Lesson markdown must start with a # lesson title.");
  }

  const title = heading.replace(/^#\s*(Lesson:\s*)?/i, "").trim();

  if (!title) {
    throw new Error("Lesson title cannot be empty.");
  }

  return title;
}

function parseMetadata(lines: string[]) {
  const metadata = new Map<string, string>();

  for (const line of lines) {
    const match = line.match(/^([A-Za-z ]+):\s*(.+)$/);

    if (!match) {
      continue;
    }

    const key = match[1].trim().toLowerCase();

    if (metadataKeys.has(key)) {
      metadata.set(key, match[2].trim());
    }
  }

  return metadata;
}

function parseDuration(value: string | undefined) {
  const minutes = Number(value);

  if (!Number.isInteger(minutes) || minutes <= 0) {
    throw new Error("Lesson duration must be a positive number of minutes.");
  }

  return minutes;
}

function parseStatus(value: string) {
  const status = value.trim().toLowerCase() as LessonStatus;

  if (!validStatuses.has(status)) {
    throw new Error("Lesson status must be planned, taught, delayed, or skipped.");
  }

  return status;
}

function requiredMetadata(metadata: Map<string, string>, key: string) {
  const value = metadata.get(key);

  if (!value) {
    throw new Error(`Lesson markdown is missing ${key}.`);
  }

  return value;
}

function splitRefs(value: string) {
  return value
    .split(",")
    .map((ref) => ref.trim())
    .filter(Boolean);
}

function stripImportMetadata(lines: string[]) {
  return lines
    .filter((line) => {
      const match = line.match(/^([A-Za-z ]+):\s*(.+)$/);
      return !match || !metadataKeys.has(match[1].trim().toLowerCase());
    })
    .join("\n");
}

function parseSections(lines: string[]) {
  const sections = emptyLessonSections();
  const sectionContent = new Map<string, string[]>();
  let currentHeading: string | undefined;

  for (const line of lines) {
    const heading = line.match(/^##\s+(.+)$/);

    if (heading) {
      currentHeading = heading[1].trim().toLowerCase();
      sectionContent.set(currentHeading, []);
      continue;
    }

    if (currentHeading) {
      sectionContent.get(currentHeading)?.push(line);
    }
  }

  sections.learningGoals = readSection(sectionContent, "learning goals");
  sections.materials = readSection(sectionContent, "materials");
  sections.mindsOn = readSection(sectionContent, "minds on");
  sections.lessonFlow = readSection(sectionContent, "lesson flow");
  sections.assessment = readSection(sectionContent, "assessment");
  sections.differentiation = readSection(sectionContent, "differentiation");
  sections.resources = readSection(sectionContent, "resources");
  sections.reflection = readSection(sectionContent, "reflection");

  return sections;
}

function readSection(sectionContent: Map<string, string[]>, heading: string) {
  return (sectionContent.get(heading) ?? []).join("\n").trim();
}
