import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DailyPlanner } from "./DailyPlanner";

describe("DailyPlanner day note", () => {
  it("resets the note textarea when the date changes, discarding unsaved text", () => {
    const { rerender } = render(
      <DailyPlanner
        date="2026-09-08"
        dayNotes={{ "2026-09-08": "Saved note for the 8th" }}
        days={[{ date: "2026-09-08", entries: [] }]}
        otherLessons={[]}
        saveDayNoteAction={vi.fn()}
        schoolYearId="current"
        view="day"
      />,
    );

    const textarea = screen.getByLabelText(/note for this day/i) as HTMLTextAreaElement;
    expect(textarea.value).toBe("Saved note for the 8th");

    // Type unsaved text, then simulate navigating to a different day
    // without saving -- this is exactly the bug: an uncontrolled
    // textarea's defaultValue doesn't re-apply on a prop change unless
    // the component remounts (key={date} on DayNoteForm is what forces
    // that remount).
    fireEvent.change(textarea, { target: { value: "Unsaved text for the 8th" } });
    expect(textarea.value).toBe("Unsaved text for the 8th");

    rerender(
      <DailyPlanner
        date="2026-09-09"
        dayNotes={{ "2026-09-08": "Saved note for the 8th" }}
        days={[{ date: "2026-09-09", entries: [] }]}
        otherLessons={[]}
        saveDayNoteAction={vi.fn()}
        schoolYearId="current"
        view="day"
      />,
    );

    const nextTextarea = screen.getByLabelText(/note for this day/i) as HTMLTextAreaElement;
    expect(nextTextarea.value).toBe("");
  });
});
