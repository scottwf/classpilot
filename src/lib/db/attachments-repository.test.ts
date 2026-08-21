// @vitest-environment node
//
// Vitest's default environment (jsdom, set globally in vitest.config.ts) is a
// browser-like sandbox that can't bundle the Node-only `node:sqlite` module
// this file (transitively) imports. Force the real Node environment here.
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { plannerData } from "@/src/features/planner/seed-data";
import { seedPlannerData } from "./planner-repository";
import {
  createFileAttachment,
  createLinkAttachment,
  deleteAttachment,
  getAttachmentFileInfo,
  listAttachments,
} from "./attachments-repository";
import { createClassPilotDatabase } from "./sqlite";
import { createUser } from "./users-repository";

function temporaryDatabasePath() {
  return join(mkdtempSync(join(tmpdir(), "classpilot-test-")), "test.sqlite");
}

describe("attachments repository", () => {
  it("adds a link attachment to a unit and lists it back", () => {
    const db = createClassPilotDatabase(temporaryDatabasePath());
    const userId = createUser(db, { username: "teacher", password: "x" }).id;
    seedPlannerData(db, userId, plannerData);

    createLinkAttachment(db, userId, { unitId: "unit-reading-identity" }, {
      label: "Unit rubric",
      url: "https://example.com/rubric",
    });

    const attachments = listAttachments(db, userId, { unitId: "unit-reading-identity" });

    expect(attachments).toEqual([
      {
        id: expect.any(String),
        kind: "link",
        label: "Unit rubric",
        url: "https://example.com/rubric",
        fileName: "",
        mimeType: "",
        sizeBytes: 0,
        createdAt: expect.any(String),
      },
    ]);
  });

  it("adds a file attachment to a lesson, separately from unit attachments", () => {
    const db = createClassPilotDatabase(temporaryDatabasePath());
    const userId = createUser(db, { username: "teacher", password: "x" }).id;
    seedPlannerData(db, userId, plannerData);

    createFileAttachment(db, userId, { lessonId: "lesson-reading-inventory" }, {
      label: "Handout",
      fileName: "handout.pdf",
      storedName: "abc123.pdf",
      mimeType: "application/pdf",
      sizeBytes: 4096,
    });

    const lessonAttachments = listAttachments(db, userId, { lessonId: "lesson-reading-inventory" });
    const unitAttachments = listAttachments(db, userId, { unitId: "unit-reading-identity" });

    expect(lessonAttachments).toHaveLength(1);
    expect(lessonAttachments[0]).toMatchObject({
      kind: "file",
      label: "Handout",
      fileName: "handout.pdf",
      mimeType: "application/pdf",
      sizeBytes: 4096,
    });
    expect(unitAttachments).toHaveLength(0);
  });

  it("resolves file info for the download route without exposing it on the public list", () => {
    const db = createClassPilotDatabase(temporaryDatabasePath());
    const userId = createUser(db, { username: "teacher", password: "x" }).id;
    seedPlannerData(db, userId, plannerData);

    createFileAttachment(db, userId, { lessonId: "lesson-reading-inventory" }, {
      label: "Slides",
      fileName: "slides.pptx",
      storedName: "def456.pptx",
      mimeType: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      sizeBytes: 10_000,
    });

    const [attachment] = listAttachments(db, userId, { lessonId: "lesson-reading-inventory" });
    const info = getAttachmentFileInfo(db, attachment!.id);

    expect(info).toEqual({
      fileName: "slides.pptx",
      storedName: "def456.pptx",
      mimeType: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    });
    expect(attachment).not.toHaveProperty("storedName");
  });

  it("deletes an attachment and returns its stored filename for cleanup", () => {
    const db = createClassPilotDatabase(temporaryDatabasePath());
    const userId = createUser(db, { username: "teacher", password: "x" }).id;
    seedPlannerData(db, userId, plannerData);

    const fileId = createFileAttachment(db, userId, { unitId: "unit-reading-identity" }, {
      label: "Rubric PDF",
      fileName: "rubric.pdf",
      storedName: "ghi789.pdf",
      mimeType: "application/pdf",
      sizeBytes: 2048,
    });
    const linkId = createLinkAttachment(db, userId, { unitId: "unit-reading-identity" }, {
      label: "External resource",
      url: "https://example.com",
    });

    expect(deleteAttachment(db, userId, fileId)).toBe("ghi789.pdf");
    expect(deleteAttachment(db, userId, linkId)).toBeUndefined();
    expect(listAttachments(db, userId, { unitId: "unit-reading-identity" })).toHaveLength(0);
  });

  it("cascades attachment deletion when the owning unit or lesson is deleted", () => {
    const db = createClassPilotDatabase(temporaryDatabasePath());
    const userId = createUser(db, { username: "teacher", password: "x" }).id;
    seedPlannerData(db, userId, plannerData);

    createLinkAttachment(db, userId, { unitId: "unit-reading-identity" }, {
      label: "Doomed link",
      url: "https://example.com",
    });

    db.prepare("DELETE FROM unit_plans WHERE id = ?").run("unit-reading-identity");

    expect(listAttachments(db, userId, { unitId: "unit-reading-identity" })).toHaveLength(0);
  });
});
