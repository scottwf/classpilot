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
