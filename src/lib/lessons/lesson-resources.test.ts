import { describe, expect, it } from "vitest";
import { parseLessonResources } from "./lesson-resources";

describe("lesson resources", () => {
  it("parses links, images, plain URLs, and attachment notes", () => {
    expect(
      parseLessonResources(`
- [Video title](https://example.com/video)
- ![Image description](https://example.com/image.png)
- https://example.com/plain
- Local handout.pdf
`),
    ).toEqual([
      {
        href: "https://example.com/video",
        kind: "link",
        label: "Video title",
      },
      {
        href: "https://example.com/image.png",
        kind: "image",
        label: "Image description",
      },
      {
        href: "https://example.com/plain",
        kind: "link",
        label: "https://example.com/plain",
      },
      {
        kind: "attachment-note",
        label: "Local handout.pdf",
      },
    ]);
  });

  it("does not expose unsafe markdown hrefs", () => {
    expect(parseLessonResources("[Unsafe](javascript:alert(1))")).toEqual([
      {
        href: undefined,
        kind: "link",
        label: "Unsafe",
      },
    ]);
  });
});
