import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LessonBank } from "./LessonBank";
import type { EnrichedLesson, LessonBankFilterOptions } from "./lesson-queries";

function lesson(overrides: Partial<EnrichedLesson>): EnrichedLesson {
  return {
    id: "lesson-1",
    title: "Ratio Language",
    date: "2026-09-11",
    sequence: 1,
    durationMinutes: 50,
    status: "planned",
    outcomeIds: [],
    summary: "",
    classId: "class-math",
    className: "Math 6",
    subject: "Mathematics",
    grade: "6",
    classColor: "violet",
    unitId: "unit-1",
    unitTitle: "Ratios and Rates",
    unitShadeIndex: 0,
    outcomeCodes: ["N6.1"],
    ...overrides,
  };
}

const filterOptions: LessonBankFilterOptions = {
  subjects: ["Mathematics"],
  units: [{ id: "unit-1", title: "Ratios and Rates" }],
  grades: ["6"],
  outcomeCodes: ["N6.1"],
};

function renderBank(lessons: EnrichedLesson[]) {
  return render(
    <LessonBank
      filterOptions={filterOptions}
      filters={{}}
      lessons={lessons}
      onFiltersChange={() => {}}
      sort="date"
      totalCount={lessons.length}
    />,
  );
}

describe("LessonBank", () => {
  it("shows each lesson's unit in a shade of its class's colour", () => {
    const { container } = renderBank([
      lesson({ id: "a", classColor: "violet", unitShadeIndex: 0 }),
      lesson({
        id: "b",
        title: "Scaling Recipes",
        classColor: "violet",
        unitId: "unit-2",
        unitTitle: "Scaling",
        unitShadeIndex: 1,
      }),
    ]);

    const chips = Array.from(container.querySelectorAll("span")).filter((element) =>
      /Ratios and Rates|Scaling/.test(element.textContent ?? ""),
    );
    const chipClasses = chips.map((chip) => chip.className).join(" ");

    // Both units read as the same class (violet), in different shades.
    expect(chipClasses).toContain("violet");
    expect(chipClasses).not.toMatch(/-(blue|emerald|amber|rose|sky|orange|teal)-/);
  });

  it("names the unit in text as well as colour, so colour is never the only signal", () => {
    renderBank([lesson({})]);

    // Also matched by the unit/subject filter <option>s, hence getAllByText.
    expect(screen.getAllByText("Ratios and Rates").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Mathematics").length).toBeGreaterThan(0);
  });

  it("offers an (i) tip explaining what the colours mean", () => {
    renderBank([lesson({})]);

    const tip = screen.getByRole("button", { name: "More about the lesson bank" });
    fireEvent.click(tip);

    expect(screen.getByRole("note")).toHaveTextContent(/shade of/i);
  });
});
