import type { ClassColor, ClassSection } from "./types";

export const classColorPalette: ClassColor[] = [
  "blue",
  "emerald",
  "amber",
  "rose",
  "violet",
  "sky",
  "orange",
  "teal",
];

/**
 * The first palette color not already used by an existing class — so a
 * batch of classes added one after another don't all start out blue. Falls
 * back to the first color once every swatch is already in use.
 */
export function pickUnusedClassColor(existingClasses: Array<Pick<ClassSection, "color">>): ClassColor {
  const usedColors = new Set(existingClasses.map((classSection) => classSection.color));
  return classColorPalette.find((color) => !usedColors.has(color)) ?? classColorPalette[0];
}

/**
 * The Tailwind classes that carry a class's identity color. Issue #27:
 * every view that shows a class used to keep its own private copy of this
 * map (schedule grid, outcome map, lesson bank, curriculum library, ...),
 * which is how they drifted apart; this is the single source they all
 * read from now, and it's the same hue set `unit-color.ts` derives unit
 * shades from, so a class and its units always read as related.
 *
 * Literal class strings (never template-interpolated) because Tailwind's
 * JIT scanner only picks up classes it can see as static text.
 */
export type ClassColorClasses = {
  /** bg only, for a small identity dot or a palette swatch. */
  dot: string;
  /** bg + text, for a filled block (timetable slot, chip). */
  block: string;
};

const classColorClasses: Record<ClassColor, ClassColorClasses> = {
  amber: { dot: "bg-amber-500", block: "bg-amber-100 text-amber-950" },
  blue: { dot: "bg-blue-500", block: "bg-blue-100 text-blue-950" },
  emerald: { dot: "bg-emerald-500", block: "bg-emerald-100 text-emerald-950" },
  orange: { dot: "bg-orange-500", block: "bg-orange-100 text-orange-950" },
  rose: { dot: "bg-rose-500", block: "bg-rose-100 text-rose-950" },
  sky: { dot: "bg-sky-500", block: "bg-sky-100 text-sky-950" },
  teal: { dot: "bg-teal-500", block: "bg-teal-100 text-teal-950" },
  violet: { dot: "bg-violet-500", block: "bg-violet-100 text-violet-950" },
};

/** Falls back to the first palette color for an unknown/legacy value so a
 * stray color string renders a plain dot instead of crashing the page. */
export function getClassColorClasses(color: ClassColor): ClassColorClasses {
  return classColorClasses[color] ?? classColorClasses[classColorPalette[0]];
}

export function getClassDotColorClass(color: ClassColor): string {
  return getClassColorClasses(color).dot;
}

export function getClassBlockColorClass(color: ClassColor): string {
  return getClassColorClasses(color).block;
}
