import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildConfluenceTable, buildConfluencePage, buildConfluencePersonReport } from "../confluencePageBuilder.js";
import * as jiraService from "../../jira/fetchPullRequests.js";

vi.mock("../../jira/fetchPullRequests.js");

beforeEach(() => {
  vi.clearAllMocks();
  jiraService.fetchPullRequests.mockResolvedValue([]);
});

const mockTickets = [
  {
    id: "PROJ-1",
    description: "Build login form",
    assigneeName: "John Doe",
    status: "In Progress",
    sp: 5,
    timeSpent: "4h",
    priority: "High",
    issueType: "Story",
    sprintName: "Sprint 49",
    startDate: "2026-04-01",
    endDate: "2026-04-15",
    created: "2026-03-20",
    reporter: "Jane Smith",
    labels: ["frontend", "auth"],
    components: ["UI", "Backend"],
    jiraUrl: "https://ancagroup.atlassian.net/browse/PROJ-1",
    tlComment: "Looks good, approved",
    reviewRating: 5,
  },
  {
    id: "PROJ-2",
    description: "Fix bug in API",
    assigneeName: "Bob Johnson",
    status: "Done",
    sp: 3,
    timeSpent: "2h",
    priority: "Medium",
    issueType: "Bug",
    sprintName: "Sprint 49",
    startDate: "2026-04-01",
    endDate: "2026-04-15",
    created: "2026-03-25",
    reporter: "Jane Smith",
    labels: ["backend"],
    components: ["API"],
    jiraUrl: "https://ancagroup.atlassian.net/browse/PROJ-2",
    tlComment: "Needs revision",
    reviewRating: 3,
  },
  {
    id: "PROJ-3",
    description: "Review code",
    assigneeName: "John Doe",
    status: "Done",
    sp: 2,
    timeSpent: "1h",
    priority: "Low",
    issueType: "Task",
    sprintName: "Sprint 49",
    startDate: "2026-04-01",
    endDate: "2026-04-15",
    created: "2026-03-22",
    reporter: "Jane Smith",
    labels: ["qa"],
    components: ["Testing"],
    jiraUrl: "https://ancagroup.atlassian.net/browse/PROJ-3",
    tlComment: "Perfect",
    reviewRating: 5,
  },
];

describe("confluencePageBuilder", () => {
  describe("buildConfluencePersonReport", () => {
    it("should return HTML with sprint summary", async () => {
      const html = await buildConfluencePersonReport(mockTickets, "Sprint 49");
      expect(html).toContain("<h2>Sprint: Sprint 49 - Report</h2>");
      expect(html).toContain("Total Tickets:");
      expect(html).toContain("Done:");
      expect(html).toContain("Story Points:");
      expect(html).toContain("Team Members:");
    });

    it("should group tickets by assignee", async () => {
      const html = await buildConfluencePersonReport(mockTickets, "Sprint 49");
      expect(html).toContain("<h3>Bob Johnson</h3>");
      expect(html).toContain("<h3>John Doe</h3>");
    });

    it("should calculate per-person metrics", async () => {
      const html = await buildConfluencePersonReport(mockTickets, "Sprint 49");
      // John Doe: 2 tickets (1 In Progress, 1 Done)
      expect(html).toContain("<strong>Assigned:</strong> 2");
      // Bob Johnson: 1 ticket (1 Done)
      expect(html).toContain("<strong>Done:</strong> 1/1 (100%)");
    });

    it("should include person-specific tables with condensed columns", async () => {
      const html = await buildConfluencePersonReport(mockTickets, "Sprint 49");
      expect(html).toContain("<strong>Ticket</strong>");
      expect(html).toContain("<strong>Summary</strong>");
      expect(html).toContain("<strong>Story Points</strong>");
      expect(html).toContain("<strong>Priority<br/>Type</strong>");
      // Should NOT include these columns separately
      expect(html).not.toContain("<strong>Status</strong>");
      expect(html).not.toContain("<strong>Jira URL</strong>");
    });

    it("should handle tickets with unassigned people", async () => {
      const ticketsWithUnassigned = [
        ...mockTickets,
        { ...mockTickets[0], assigneeName: null, id: "PROJ-4" },
      ];
      const html = await buildConfluencePersonReport(ticketsWithUnassigned, "Sprint 49");
      expect(html).toContain("<h3>Unassigned</h3>");
    });

    it("should sort assignees alphabetically", async () => {
      const html = await buildConfluencePersonReport(mockTickets, "Sprint 49");
      const bobIndex = html.indexOf("<h3>Bob Johnson</h3>");
      const johnIndex = html.indexOf("<h3>John Doe</h3>");
      expect(bobIndex).toBeLessThan(johnIndex);
    });

    it("should calculate correct story point totals per person", async () => {
      const html = await buildConfluencePersonReport(mockTickets, "Sprint 49");
      // John Doe: 5 (in progress) + 2 (done) = 7 total, 2 done
      expect(html).toContain("<strong>Story Points:</strong> 2/7");
      // Bob Johnson: 3 total, 3 done
      expect(html).toContain("<strong>Story Points:</strong> 3/3");
    });
  });

  describe("buildConfluenceTable", () => {
    it("should return HTML table with correct structure", () => {
      const html = buildConfluenceTable(mockTickets, "Sprint 49");
      expect(html).toContain('style="width: 100%; border-collapse: collapse;"');
      expect(html).toContain("<tbody>");
      expect(html).toContain("</tbody></table>");
    });

    it("should include all 18 column headers", () => {
      const html = buildConfluenceTable(mockTickets, "Sprint 49");
      const headers = [
        "Ticket ID", "Summary", "Assignee", "Status", "Story Points", "Time Spent",
        "Priority", "Type", "Sprint",
        "Start Date", "End Date", "Created",
        "Reporter", "Labels", "Components",
        "Jira URL", "TL Comment", "Review Rating",
      ];
      headers.forEach(h => {
        expect(html).toContain(`<strong>${h}</strong>`);
      });
    });

    it("should escape HTML special characters", () => {
      const ticketsWithSpecialChars = [
        {
          ...mockTickets[0],
          description: "Test <script>alert('xss')</script>",
        },
      ];
      const html = buildConfluenceTable(ticketsWithSpecialChars, "Sprint 49");
      expect(html).not.toContain("<script>");
      expect(html).toContain("&lt;script&gt;");
    });

    it("should linkify Jira URLs", () => {
      const html = buildConfluenceTable(mockTickets, "Sprint 49");
      expect(html).toContain(`<a href="https://ancagroup.atlassian.net/browse/PROJ-1"`);
    });
  });

  describe("buildConfluencePage", () => {
    it("should call buildConfluencePersonReport (default strategy)", async () => {
      const html = await buildConfluencePage(mockTickets, "Sprint 49");
      expect(html).toContain("Sprint: Sprint 49 - Report");
      expect(html).toContain("<h3>Bob Johnson</h3>");
      expect(html).toContain("<h3>John Doe</h3>");
    });

    it("should handle empty ticket list", async () => {
      const html = await buildConfluencePage([], "Sprint 49");
      expect(html).toContain("<h2>Sprint: Sprint 49 - Report</h2>");
      expect(html).toContain("Total Tickets:");
    });
  });
});
