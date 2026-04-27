import { describe, it, expect, vi } from "vitest";

vi.mock("../storyPointsDetector.js", () => ({ getDetectedSpFieldId: () => null }));
vi.mock("../jiraConfig.js", () => ({
  FIELD_TL_COMMENT: "cf_tl", FIELD_REVIEW_RATING: "cf_rr",
  FIELD_ARTIFACTS: "cf_art", SP_CANDIDATES: ["customfield_10016"],
  FIELD_STORY_POINTS_ENV: null, FIELD_TEAM: "cf_team",
}));

const { mapIssue } = await import("../mapIssue.js");

describe("mapIssue", () => {
  const raw = {
    key: "TEST-1", id: "10001",
    fields: {
      summary: "Fix bug", status: { name: "Done" },
      assignee: { displayName: "Alice", avatarUrls: { "48x48": "https://img" }, emailAddress: "a@b.com" },
      priority: { name: "High" }, issuetype: { name: "Story", iconUrl: "https://icon" },
      reporter: { displayName: "Bob" }, labels: ["urgent"], components: [{ name: "API" }],
      customfield_10020: [{ startDate: "2024-01-01", endDate: "2024-01-14", name: "Sprint 1" }],
      customfield_10016: 5, created: "2024-01-01T00:00:00Z", updated: "2024-01-10T00:00:00Z",
      cf_tl: "Looks good", cf_rr: "4", cf_art: "artifact data",
    },
  };

  it("maps key fields correctly", () => {
    const t = mapIssue(raw);
    expect(t.id).toBe("TEST-1");
    expect(t.description).toBe("Fix bug");
    expect(t.status).toBe("Done");
    expect(t.sp).toBe(5);
    expect(t.assigneeName).toBe("Alice");
    expect(t.labels).toEqual(["urgent"]);
    expect(t.components).toEqual(["API"]);
    expect(t.reviewRating).toBe(4);
  });

  it("handles minimal fields", () => {
    const t = mapIssue({ key: "X-1", id: "1", fields: {} });
    expect(t.id).toBe("X-1");
    expect(t.assigneeName).toBe("Unassigned");
    expect(t.sp).toBeNull();
    expect(t.labels).toEqual([]);
  });
});
