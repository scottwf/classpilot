import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ClassPilotPlanner } from "./ClassPilotPlanner";
import { LessonDetailPage } from "./LessonDetailPage";
import { LessonsPage } from "./LessonsPage";
import { plannerData } from "./seed-data";
import type { LessonSections } from "./types";
import { UnitDetailPage } from "./UnitDetailPage";
import { UnitsPage } from "./UnitsPage";

describe("ClassPilotPlanner", () => {
  it("renders the planner shell with classes, units, and today panel", () => {
    // Explicit date: a known day with a Math lesson in the seed data — this
    // test isn't exercising the default-date resolution logic (see
    // lesson-queries.test.ts for that), just needs a day with content.
    render(<ClassPilotPlanner data={plannerData} selectedDate="2026-09-11" />);

    expect(
      screen.getByRole("heading", { name: "ClassPilot" }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Grade 6 Math").length).toBeGreaterThan(0);
    expect(
      screen.getByRole("heading", { name: "Start with the lessons you need to teach." }),
    ).toBeInTheDocument();
    const primaryNav = within(screen.getByRole("navigation", { name: "Primary" }));
    expect(primaryNav.getByRole("link", { name: "Lessons" })).toHaveAttribute(
      "href",
      "/lessons",
    );
    expect(primaryNav.getByRole("link", { name: "Outcomes" })).toHaveAttribute(
      "href",
      "/outcomes",
    );
    expect(
      primaryNav.getByRole("link", { name: "Unit Timeline" }),
    ).toHaveAttribute("href", "/units");
    expect(screen.queryByRole("heading", { name: "All class lessons" })).not.toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Coverage by class" }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Today's schedule")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Add lesson" })).toHaveAttribute(
      "href",
      "/lessons/new?date=2026-09-11",
    );
  });

  it("renders the lessons page with client-side sort controls", () => {
    render(<LessonsPage data={plannerData} />);

    expect(screen.getByRole("heading", { name: "All class lessons" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Date" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Subject" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Unit" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Outcome" })).toBeInTheDocument();
  });

  it("renders a unit planning hub with lessons, actions, and outcome coverage", () => {
    const unit = plannerData.units.find((candidate) => candidate.id === "unit-ratios");

    if (!unit) {
      throw new Error("Expected seeded ratios unit");
    }

    render(
      <UnitDetailPage
        attachments={[]}
        createFileAttachmentAction={() => {}}
        createLinkAttachmentAction={() => {}}
        data={plannerData}
        deleteAttachmentAction={() => {}}
        rescheduleAction={() => {}}
        unit={unit}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Ratios, Rates, and Percent" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Grade 6 Math/)).toBeInTheDocument();
    expect(screen.getByText("2 lessons")).toBeInTheDocument();
    expect(screen.getByText("2 planned outcomes")).toBeInTheDocument();
    expect(screen.getByText("0 outcomes needing lessons")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Add lesson to unit" }),
    ).toHaveAttribute("href", "/lessons/new?unitId=unit-ratios");
    expect(
      screen.getByRole("link", { name: "Import Markdown lesson" }),
    ).toHaveAttribute("href", "/lessons/import?unitId=unit-ratios");
    expect(
      screen.getByRole("link", { name: "Edit unit details" }),
    ).toHaveAttribute("href", "/units/unit-ratios/edit");
    expect(
      screen.getByRole("link", { name: "Ratio Language in Real Life" }),
    ).toHaveAttribute("href", "/lessons/lesson-ratio-language");
  });

  it("opens units from the timeline into the planning hub", () => {
    render(<UnitsPage data={plannerData} />);

    expect(
      screen.getByRole("link", { name: /Ratios, Rates, and Percent/ }),
    ).toHaveAttribute("href", "/units/unit-ratios");
  });

  it("renders a lesson teaching view with structured sections and edit action", () => {
    const lesson = {
      ...plannerData.units[1].lessons[0],
      unitId: "unit-ratios",
      sections: {
        assessment: "Listen for correct part-to-whole language.",
        differentiation: "Use counters for students who need concrete models.",
        learningGoals: "I can describe ratio relationships in classroom examples.",
        lessonFlow: "Model examples, partner sort, independent reflection.",
        materials: "Counters, chart paper, notebooks.",
        mindsOn: "Where do we see comparisons in the classroom?",
        reflection: "Add a visual anchor chart before partner work.",
        resources: [
          "[Ratio video](https://example.com/ratio-video)",
          "Local handout.pdf",
        ].join("\n"),
      } satisfies LessonSections,
    };

    render(
      <LessonDetailPage
        attachments={[]}
        createFileAttachmentAction={() => {}}
        createLinkAttachmentAction={() => {}}
        data={plannerData}
        deleteAttachmentAction={() => {}}
        extendAction={() => {}}
        lesson={lesson}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Ratio Language in Real Life" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Ratios, Rates, and Percent")).toBeInTheDocument();
    expect(screen.getByText("Learning goals")).toBeInTheDocument();
    expect(
      screen.getByText("I can describe ratio relationships in classroom examples."),
    ).toBeInTheDocument();
    expect(screen.getByText("Materials")).toBeInTheDocument();
    expect(screen.getByText("Counters, chart paper, notebooks.")).toBeInTheDocument();
    expect(screen.getByText("Resources")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ratio video" })).toHaveAttribute(
      "href",
      "https://example.com/ratio-video",
    );
    expect(screen.getByText("Local handout.pdf")).toBeInTheDocument();
    expect(screen.getByText("Attachment note")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Edit lesson" })).toHaveAttribute(
      "href",
      "/lessons/lesson-ratio-language/edit",
    );
    expect(screen.getByRole("link", { name: "Back to unit" })).toHaveAttribute(
      "href",
      "/units/unit-ratios",
    );
  });
});
