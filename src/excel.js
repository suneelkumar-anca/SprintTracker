/**
 * excel.js — Export sprint ticket data to .xlsx using SheetJS
 *
 * Layout:
 *   Row 1  — Sprint: <name>  (bold, merged across all columns)
 *   Row 2  — empty gap
 *   Row 3  — empty gap
 *   Row 4  — Column headers  (frozen up to and including this row)
 *   Row 5+ — Data rows
 */
import * as XLSX from "xlsx-js-style";

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "";

export function exportToExcel(tickets, sprintName = "Sprint_Report") {
  const ws = XLSX.utils.aoa_to_sheet([]);

  const COLS = 18;

  // ── Row 1: Sprint heading (bold, merged) ─────────────────────────────
  ws["A1"] = {
    v: `Sprint: ${sprintName}`,
    t: "s",
    s: { font: { bold: true, sz: 28 }, alignment: { horizontal: "left" } },
  };
  ws["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: COLS - 1 } }];

  // ── Row 4: Column headers ─────────────────────────────────────────────
  const headers = [
    "Ticket ID", "Summary", "Assignee", "Status", "Story Points", "Time Spent",
    "Priority", "Type", "Sprint",
    "Start Date", "End Date", "Created",
    "Reporter", "Labels", "Components",
    "Jira URL", "TL Comment", "Review Rating",
  ];
  XLSX.utils.sheet_add_aoa(ws, [headers], { origin: "A4" });
  const headerStyle = { font: { bold: true }, fill: { fgColor: { rgb: "D9E1F2" } } };
  headers.forEach((_, ci) => {
    const ref = XLSX.utils.encode_cell({ r: 3, c: ci });
    if (ws[ref]) ws[ref].s = headerStyle;
  });

  // ── Rows 5+: Data ─────────────────────────────────────────────────────
  const dataRows = tickets.map((t) => [
    t.id,
    t.description ?? "",
    t.assigneeName ?? "",
    t.status ?? "",
    t.sp !== null && t.sp !== undefined ? t.sp : "",
    t.timeSpent ?? "",
    t.priority ?? "",
    t.issueType ?? "",
    t.sprintName ?? sprintName,
    fmtDate(t.startDate),
    fmtDate(t.endDate),
    fmtDate(t.created),
    t.reporter ?? "",
    (t.labels ?? []).join(", "),
    (t.components ?? []).join(", "),
    t.jiraUrl ?? "",  // placeholder; overwritten with hyperlink below
    typeof t.tlComment === "string" ? t.tlComment : "",
    t.reviewRating !== null && t.reviewRating !== undefined ? t.reviewRating : "",
  ]);
  XLSX.utils.sheet_add_aoa(ws, dataRows, { origin: "A5" });

  // ── Overwrite Jira URL column (P, index 15) with clickable hyperlinks ──────────
  tickets.forEach((t, i) => {
    if (!t.jiraUrl) return;
    ws[XLSX.utils.encode_cell({ r: 4 + i, c: 15 })] = {
      t: "s", v: t.jiraUrl,
      l: { Target: t.jiraUrl, Tooltip: `Open ${t.id} in Jira` },
    };
  });

  // ── Column widths ─────────────────────────────────────────────────────
  ws["!cols"] = [
    { wch: 12 }, // Ticket ID
    { wch: 48 }, // Summary
    { wch: 22 }, // Assignee
    { wch: 16 }, // Status
    { wch: 12 }, // Story Points
    { wch: 12 }, // Time Spent
    { wch: 12 }, // Priority
    { wch: 14 }, // Type
    { wch: 26 }, // Sprint
    { wch: 12 }, // Start Date
    { wch: 12 }, // End Date
    { wch: 12 }, // Created
    { wch: 18 }, // Reporter
    { wch: 20 }, // Labels
    { wch: 20 }, // Components
    { wch: 42 }, // Jira URL
    { wch: 42 }, // TL Comment
    { wch: 14 }, // Review Rating
  ];

  // Freeze through row 4
  ws["!freeze"] = { xSplit: 0, ySplit: 4 };

  // AutoFilter on all headers
  const lastColLetter = XLSX.utils.encode_col(COLS - 1);
  ws["!autofilter"] = { ref: `A4:${lastColLetter}4` };

  // Sheet range
  const lastRow = 4 + tickets.length;
  ws["!ref"] = `A1:${lastColLetter}${lastRow}`;

  // ── Workbook ──────────────────────────────────────────────────────────
  const wb = XLSX.utils.book_new();
  const sheetName = (sprintName || "Sprint").replace(/[^\w ]/g, "").slice(0, 31) || "Sprint";
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  // Timestamped filename: SprintName_report_YYYY-MM-DD_HHmm.xlsx
  const safeName = (sprintName || "sprint").replace(/[^a-z0-9_\-]/gi, "_");
  const now = new Date();
  const ts = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}_${String(now.getHours()).padStart(2,"0")}${String(now.getMinutes()).padStart(2,"0")}`;
  XLSX.writeFile(wb, `${safeName}_report_${ts}.xlsx`);
}
