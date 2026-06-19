import { describe, expect, it } from "vitest";
import { parseUnitOutlineDraft } from "./parse";
import { AiError } from "./types";

const validJson = JSON.stringify({
  title: "Electricity",
  bigIdeas: ["Energy can be transferred."],
  essentialQuestions: ["How does a circuit work?"],
  lessonSequence: [
    { title: "Static charge", focus: "Explore static electricity", outcomeCodes: ["SCI6.1"] },
    { title: "Build a circuit", focus: "Make a bulb light up", outcomeCodes: ["SCI6.2"] },
  ],
  assessmentIdeas: ["Circuit build challenge"],
  differentiationNotes: ["Provide pre-built circuit kits."],
});

describe("parseUnitOutlineDraft", () => {
  it("parses a clean JSON object", () => {
    const draft = parseUnitOutlineDraft(validJson);

    expect(draft.title).toBe("Electricity");
    expect(draft.lessonSequence).toHaveLength(2);
    expect(draft.lessonSequence[0].outcomeCodes).toEqual(["SCI6.1"]);
  });

  it("extracts JSON wrapped in markdown fences and prose", () => {
    const raw = "Here is your unit:\n```json\n" + validJson + "\n```\nHope it helps!";
    const draft = parseUnitOutlineDraft(raw);

    expect(draft.title).toBe("Electricity");
  });

  it("coerces missing fields to safe defaults", () => {
    const draft = parseUnitOutlineDraft('{"title": "Bare"}');

    expect(draft.title).toBe("Bare");
    expect(draft.bigIdeas).toEqual([]);
    expect(draft.lessonSequence).toEqual([]);
  });

  it("drops malformed lessons but keeps valid ones", () => {
    const draft = parseUnitOutlineDraft(
      JSON.stringify({
        lessonSequence: [
          { title: "Good", focus: "x" },
          "not an object",
          { outcomeCodes: ["A"] },
        ],
      }),
    );

    expect(draft.lessonSequence).toHaveLength(1);
    expect(draft.lessonSequence[0].title).toBe("Good");
  });

  it("throws AiError when there is no JSON object", () => {
    expect(() => parseUnitOutlineDraft("sorry, I cannot help")).toThrowError(
      AiError,
    );
  });

  it("throws AiError on invalid JSON", () => {
    expect(() => parseUnitOutlineDraft("{ title: unquoted }")).toThrowError(
      AiError,
    );
  });
});
