import { describe, expect, it } from "vitest";
import { generateStoredName, isAllowedAttachmentFile } from "./attachment-storage";

describe("attachment storage", () => {
  it("allows document, slide, spreadsheet, markdown, image, and video extensions", () => {
    expect(isAllowedAttachmentFile("handout.pdf")).toBe(true);
    expect(isAllowedAttachmentFile("slides.PPTX")).toBe(true);
    expect(isAllowedAttachmentFile("notes.md")).toBe(true);
    expect(isAllowedAttachmentFile("clip.mp4")).toBe(true);
    expect(isAllowedAttachmentFile("photo.JPG")).toBe(true);
  });

  it("rejects extensions outside the allow-list", () => {
    expect(isAllowedAttachmentFile("script.exe")).toBe(false);
    expect(isAllowedAttachmentFile("archive.zip")).toBe(false);
    expect(isAllowedAttachmentFile("noextension")).toBe(false);
  });

  it("generates a stored filename that preserves the extension but not the original name", () => {
    const storedName = generateStoredName("My Super Secret Plan.pdf");

    expect(storedName).not.toContain("My Super Secret Plan");
    expect(storedName.toLowerCase().endsWith(".pdf")).toBe(true);
    expect(generateStoredName("a.pdf")).not.toBe(generateStoredName("a.pdf"));
  });
});
