import { describe, expect, it } from "vitest";
import { parseDictationDraftsRaw, parseLessonSectionsDraft, parseUnitOutlineDraft } from "./parse";
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

const validLessonSectionsJson = JSON.stringify({
  learningGoals: "I can compare percents.",
  materials: "Flyers, calculators.",
  mindsOn: "Show two flyer deals and ask which is better.",
  lessonFlow: "1. Compare deals.\n2. Practice.",
  assessment: "Exit ticket.",
  differentiation: "Provide a percent chart.",
  resources: "https://example.com/percent-video",
  reflection: "",
});

describe("parseLessonSectionsDraft", () => {
  it("parses a clean JSON object into all eight section fields", () => {
    const sections = parseLessonSectionsDraft(validLessonSectionsJson);

    expect(sections).toEqual({
      learningGoals: "I can compare percents.",
      materials: "Flyers, calculators.",
      mindsOn: "Show two flyer deals and ask which is better.",
      lessonFlow: "1. Compare deals.\n2. Practice.",
      assessment: "Exit ticket.",
      differentiation: "Provide a percent chart.",
      resources: "https://example.com/percent-video",
      reflection: "",
    });
  });

  it("extracts JSON wrapped in markdown fences and prose", () => {
    const raw = "Sure, here it is:\n```json\n" + validLessonSectionsJson + "\n```";
    const sections = parseLessonSectionsDraft(raw);

    expect(sections.learningGoals).toBe("I can compare percents.");
  });

  it("coerces missing fields to empty strings rather than failing", () => {
    const sections = parseLessonSectionsDraft('{"learningGoals": "Only this one"}');

    expect(sections.learningGoals).toBe("Only this one");
    expect(sections.materials).toBe("");
    expect(sections.reflection).toBe("");
  });

  it("throws AiError when there is no JSON object", () => {
    expect(() => parseLessonSectionsDraft("sorry, I cannot help")).toThrowError(
      AiError,
    );
  });

  it("throws AiError on invalid JSON", () => {
    expect(() => parseLessonSectionsDraft("{ learningGoals: unquoted }")).toThrowError(
      AiError,
    );
  });
});

describe("parseDictationDraftsRaw", () => {
  const validJson = JSON.stringify([
    {
      studentName: "Jayden",
      category: "academic",
      subject: "Group project",
      body: "Struggled to get started but finished strong after a check-in.",
    },
    {
      studentName: "Madison",
      category: "social_emotional",
      subject: "",
      body: "Seemed down at recess, followed up one-on-one.",
    },
  ]);

  it("parses a clean JSON array", () => {
    const drafts = parseDictationDraftsRaw(validJson);

    expect(drafts).toHaveLength(2);
    expect(drafts[0]).toEqual({
      studentName: "Jayden",
      category: "academic",
      subject: "Group project",
      body: "Struggled to get started but finished strong after a check-in.",
    });
  });

  it("extracts a JSON array wrapped in markdown fences and prose", () => {
    const raw = "Here are the notes:\n```json\n" + validJson + "\n```\nLet me know!";
    expect(parseDictationDraftsRaw(raw)).toHaveLength(2);
  });

  it("returns an empty array for an empty JSON array", () => {
    expect(parseDictationDraftsRaw("[]")).toEqual([]);
  });

  it("drops entries with no student name or no body", () => {
    const raw = JSON.stringify([
      { studentName: "", category: "other", subject: "", body: "No name given." },
      { studentName: "Jayden", category: "other", subject: "", body: "" },
      { studentName: "Madison", category: "other", subject: "", body: "Real entry." },
    ]);

    const drafts = parseDictationDraftsRaw(raw);
    expect(drafts).toHaveLength(1);
    expect(drafts[0].studentName).toBe("Madison");
  });

  it("falls back to 'other' for an unrecognized category", () => {
    const raw = JSON.stringify([
      { studentName: "Jayden", category: "not_a_real_category", subject: "", body: "Note." },
    ]);

    expect(parseDictationDraftsRaw(raw)[0].category).toBe("other");
  });

  it("throws AiError when no JSON array can be found", () => {
    expect(() => parseDictationDraftsRaw("Sorry, I can't help with that.")).toThrowError(
      AiError,
    );
  });

  it("throws AiError on invalid JSON", () => {
    expect(() => parseDictationDraftsRaw("[ studentName: unquoted ]")).toThrowError(AiError);
  });
});
