#!/usr/bin/env npx tsx

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import mammoth from "mammoth";
import { parseLessonMarkdown } from "@/src/lib/lessons/markdown-import";

type SectionName = "learningGoals" | "materials" | "mindsOn" | "lessonFlow" | "assessment" | "differentiation" | "resources" | "reflection";
type SourceLesson = { durationMinutes: number; number: number; outcomes: string; sections: Record<SectionName, string>; title: string };
type HtmlToken = { kind: "paragraph" | "listItem"; text: string };

export type ConversionWarning = { lessonNumber: number; section: string };
export type ConvertedLesson = { fileName: string; markdown: string; number: number; warnings: ConversionWarning[] };

const sectionNames: SectionName[] = ["learningGoals", "materials", "mindsOn", "lessonFlow", "assessment", "differentiation", "resources", "reflection"];
const sourceHeadings: Array<{ pattern: RegExp; section: SectionName }> = [
  { pattern: /^learning objectives$/i, section: "learningGoals" },
  { pattern: /^materials$/i, section: "materials" },
  { pattern: /^hook(?:\s*\([^)]*\))?$/i, section: "mindsOn" },
  { pattern: /^direct instruction\s*\/\s*exploration(?:\s*\([^)]*\))?$/i, section: "lessonFlow" },
  { pattern: /^guided practice(?:\s*\([^)]*\))?$/i, section: "lessonFlow" },
  { pattern: /^independent\s*\/\s*group activity(?:\s*\([^)]*\))?$/i, section: "lessonFlow" },
  { pattern: /^closure\s*&\s*assessment(?:\s*\([^)]*\))?$/i, section: "assessment" },
  { pattern: /^differentiation$/i, section: "differentiation" },
  { pattern: /^treaty education connection$/i, section: "resources" },
  { pattern: /^cross-curricular connections$/i, section: "resources" },
  { pattern: /^teacher notes$/i, section: "resources" },
];
const resourceLabels = new Map([["treaty education connection", "Treaty Education Connection"], ["cross-curricular connections", "Cross-Curricular Connections"], ["teacher notes", "Teacher Notes"]]);

/** Convert Mammoth HTML from the documented ClassPilot lesson-docx shape. */
export function convertDocumentHtml(html: string, unit: string, dates: string[]): ConvertedLesson[] {
  if (!unit.trim()) throw new Error("A --unit title or id is required.");
  const lessons = parseSourceLessons(extractHtmlTokens(html));
  if (dates.length < lessons.length) throw new Error(`Need ${lessons.length} dates, but received ${dates.length}.`);
  return lessons.map((lesson, index) => {
    const markdown = renderLessonMarkdown(lesson, unit.trim(), dates[index]);
    const parsed = parseLessonMarkdown(markdown); // The app's existing import contract.
    if (!parsed.outcomeRefs.length) throw new Error(`Lesson ${lesson.number} is missing Outcomes.`);
    return {
      fileName: `lesson-${String(lesson.number).padStart(2, "0")}-${slugify(lesson.title)}.md`, markdown, number: lesson.number,
      warnings: sectionNames.filter((section) => !lesson.sections[section].trim()).map((section) => ({ lessonNumber: lesson.number, section })),
    };
  });
}

export function renderLessonMarkdown(lesson: SourceLesson, unit: string, date: string) {
  if (!isIsoDate(date)) throw new Error(`Invalid date "${date}". Use YYYY-MM-DD.`);
  return [
    `# ${lesson.title}`, `Date: ${date}`, `Duration minutes: ${lesson.durationMinutes}`, `Unit: ${unit}`, "Status: planned", `Outcomes: ${lesson.outcomes}`, "",
    "## Learning Goals", lesson.sections.learningGoals, "", "## Materials", lesson.sections.materials, "", "## Minds On", lesson.sections.mindsOn, "", "## Lesson Flow", lesson.sections.lessonFlow, "", "## Assessment", lesson.sections.assessment, "", "## Differentiation", lesson.sections.differentiation, "", "## Resources", lesson.sections.resources, "", "## Reflection", lesson.sections.reflection, "",
  ].join("\n");
}

export function buildMeetingDates(lessonCount: number, startDate: string, weekdays: number[]) {
  if (!isIsoDate(startDate)) throw new Error(`Invalid start date "${startDate}". Use YYYY-MM-DD.`);
  if (!weekdays.length || weekdays.some((day) => !Number.isInteger(day) || day < 0 || day > 6)) throw new Error("--weekdays must be numbers from 0 (Sunday) to 6 (Saturday).");
  const selectedDays = new Set(weekdays), current = new Date(`${startDate}T12:00:00Z`), dates: string[] = [];
  while (dates.length < lessonCount) {
    if (selectedDays.has(current.getUTCDay())) dates.push(current.toISOString().slice(0, 10));
    current.setUTCDate(current.getUTCDate() + 1);
  }
  return dates;
}

function parseSourceLessons(tokens: HtmlToken[]) {
  const lessons: SourceLesson[] = [];
  let lesson: SourceLesson | undefined, activeSection: SectionName | undefined, pastClassProgressNotes = false;
  for (const token of tokens) {
    const title = token.text.match(/^Lesson\s+(\d+)\s+(.+)$/i);
    if (title) {
      if (lesson) lessons.push(lesson);
      lesson = createSourceLesson(Number(title[1]), title[2]); activeSection = undefined; pastClassProgressNotes = false;
      continue;
    }
    if (!lesson || pastClassProgressNotes) continue;
    const metadata = token.text.match(/^Outcomes:\s*(.+?)\s*·\s*Duration:\s*(\d+)\s*minutes\s*·\s*Unit:\s*(.+)$/i);
    if (metadata) { lesson.outcomes = metadata[1].replace(/\s*·\s*/g, ", ").trim(); lesson.durationMinutes = Number(metadata[2]); continue; }
    if (/^Class Progress Notes$/i.test(token.text)) { pastClassProgressNotes = true; continue; }
    const reflection = token.text.match(/^Teacher Reflection\s*\(fill in after teaching\):\s*(.*)$/i);
    if (reflection) { lesson.sections.reflection = reflection[1].trim(); activeSection = "reflection"; continue; }
    const sourceHeading = sourceHeadings.find(({ pattern }) => pattern.test(token.text));
    if (sourceHeading) {
      activeSection = sourceHeading.section;
      const resourceLabel = resourceLabels.get(token.text.toLowerCase());
      if (resourceLabel) appendSection(lesson, "resources", `**${resourceLabel}**`);
      else if (activeSection === "lessonFlow") appendSection(lesson, "lessonFlow", `**${normalizeFlowHeading(token.text)}**`);
      continue;
    }
    if (activeSection) appendSection(lesson, activeSection, token.kind === "listItem" ? `- ${token.text}` : token.text);
  }
  if (lesson) lessons.push(lesson);
  if (!lessons.length) throw new Error("No lesson boundaries found. Expected paragraphs beginning with 'Lesson N'.");
  for (const sourceLesson of lessons) {
    if (!sourceLesson.title || !sourceLesson.outcomes || !sourceLesson.durationMinutes) throw new Error(`Lesson ${sourceLesson.number} is missing its title, outcomes, or duration metadata.`);
  }
  return lessons;
}

function createSourceLesson(number: number, title: string): SourceLesson {
  return { durationMinutes: 0, number, outcomes: "", title: title.trim(), sections: { assessment: "", differentiation: "", learningGoals: "", lessonFlow: "", materials: "", mindsOn: "", reflection: "", resources: "" } };
}
function appendSection(lesson: SourceLesson, section: SectionName, value: string) {
  if (value.trim()) lesson.sections[section] = [lesson.sections[section], value.trim()].filter(Boolean).join("\n\n");
}
function normalizeFlowHeading(value: string) { return value.replace(/\s*\([^)]*\)\s*$/, "").replace(/\s+/g, " ").trim(); }
function extractHtmlTokens(html: string): HtmlToken[] {
  const tokens: HtmlToken[] = [], element = /<(p|li)\b[^>]*>([\s\S]*?)<\/\1>/gi;
  let match: RegExpExecArray | null;
  while ((match = element.exec(html))) {
    const text = htmlToText(match[2]);
    if (text) tokens.push({ kind: match[1].toLowerCase() === "li" ? "listItem" : "paragraph", text });
  }
  return tokens;
}
function htmlToText(value: string) {
  return decodeHtml(value.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "")).replace(/\u00a0/g, " ").replace(/[ \t]+/g, " ").replace(/\n\s*/g, "\n").trim();
}
function decodeHtml(value: string) { return value.replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">"); }
function slugify(value: string) { return value.toLowerCase().normalize("NFKD").replace(/[^\p{Letter}\p{Number}]+/gu, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "untitled"; }
function isIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

type CliOptions = { datesFile?: string; input?: string; output?: string; placeholderDate?: string; startDate?: string; unit?: string; weekdays?: number[] };
function parseCliOptions(args: string[]): CliOptions {
  const values = new Map<string, string>();
  for (let index = 0; index < args.length; index += 2) {
    const key = args[index], value = args[index + 1];
    if (!key?.startsWith("--") || !value || value.startsWith("--")) throw new Error("Arguments must be --name value pairs. Use --help for usage.");
    values.set(key, value);
  }
  return { datesFile: values.get("--dates"), input: values.get("--input"), output: values.get("--output"), placeholderDate: values.get("--placeholder-date"), startDate: values.get("--start-date"), unit: values.get("--unit"), weekdays: values.get("--weekdays")?.split(",").map((value) => Number(value.trim())) };
}
function usage() {
  return `Usage:
  npm run import:docx-lessons -- --input lessons.docx --output generated-lessons --unit "Unit title" --dates meeting-dates.txt
  npm run import:docx-lessons -- --input lessons.docx --output generated-lessons --unit "Unit title" --start-date 2026-09-08 --weekdays 1,3,5
  npm run import:docx-lessons -- --input lessons.docx --output generated-lessons --unit "Unit title" --placeholder-date 2099-01-01

Dates file: one YYYY-MM-DD meeting date per line (or comma-separated). Use it for the real class schedule, holidays, and cycle days.
Weekdays: 0=Sunday through 6=Saturday. This recurring option does not skip holidays; use --dates for actual irregular schedules.
Placeholder dates only make the files parseable. Replace every Date before importing.`;
}
async function main() {
  if (process.argv.slice(2).includes("--help")) { console.log(usage()); return; }
  const options = parseCliOptions(process.argv.slice(2));
  if (!options.input || !options.output || !options.unit) throw new Error(`${usage()}\n\n--input, --output, and --unit are required.`);
  const sourcePath = resolve(options.input), result = await mammoth.convertToHtml({ path: sourcePath });
  const lessonCount = parseSourceLessons(extractHtmlTokens(result.value)).length;
  const converted = convertDocumentHtml(result.value, options.unit, resolveDates(options, lessonCount));
  const outputDirectory = resolve(options.output), destinations = converted.map(({ fileName }) => join(outputDirectory, fileName)), existing = destinations.filter(existsSync);
  if (existing.length) throw new Error(`Refusing to overwrite existing output files:\n${existing.join("\n")}`);
  mkdirSync(outputDirectory, { recursive: true });
  for (const lesson of converted) writeFileSync(join(outputDirectory, lesson.fileName), lesson.markdown, "utf8");
  console.log(`Converted ${converted.length} lessons from ${basename(sourcePath)} to ${outputDirectory}.`);
  if (options.placeholderDate) console.warn("WARNING: Placeholder dates were used. Replace every Date before importing these files.");
  for (const warning of converted.flatMap((lesson) => lesson.warnings)) console.warn(`WARNING: Lesson ${warning.lessonNumber} has an empty ${warning.section} section.`);
  if (result.messages.length) console.warn(`Mammoth reported ${result.messages.length} conversion message(s).`);
}
function resolveDates(options: CliOptions, lessonCount: number) {
  const methods = [options.datesFile, options.startDate || options.weekdays ? "recurring" : undefined, options.placeholderDate].filter(Boolean);
  if (methods.length !== 1) throw new Error("Supply exactly one date strategy: --dates, --start-date with --weekdays, or --placeholder-date.");
  if (options.datesFile) {
    const dates = readFileSync(resolve(options.datesFile), "utf8").split(/[\s,]+/).filter(Boolean);
    if (dates.some((date) => !isIsoDate(date))) throw new Error("--dates contains an invalid date. Use YYYY-MM-DD values only.");
    return dates;
  }
  if (options.startDate || options.weekdays) {
    if (!options.startDate || !options.weekdays) throw new Error("--start-date and --weekdays must be supplied together.");
    return buildMeetingDates(lessonCount, options.startDate, options.weekdays);
  }
  if (!options.placeholderDate || !isIsoDate(options.placeholderDate)) throw new Error("--placeholder-date must be a valid YYYY-MM-DD date.");
  return Array.from({ length: lessonCount }, () => options.placeholderDate as string);
}
if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) {
  main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
}
