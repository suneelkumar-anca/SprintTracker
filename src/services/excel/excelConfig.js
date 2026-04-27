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
  fill: { patternType: "solid", fgColor: { rgb: "D9E1F2" } },
};

export const TITLE_STYLE = {
  font: { bold: true, sz: 28 },
  alignment: { horizontal: "left" },
};

export const NUM_COLS = 18;

// Indices (0-based) of date columns: Start Date, End Date, Created
export const DATE_COL_INDICES = [9, 10, 11];
export const DATE_NUM_FMT = "dd mmm yyyy";

// Convert a date string to an Excel date serial number.
// Excel counts days since Dec 30, 1899 (UTC). Returns "" for invalid/empty dates.
const toExcelDate = (dateStr) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  return Math.round((d.getTime() - Date.UTC(1899, 11, 30)) / 86400000);
};

// Strip XML 1.0 illegal characters (control chars except tab \x09, LF \x0A, CR \x0D).
// These cause "Repaired Records: Cell information" errors in Excel.
const sanitizeStr = (s) =>
  typeof s === "string" ? s.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "") : (s ?? "");

export function ticketToRow(t, sprintName) {
  // Ensure SP is a finite number or empty string
  let spValue = "";
  if (t.sp !== null && t.sp !== undefined && t.sp !== "") {
    const spNum = Number(t.sp);
    if (Number.isFinite(spNum)) spValue = spNum;
  }

  // Guard reviewRating against NaN — NaN serialises as invalid XML <v>NaN</v>
  let rrValue = "";
  if (t.reviewRating !== null && t.reviewRating !== undefined) {
    const rr = Number(t.reviewRating);
    if (Number.isFinite(rr)) rrValue = rr;
  }

  return [
    sanitizeStr(t.id),
    sanitizeStr(t.description),
    sanitizeStr(t.assigneeName),
    sanitizeStr(t.status),
    spValue,
    sanitizeStr(t.timeSpent),
    sanitizeStr(t.priority),
    sanitizeStr(t.issueType),
    sanitizeStr(t.sprintName ?? sprintName),
    toExcelDate(t.startDate), toExcelDate(t.endDate), toExcelDate(t.created),
    sanitizeStr(t.reporter),
    sanitizeStr((t.labels ?? []).join(", ")),
    sanitizeStr((t.components ?? []).join(", ")),
    t.jiraUrl ?? "",
    sanitizeStr(typeof t.tlComment === "string" ? t.tlComment : ""),
    rrValue,
  ];
}

