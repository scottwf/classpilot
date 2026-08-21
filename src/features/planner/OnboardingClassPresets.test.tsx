import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { OnboardingClassPresets } from "./OnboardingClassPresets";
import type { ClassSection } from "./types";

const gradeSubjects = [
  { grade: "6", subjects: ["Mathematics", "Science"] },
  { grade: "7", subjects: ["Career Education", "Mathematics"] },
];

function existingMathClass(): ClassSection {
  return {
    id: "math-6",
    schoolYearId: "year-1",
    name: "Custom math section",
    subject: "Mathematics",
    grade: "6",
    room: "",
    meetingPattern: "",
    cycleDays: [],
    color: "blue",
    isInstructional: true,
  };
}

describe("OnboardingClassPresets", () => {
  it("shows the first grade and marks matching classes as added", () => {
    render(
      <OnboardingClassPresets
        action={vi.fn()}
        existingClasses={[existingMathClass()]}
        gradeSubjects={gradeSubjects}
      />,
    );

    expect(screen.getByRole("checkbox", { name: /Math 6/ })).toBeDisabled();
    expect(screen.getByRole("checkbox", { name: "Science 6" })).toBeEnabled();
    expect(screen.queryByRole("checkbox", { name: "Math 7" })).not.toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Prep" })).toBeEnabled();
  });

  it("changes curriculum suggestions by grade while keeping schedule blocks visible", () => {
    render(
      <OnboardingClassPresets
        action={vi.fn()}
        existingClasses={[]}
        gradeSubjects={gradeSubjects}
      />,
    );

    fireEvent.change(
      screen.getByRole("combobox", {
        name: "Grade for curriculum class suggestions",
      }),
      { target: { value: "7" } },
    );

    expect(screen.getByRole("checkbox", { name: "Career Ed 7" })).toBeEnabled();
    expect(screen.getByRole("checkbox", { name: "Math 7" })).toBeEnabled();
    expect(screen.queryByRole("checkbox", { name: "Science 6" })).not.toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Prep" })).toBeEnabled();
  });

  it("enables the batch button for selections and clears hidden grade selections", () => {
    render(
      <OnboardingClassPresets
        action={vi.fn()}
        existingClasses={[]}
        gradeSubjects={gradeSubjects}
      />,
    );

    const button = screen.getByRole("button", {
      name: "Select classes to add",
    });
    expect(button).toBeDisabled();

    fireEvent.click(screen.getByRole("checkbox", { name: "Science 6" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Prep" }));
    expect(
      screen.getByRole("button", { name: "Add 2 classes" }),
    ).toBeEnabled();

    fireEvent.change(
      screen.getByRole("combobox", {
        name: "Grade for curriculum class suggestions",
      }),
      { target: { value: "7" } },
    );

    expect(screen.getByRole("checkbox", { name: "Prep" })).toBeChecked();
    expect(
      screen.getByRole("button", { name: "Add 1 class" }),
    ).toBeEnabled();
  });
});
