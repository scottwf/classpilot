import { describe, expect, it } from "vitest";
import { getUnitColorClasses, getUnitShadeIndex } from "./unit-color";

describe("getUnitShadeIndex", () => {
  it("orders siblings by startDate, earliest first", () => {
    const siblings = [
      { id: "unit-b", startDate: "2026-10-01" },
      { id: "unit-a", startDate: "2026-09-01" },
      { id: "unit-c", startDate: "2026-11-01" },
    ];

    expect(getUnitShadeIndex("unit-a", siblings)).toBe(0);
    expect(getUnitShadeIndex("unit-b", siblings)).toBe(1);
    expect(getUnitShadeIndex("unit-c", siblings)).toBe(2);
  });

  it("wraps around once there are more units than shade tiers", () => {
    const siblings = [
      { id: "unit-1", startDate: "2026-09-01" },
      { id: "unit-2", startDate: "2026-09-15" },
      { id: "unit-3", startDate: "2026-10-01" },
      { id: "unit-4", startDate: "2026-10-15" },
    ];

    expect(getUnitShadeIndex("unit-1", siblings)).toBe(0);
    expect(getUnitShadeIndex("unit-4", siblings)).toBe(0);
  });

  it("breaks ties on the same startDate by id, deterministically", () => {
    const siblings = [
      { id: "unit-z", startDate: "2026-09-01" },
      { id: "unit-a", startDate: "2026-09-01" },
    ];

    expect(getUnitShadeIndex("unit-a", siblings)).toBe(0);
    expect(getUnitShadeIndex("unit-z", siblings)).toBe(1);
  });

  it("returns 0 for a unit not present in the sibling list", () => {
    expect(getUnitShadeIndex("unit-missing", [{ id: "unit-a", startDate: "2026-09-01" }])).toBe(0);
  });
});

describe("getUnitColorClasses", () => {
  it("returns literal Tailwind classes matching the class's hue", () => {
    const classes = getUnitColorClasses("blue", 0);
    expect(classes.block).toContain("blue");
    expect(classes.dot).toContain("blue");
  });

  it("returns a different shade for each tier of the same hue", () => {
    const shade0 = getUnitColorClasses("emerald", 0);
    const shade1 = getUnitColorClasses("emerald", 1);
    const shade2 = getUnitColorClasses("emerald", 2);

    expect(new Set([shade0.block, shade1.block, shade2.block]).size).toBe(3);
  });

  it("wraps shade indexes outside 0..2 back into range instead of throwing", () => {
    expect(getUnitColorClasses("rose", 3)).toEqual(getUnitColorClasses("rose", 0));
    expect(getUnitColorClasses("rose", -1)).toEqual(getUnitColorClasses("rose", 2));
  });
});
