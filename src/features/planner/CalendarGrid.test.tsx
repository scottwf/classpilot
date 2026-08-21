import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CalendarGrid } from "./CalendarGrid";

describe("CalendarGrid", () => {
  it("color-codes an advancing blocked day differently from a pausing one", () => {
    render(
      <CalendarGrid
        cycleLength={2}
        dayLabelScheme="numeric"
        endDate="2026-09-11"
        hiddenInputName="blockedDates"
        initialBlockedDates={[
          { advancesCycle: true, date: "2026-09-08", label: "PD Day" },
          { advancesCycle: false, date: "2026-09-09", label: "Snow Day" },
        ]}
        leftColumn={null}
        startDate="2026-09-01"
      />,
    );

    const advancingDay = screen.getByTitle(/PD Day — advances the cycle/);
    const pausingDay = screen.getByTitle(/Snow Day — pauses the cycle/);

    expect(advancingDay.className).toContain("bg-amber-100");
    expect(pausingDay.className).toContain("bg-violet-100");
    expect(advancingDay.className).not.toContain("bg-violet-100");
    expect(pausingDay.className).not.toContain("bg-amber-100");
  });

  it("switches a day's color when its advances-cycle checkbox is toggled off", () => {
    render(
      <CalendarGrid
        cycleLength={2}
        dayLabelScheme="numeric"
        endDate="2026-09-11"
        hiddenInputName="blockedDates"
        initialBlockedDates={[{ advancesCycle: true, date: "2026-09-08", label: "PD Day" }]}
        leftColumn={null}
        startDate="2026-09-01"
      />,
    );

    fireEvent.click(screen.getByTitle(/PD Day — advances the cycle/));
    fireEvent.click(screen.getByRole("checkbox", { name: /Advances the day cycle/ }));

    expect(screen.getByTitle(/PD Day — pauses the cycle/).className).toContain("bg-violet-100");
  });

  it("shows a legend explaining the two colors", () => {
    render(
      <CalendarGrid
        cycleLength={2}
        dayLabelScheme="numeric"
        endDate="2026-09-11"
        hiddenInputName="blockedDates"
        initialBlockedDates={[]}
        leftColumn={null}
        startDate="2026-09-01"
      />,
    );

    expect(screen.getByText(/Advances the cycle/)).toBeInTheDocument();
    expect(screen.getByText(/Pauses the cycle/)).toBeInTheDocument();
  });
});
