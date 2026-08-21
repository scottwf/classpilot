import type { ClassColor, UnitPlan } from "./types";

export type UnitColorClasses = {
  /** bg + text + border, for a filled block (unit timeline bar). */
  block: string;
  /** bg only, for a small identity dot (lesson bank, lists). */
  dot: string;
};

// Issue #27: unit color is no longer an independent choice -- it's always
// a shade of the parent class's color, so a class and its units read as
// visually related everywhere at a glance. Three tiers per hue (not more)
// keeps sibling units distinguishable without the palette getting muddy;
// literal class strings throughout (not built via template interpolation)
// because Tailwind's JIT scanner only picks up classes it can see as
// static text.
const unitColorTiers: Record<ClassColor, UnitColorClasses[]> = {
  amber: [
    { block: "bg-amber-200 text-amber-950 border-amber-300", dot: "bg-amber-400" },
    { block: "bg-amber-300 text-amber-950 border-amber-400", dot: "bg-amber-500" },
    { block: "bg-amber-400 text-amber-950 border-amber-500", dot: "bg-amber-600" },
  ],
  blue: [
    { block: "bg-blue-200 text-blue-950 border-blue-300", dot: "bg-blue-400" },
    { block: "bg-blue-300 text-blue-950 border-blue-400", dot: "bg-blue-500" },
    { block: "bg-blue-400 text-blue-950 border-blue-500", dot: "bg-blue-600" },
  ],
  emerald: [
    { block: "bg-emerald-200 text-emerald-950 border-emerald-300", dot: "bg-emerald-400" },
    { block: "bg-emerald-300 text-emerald-950 border-emerald-400", dot: "bg-emerald-500" },
    { block: "bg-emerald-400 text-emerald-950 border-emerald-500", dot: "bg-emerald-600" },
  ],
  orange: [
    { block: "bg-orange-200 text-orange-950 border-orange-300", dot: "bg-orange-400" },
    { block: "bg-orange-300 text-orange-950 border-orange-400", dot: "bg-orange-500" },
    { block: "bg-orange-400 text-orange-950 border-orange-500", dot: "bg-orange-600" },
  ],
  rose: [
    { block: "bg-rose-200 text-rose-950 border-rose-300", dot: "bg-rose-400" },
    { block: "bg-rose-300 text-rose-950 border-rose-400", dot: "bg-rose-500" },
    { block: "bg-rose-400 text-rose-950 border-rose-500", dot: "bg-rose-600" },
  ],
  sky: [
    { block: "bg-sky-200 text-sky-950 border-sky-300", dot: "bg-sky-400" },
    { block: "bg-sky-300 text-sky-950 border-sky-400", dot: "bg-sky-500" },
    { block: "bg-sky-400 text-sky-950 border-sky-500", dot: "bg-sky-600" },
  ],
  teal: [
    { block: "bg-teal-200 text-teal-950 border-teal-300", dot: "bg-teal-400" },
    { block: "bg-teal-300 text-teal-950 border-teal-400", dot: "bg-teal-500" },
    { block: "bg-teal-400 text-teal-950 border-teal-500", dot: "bg-teal-600" },
  ],
  violet: [
    { block: "bg-violet-200 text-violet-950 border-violet-300", dot: "bg-violet-400" },
    { block: "bg-violet-300 text-violet-950 border-violet-400", dot: "bg-violet-500" },
    { block: "bg-violet-400 text-violet-950 border-violet-500", dot: "bg-violet-600" },
  ],
};

const tierCount = unitColorTiers.blue.length;

/**
 * Which shade tier (0..tierCount-1) a unit gets within its class, so
 * sibling units stay visually distinct while still reading as "the same
 * class." Ordered by startDate (id as a stable tiebreak) so shades
 * roughly progress chronologically through the year rather than looking
 * arbitrary.
 */
export function getUnitShadeIndex(
  unitId: string,
  siblingUnits: Array<Pick<UnitPlan, "id" | "startDate">>,
): number {
  const ordered = [...siblingUnits].sort(
    (left, right) =>
      left.startDate.localeCompare(right.startDate) || left.id.localeCompare(right.id),
  );
  const index = ordered.findIndex((unit) => unit.id === unitId);

  return index === -1 ? 0 : index % tierCount;
}

export function getUnitColorClasses(classColor: ClassColor, shadeIndex: number): UnitColorClasses {
  return unitColorTiers[classColor][((shadeIndex % tierCount) + tierCount) % tierCount];
}
