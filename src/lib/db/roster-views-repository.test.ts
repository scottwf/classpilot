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
  createRosterView,
  deleteRosterView,
  listRosterViews,
} from "./roster-views-repository";
import { createClassPilotDatabase } from "./sqlite";
import { createUser } from "./users-repository";

function freshDatabase() {
  const db = createClassPilotDatabase(
    join(mkdtempSync(join(tmpdir(), "classpilot-roster-views-")), "test.sqlite"),
  );
  const userId = createUser(db, { username: "teacher", password: "x" }).id;
  seedPlannerData(db, userId, plannerData);
  return { db, userId };
}

describe("roster views repository", () => {
  it("creates and lists saved views with their column sets", () => {
    const { db, userId } = freshDatabase();

    createRosterView(db, userId, {
      schoolYearId: "current",
      name: "Textbook check",
      columns: ["status", "field:abc123"],
    });

    const views = listRosterViews(db, userId, "current");

    expect(views).toHaveLength(1);
    expect(views[0].name).toBe("Textbook check");
    expect(views[0].columns).toEqual(["status", "field:abc123"]);
  });

  it("rejects a blank view name", () => {
    const { db, userId } = freshDatabase();

    expect(() =>
      createRosterView(db, userId, { schoolYearId: "current", name: "  ", columns: [] }),
    ).toThrow("View name can't be empty.");
  });

  it("deletes a saved view", () => {
    const { db, userId } = freshDatabase();
    const viewId = createRosterView(db, userId, {
      schoolYearId: "current",
      name: "Textbook check",
      columns: ["status"],
    });

    deleteRosterView(db, userId, viewId);

    expect(listRosterViews(db, userId, "current")).toHaveLength(0);
  });

  it("rejects deleting a view owned by another user (IDOR check)", () => {
    const { db, userId } = freshDatabase();
    const otherUserId = createUser(db, { username: "other", password: "x" }).id;
    const viewId = createRosterView(db, userId, {
      schoolYearId: "current",
      name: "Textbook check",
      columns: ["status"],
    });

    expect(() => deleteRosterView(db, otherUserId, viewId)).toThrow("Roster view not found");
  });
});
