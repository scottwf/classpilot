import { describe, expect, it } from "vitest";
import { matchStudentName } from "./student-match";

const roster = [
  { id: "s-1", firstName: "Jayden", lastName: "Okafor", preferredName: "" },
  { id: "s-2", firstName: "Madison", lastName: "Chalifoux", preferredName: "Maddie" },
  { id: "s-3", firstName: "Jayden", lastName: "Fontaine", preferredName: "" },
];

describe("matchStudentName", () => {
  it("matches an unambiguous first name", () => {
    expect(matchStudentName("Madison", roster)).toBe("s-2");
  });

  it("matches a preferred name", () => {
    expect(matchStudentName("Maddie", roster)).toBe("s-2");
  });

  it("matches case-insensitively", () => {
    expect(matchStudentName("maddie", roster)).toBe("s-2");
  });

  it("matches a full 'first last' name", () => {
    expect(matchStudentName("Jayden Okafor", roster)).toBe("s-1");
  });

  it("returns null for an ambiguous first name shared by two students", () => {
    expect(matchStudentName("Jayden", roster)).toBeNull();
  });

  it("returns null for a name not on the roster", () => {
    expect(matchStudentName("Someone Else", roster)).toBeNull();
  });

  it("returns null for an empty guess", () => {
    expect(matchStudentName("", roster)).toBeNull();
    expect(matchStudentName("   ", roster)).toBeNull();
  });
});
