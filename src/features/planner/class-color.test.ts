import { describe, expect, it } from "vitest";
import {
  classColorPalette,
  getClassBlockColorClass,
  getClassColorClasses,
  getClassDotColorClass,
  pickUnusedClassColor,
} from "./class-color";

describe("pickUnusedClassColor", () => {
  it("returns the first palette color when no classes exist yet", () => {
    expect(pickUnusedClassColor([])).toBe("blue");
  });

  it("skips colors already used by existing classes", () => {
    expect(pickUnusedClassColor([{ color: "blue" }])).toBe("emerald");
    expect(pickUnusedClassColor([{ color: "blue" }, { color: "emerald" }])).toBe("amber");
  });

  it("skips used colors regardless of order", () => {
    expect(pickUnusedClassColor([{ color: "amber" }, { color: "blue" }])).toBe("emerald");
  });

  it("ignores duplicate colors across classes", () => {
    expect(pickUnusedClassColor([{ color: "blue" }, { color: "blue" }, { color: "blue" }])).toBe(
      "emerald",
    );
  });

  it("falls back to the first color once every swatch is in use", () => {
    const allColors = [
      "blue",
      "emerald",
      "amber",
      "rose",
      "violet",
      "sky",
      "orange",
      "teal",
    ] as const;
    const classes = allColors.map((color) => ({ color }));

    expect(pickUnusedClassColor(classes)).toBe("blue");
  });
});

describe("getClassColorClasses", () => {
  it("returns classes in the class's own hue for every palette color", () => {
    for (const color of classColorPalette) {
      expect(getClassDotColorClass(color)).toContain(color);
      expect(getClassBlockColorClass(color)).toContain(color);
    }
  });

  it("gives every palette color a distinct dot, so classes stay tellable apart", () => {
    const dots = classColorPalette.map(getClassDotColorClass);

    expect(new Set(dots).size).toBe(classColorPalette.length);
  });

  it("pairs each filled block with the darkest text shade of its hue, for contrast", () => {
    for (const color of classColorPalette) {
      // bg-<hue>-100 behind text-<hue>-950 clears WCAG AA comfortably in
      // every Tailwind hue we use; asserting the pairing keeps a future
      // palette edit from quietly dropping to an unreadable combination.
      expect(getClassBlockColorClass(color)).toContain(`bg-${color}-100`);
      expect(getClassBlockColorClass(color)).toContain(`text-${color}-950`);
    }
  });

  it("falls back to the first palette color for an unknown legacy value", () => {
    const unknown = "chartreuse" as (typeof classColorPalette)[number];

    expect(getClassColorClasses(unknown)).toEqual(getClassColorClasses("blue"));
  });
});
