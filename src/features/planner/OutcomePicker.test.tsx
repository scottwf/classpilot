import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { OutcomePicker } from "./OutcomePicker";
import type { CurriculumOutcome } from "./types";

function outcome(overrides: Partial<CurriculumOutcome>): CurriculumOutcome {
  return {
    id: "id",
    code: "CODE",
    description: "",
    subject: "Mathematics",
    grade: "6",
    strand: "",
    ...overrides,
  };
}

const outcomes: CurriculumOutcome[] = [
  outcome({ id: "n6.1", code: "N6.1", description: "Extend and create patterns." }),
  outcome({ id: "n6.2", code: "N6.2", description: "Compare and order fractions." }),
  outcome({ id: "p6.1", code: "P6.1", description: "Identify patterns in tables of values." }),
  outcome({
    id: "sci6.1",
    code: "SCI6.1",
    description: "Investigate diversity of life.",
    subject: "Science",
  }),
];

describe("OutcomePicker", () => {
  it("renders every outcome by default", () => {
    render(<OutcomePicker emptyMessage="None" name="outcomeIds" outcomes={outcomes} />);

    expect(screen.getByText("N6.1")).toBeInTheDocument();
    expect(screen.getByText("N6.2")).toBeInTheDocument();
    expect(screen.getByText("P6.1")).toBeInTheDocument();
  });

  it("filters to outcomes whose code or description matches the search text", () => {
    render(<OutcomePicker emptyMessage="None" name="outcomeIds" outcomes={outcomes} />);

    fireEvent.change(screen.getByPlaceholderText("Search outcomes…"), {
      target: { value: "pattern" },
    });

    expect(screen.getByText("N6.1")).toBeInTheDocument();
    expect(screen.getByText("P6.1")).toBeInTheDocument();
    expect(screen.queryByText("N6.2")).not.toBeInTheDocument();
  });

  it("shows a no-match message when the search has no results", () => {
    render(<OutcomePicker emptyMessage="None" name="outcomeIds" outcomes={outcomes} />);

    fireEvent.change(screen.getByPlaceholderText("Search outcomes…"), {
      target: { value: "photosynthesis" },
    });

    expect(screen.getByText(/No outcomes match/)).toBeInTheDocument();
  });

  it("shows the emptyMessage when there are no outcomes to search at all", () => {
    render(
      <OutcomePicker
        emptyMessage="No outcomes for this class."
        name="outcomeIds"
        outcomes={[]}
      />,
    );

    expect(screen.getByText("No outcomes for this class.")).toBeInTheDocument();
  });

  it("pre-checks outcomes in selectedIds", () => {
    render(
      <OutcomePicker
        emptyMessage="None"
        name="outcomeIds"
        outcomes={outcomes}
        selectedIds={["n6.2"]}
      />,
    );

    const checkboxes = screen.getAllByRole("checkbox") as HTMLInputElement[];
    const checkedValues = checkboxes.filter((box) => box.checked).map((box) => box.value);
    expect(checkedValues).toEqual(["n6.2"]);
  });

  it("filters by subject too", () => {
    render(<OutcomePicker emptyMessage="None" name="outcomeIds" outcomes={outcomes} />);

    fireEvent.change(screen.getByPlaceholderText("Search outcomes…"), {
      target: { value: "science" },
    });

    expect(screen.getByText("SCI6.1")).toBeInTheDocument();
    expect(screen.queryByText("N6.1")).not.toBeInTheDocument();
  });

  it("renders no checkboxes when selectable is false", () => {
    render(<OutcomePicker emptyMessage="None" outcomes={outcomes} selectable={false} />);

    expect(screen.queryAllByRole("checkbox")).toHaveLength(0);
    expect(screen.getByText("N6.1")).toBeInTheDocument();
  });
});
