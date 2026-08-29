import { describe, expect, it } from "vitest";
import { parseAssistantMessage } from "./format-message";

describe("parseAssistantMessage", () => {
  it("parses a plain paragraph with no formatting", () => {
    expect(parseAssistantMessage("Here are your students.")).toEqual([
      { type: "paragraph", segments: [{ bold: false, text: "Here are your students." }] },
    ]);
  });

  it("parses bold segments within a paragraph", () => {
    expect(parseAssistantMessage("**Hannah Kasel** is in Grade 6.")).toEqual([
      {
        type: "paragraph",
        segments: [
          { bold: true, text: "Hannah Kasel" },
          { bold: false, text: " is in Grade 6." },
        ],
      },
    ]);
  });

  it("parses a bulleted list of bold names", () => {
    const content = "- **Avery Nguyen**\n- **Jamie Rivera**\n- **Hannah Kasel**";

    expect(parseAssistantMessage(content)).toEqual([
      {
        type: "list",
        ordered: false,
        items: [
          [{ bold: true, text: "Avery Nguyen" }],
          [{ bold: true, text: "Jamie Rivera" }],
          [{ bold: true, text: "Hannah Kasel" }],
        ],
      },
    ]);
  });

  it("parses a numbered list distinctly from a bulleted one", () => {
    const content = "1. First step\n2. Second step";

    expect(parseAssistantMessage(content)).toEqual([
      {
        type: "list",
        ordered: true,
        items: [
          [{ bold: false, text: "First step" }],
          [{ bold: false, text: "Second step" }],
        ],
      },
    ]);
  });

  it("keeps paragraphs and lists as separate blocks in order", () => {
    const content = "Here's the roster:\n\n- **Avery Nguyen**\n- **Jamie Rivera**\n\nLet me know if you need more.";

    const blocks = parseAssistantMessage(content);

    expect(blocks.map((block) => block.type)).toEqual(["paragraph", "list", "paragraph"]);
  });

  it("treats both - and * as bullets", () => {
    const content = "* Item one\n* Item two";

    expect(parseAssistantMessage(content)).toEqual([
      {
        type: "list",
        ordered: false,
        items: [
          [{ bold: false, text: "Item one" }],
          [{ bold: false, text: "Item two" }],
        ],
      },
    ]);
  });
});
