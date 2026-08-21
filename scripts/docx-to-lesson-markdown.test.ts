import { describe, expect, it } from "vitest";
import { buildMeetingDates, convertDocumentHtml } from "./docx-to-lesson-markdown";
import { parseLessonMarkdown } from "@/src/lib/lessons/markdown-import";

const documentHtml = `<p><strong>Lesson 1  Living or Non-living?</strong></p>
<p><strong>Outcomes: </strong>DL6.1<strong> · Duration: </strong>50 minutes<strong> · Unit: </strong>Source unit</p>
<p><strong>Learning Objectives</strong></p><p>Sort objects using evidence.</p><p><strong>Materials</strong></p><ul><li>Object cards</li></ul>
<p><strong>Hook (5 min)</strong></p><p>Show a seed and a rock.</p><p><strong>Direct Instruction / Exploration (15 min)</strong></p><p>Introduce the characteristics of life.</p><p><strong>Guided Practice (10 min)</strong></p><ol><li>Sort objects together.</li></ol><p><strong>Independent / Group Activity (15 min)</strong></p><p>Pairs justify their sorting.</p><p><strong>Closure &amp; Assessment (5 min)</strong></p><p>Collect an exit ticket.</p><p><strong>Differentiation</strong></p><p>Provide picture supports.</p><p><strong>Treaty Education Connection</strong></p><p>Respect relationships with land and water.</p><p><strong>Cross-Curricular Connections</strong></p><p>ELA discussion skills.</p><p><strong>Teacher Notes</strong></p><p>Keep the object cards for next year.</p><p>Teacher Reflection (fill in after teaching): ___</p><p><strong>Class Progress Notes</strong></p><p>This must not be included.</p>
<p><strong>Lesson 2  Local Diversity</strong></p><p><strong>Outcomes: </strong>DL6.2<strong> · Duration: </strong>45 minutes<strong> · Unit: </strong>Source unit</p><p><strong>Learning Objectives</strong></p><p>Observe local organisms.</p><p><strong>Materials</strong></p><ul><li>Notebook</li></ul><p><strong>Hook</strong></p><p>Look outside.</p><p><strong>Direct Instruction / Exploration</strong></p><p>Model an observation.</p><p><strong>Guided Practice</strong></p><p>Practice one observation.</p><p><strong>Independent / Group Activity</strong></p><p>Complete a nature walk.</p><p><strong>Closure &amp; Assessment</strong></p><p>Share one observation.</p><p><strong>Differentiation</strong></p><p>Offer a partner scribe.</p><p><strong>Treaty Education Connection</strong></p><p>Learn from local knowledge.</p><p><strong>Cross-Curricular Connections</strong></p><p>Sketch organisms.</p><p><strong>Teacher Notes</strong></p><p>Bring clipboards.</p><p>Teacher Reflection (fill in after teaching): ___</p>`;

describe("DOCX lesson Markdown converter", () => {
  it("maps the source sections into Markdown accepted by the existing importer", () => {
    const converted = convertDocumentHtml(documentHtml, "Diversity of Living Things", ["2026-09-08", "2026-09-10"]);
    expect(converted).toHaveLength(2);
    expect(converted[0].fileName).toBe("lesson-01-living-or-non-living.md");
    expect(converted[0].warnings).toEqual([]);
    const lesson = parseLessonMarkdown(converted[0].markdown);
    expect(lesson).toMatchObject({ date: "2026-09-08", durationMinutes: 50, outcomeRefs: ["DL6.1"], status: "planned", title: "Living or Non-living?", unitRef: "Diversity of Living Things" });
    expect(lesson.sections).toMatchObject({ assessment: "Collect an exit ticket.", differentiation: "Provide picture supports.", learningGoals: "Sort objects using evidence.", materials: "- Object cards", mindsOn: "Show a seed and a rock.", reflection: "___" });
    expect(lesson.sections.lessonFlow).toContain("**Direct Instruction / Exploration**");
    expect(lesson.sections.lessonFlow).toContain("- Sort objects together.");
    expect(lesson.sections.resources).toContain("**Treaty Education Connection**");
    expect(lesson.sections.resources).toContain("**Cross-Curricular Connections**");
    expect(lesson.sections.resources).toContain("**Teacher Notes**");
    expect(converted[0].markdown).not.toContain("This must not be included.");
  });
  it("builds dates on selected recurring meeting weekdays", () => {
    expect(buildMeetingDates(4, "2026-09-08", [1, 3])).toEqual(["2026-09-09", "2026-09-14", "2026-09-16", "2026-09-21"]);
  });
});
