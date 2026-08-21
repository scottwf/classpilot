import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CurriculumLibrary } from "./CurriculumLibrary";
import type { ClassSection, CurriculumOutcome } from "./types";

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
  outcome({ id: "n6.1", code: "N6.1", description: "Extend and create patterns.", subject: "Mathematics" }),
  outcome({ id: "n6.2", code: "N6.2", description: "Compare and order fractions.", subject: "Mathematics" }),
  outcome({
    id: "sci6.1",
    code: "SCI6.1",
    description: "Investigate diversity of life.",
    subject: "Science",
  }),
];

describe("CurriculumLibrary", () => {
  it("shows every outcome's full description with no checkboxes", () => {
    render(<CurriculumLibrary classes={[]} outcomes={outcomes} />);

    expect(screen.getByText(/Extend and create patterns\./)).toBeInTheDocument();
    expect(screen.getByText(/Investigate diversity of life\./)).toBeInTheDocument();
    expect(screen.queryAllByRole("checkbox")).toHaveLength(0);
  });

  it("filters to one subject when its tile is clicked, and clears on a second click", () => {
    render(<CurriculumLibrary classes={[]} outcomes={outcomes} />);

    fireEvent.click(screen.getByRole("button", { name: /Science/ }));
    expect(screen.getByText("SCI6.1")).toBeInTheDocument();
    expect(screen.queryByText("N6.1")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Science/ }));
    expect(screen.getByText("N6.1")).toBeInTheDocument();
  });

  it("shows a subject's class color dot when a matching instructional class exists", () => {
    const classes: ClassSection[] = [
      {
        id: "class-1",
        schoolYearId: "current",
        name: "Grade 6 Science",
        subject: "Science",
        grade: "6",
        room: "",
        meetingPattern: "",
        cycleDays: [],
        color: "violet",
        isInstructional: true,
      },
    ];

    render(<CurriculumLibrary classes={classes} outcomes={outcomes} />);

    const scienceTile = screen.getByRole("button", { name: /Science/ });
    expect(scienceTile.querySelector(".bg-violet-500")).not.toBeNull();
  });
});
