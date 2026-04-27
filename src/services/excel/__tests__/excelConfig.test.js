import { describe, it, expect } from "vitest";
import { EXCEL_HEADERS, EXCEL_COL_WIDTHS, NUM_COLS, ticketToRow } from "../excelConfig.js";

describe("constants", () => {
  it("EXCEL_HEADERS has NUM_COLS entries", () => {
    expect(EXCEL_HEADERS).toHaveLength(NUM_COLS);
  });
  it("EXCEL_COL_WIDTHS has NUM_COLS entries", () => {
    expect(EXCEL_COL_WIDTHS).toHaveLength(NUM_COLS);
  });
  it("NUM_COLS is 18", () => expect(NUM_COLS).toBe(18));
});

describe("ticketToRow", () => {
  it("returns array with NUM_COLS elements", () => {
    const ticket = {
      id: "T-1", description: "test", assigneeName: "Alice", status: "Done",
      sp: 3, timeSpent: "2h", priority: "High", issueType: "Bug",
      sprintName: "S1", startDate: "2024-01-01", endDate: "2024-01-14",
      created: "2024-01-01", reporter: "Bob", labels: ["a"], components: ["C"],
      jiraUrl: "https://jira/T-1", tlComment: "Good", reviewRating: 5,
    };
    const row = ticketToRow(ticket, "Sprint 1");
    expect(row).toHaveLength(NUM_COLS);
    expect(row[0]).toBe("T-1");
    expect(row[4]).toBe(3);
  });
  it("handles empty ticket gracefully", () => {
    const row = ticketToRow({}, "Fallback");
    expect(row).toHaveLength(NUM_COLS);
    expect(row[0]).toBe("");
    expect(row[8]).toBe("Fallback");
  });
});
