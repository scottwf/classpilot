import { describe, expect, it } from "vitest";
import {
  loadSaskatchewanGrade6Outcomes,
  outcomeIdFor,
  parseSaskatchewanOutcomeCsv,
} from "./sk-outcomes";

describe("Saskatchewan outcome importer", () => {
  it("parses multiline quoted outcome descriptions and strips HTML tags", () => {
    const outcomes = parseSaskatchewanOutcomeCsv({
      csv: `"Strand","Number",""
"Outcome","N6.1","Demonstrate understanding of place value including:<ul>
<li>greater than one million</li>
<li>less than one thousandth</li>
</ul>
with and without technology."`,
      grade: "6",
      subject: "Mathematics",
    });

    expect(outcomes).toEqual([
      {
        id: "sk-grade-6-mathematics-n6-1",
        code: "N6.1",
        description:
          "Demonstrate understanding of place value including: greater than one million; less than one thousandth; with and without technology.",
        grade: "6",
        strand: "N",
        subject: "Mathematics",
      },
    ]);
  });

  it("loads Grade 6 Saskatchewan outcomes across subject CSVs", () => {
    const outcomes = loadSaskatchewanGrade6Outcomes();

    expect(outcomes.length).toBeGreaterThan(80);
    expect(outcomes.map((outcome) => outcome.id)).toContain(
      outcomeIdFor("Mathematics", "N6.8"),
    );
    expect(outcomes.map((outcome) => outcome.id)).toContain(
      outcomeIdFor("English Language Arts", "CR6.1"),
    );
    expect(outcomes.map((outcome) => outcome.id)).toContain(
      outcomeIdFor("Science", "DL6.2"),
    );
  });
});
