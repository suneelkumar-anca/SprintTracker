import { fmtFull } from "../../utils/dateUtils.js";

export const EXCEL_HEADERS = [
  "Ticket ID", "Summary", "Assignee", "Status", "Story Points", "Time Spent",
  "Priority", "Type", "Sprint",
  "Start Date", "End Date", "Created",
  "Reporter", "Labels", "Components",
  "Jira URL", "TL Comment", "Review Rating",
];

export const EXCEL_COL_WIDTHS = [
  { wch: 12 }, { wch: 48 }, { wch: 22 }, { wch: 16 }, { wch: 12 }, { wch: 12 },
  { wch: 12 }, { wch: 14 }, { wch: 26 }, { wch: 12 }, { wch: 12 }, { wch: 12 },
  { wch: 18 }, { wch: 20 }, { wch: 20 }, { wch: 42 }, { wch: 42 }, { wch: 14 },
];

export const HEADER_STYLE = {
  font: { bold: true },
  fill: { fgColor: { rgb: "D9E1F2" } },
};

export const TITLE_STYLE = {
  font: { bold: true, sz: 28 },
  alignment: { horizontal: "left" },
};

export const NUM_COLS = 18;

const fmtDate = (d) => { const s = fmtFull(d); return s === "\u2014" ? "" : s; };

export function ticketToRow(t, sprintName) {
  return [
    t.id, t.description ?? "", t.assigneeName ?? "", t.status ?? "",
    t.sp !== null && t.sp !== undefined ? t.sp : "",
    t.timeSpent ?? "", t.priority ?? "", t.issueType ?? "",
    t.sprintName ?? sprintName,
    fmtDate(t.startDate), fmtDate(t.endDate), fmtDate(t.created),
    t.reporter ?? "", (t.labels ?? []).join(", "), (t.components ?? []).join(", "),
    t.jiraUrl ?? "",
    typeof t.tlComment === "string" ? t.tlComment : "",
    t.reviewRating !== null && t.reviewRating !== undefined ? t.reviewRating : "",
  ];
}
