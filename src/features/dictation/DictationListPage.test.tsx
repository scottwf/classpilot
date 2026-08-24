import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { RosterEntry } from "@/src/features/students/types";
import { DictationListPage } from "./DictationListPage";
import type { DictationRecording } from "./types";

const action = vi.fn();
const student: RosterEntry = {
  id: "student-1", schoolYearId: "year", firstName: "Jayden", lastName: "Lee", preferredName: "",
  pronouns: "", birthdate: "", studentNumber: "", strengths: "", interests: "", status: "active",
  createdAt: "", updatedAt: "", openReminderCount: 0, openFollowUpCount: 0,
};

function recording(id: string, archivedAt: string | null): DictationRecording {
  return {
    id, schoolYearId: "year", storedFilename: "", originalFilename: `${id}.m4a`, recordedDate: "2026-09-08",
    durationSeconds: 61, transcript: "Jayden completed the group project.", status: "transcribed", drafts: [],
    studentIds: [student.id], archivedAt, createdAt: "2026-09-08T12:00:00.000Z", updatedAt: "",
  };
}

describe("DictationListPage", () => {
  it("shows active-recording metadata, filters by student, and switches to archived recordings", () => {
    render(<DictationListPage archiveAction={action} deleteAction={action} recordings={[recording("active", null), recording("archived", "2026-09-09T00:00:00.000Z")]} students={[student]} submitTextAction={action} uploadAction={action} />);

    expect(screen.getByText("active.m4a")).toBeInTheDocument();
    expect(screen.getByText(/1:01.*5 words/)).toBeInTheDocument();
    expect(screen.getAllByText("Jayden Lee")).toHaveLength(2);
    expect(screen.queryByText("archived.m4a")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Filter by student"), { target: { value: "student-1" } });
    expect(screen.getByText("active.m4a")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Show archived" }));
    expect(screen.getByText("archived.m4a")).toBeInTheDocument();
    expect(screen.queryByText("active.m4a")).not.toBeInTheDocument();
  });
});
