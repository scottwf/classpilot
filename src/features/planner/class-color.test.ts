import { describe, expect, it } from "vitest";
import { pickUnusedClassColor } from "./class-color";

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
