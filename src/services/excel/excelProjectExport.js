import { secondsToMandays, countWorkingDays } from "../../utils/workingDaysUtils.js";

const HEADER_STYLE = {
  font: { bold: true, color: { rgb: "FFFFFF" }, sz: 11 },
  fill: { fgColor: { rgb: "4F46E5" } },
  alignment: { horizontal: "center", vertical: "center", wrapText: true },
  border: { bottom: { style: "thin", color: { rgb: "6366F1" } } },
};

const TITLE_STYLE = {
  font: { bold: true, sz: 14, color: { rgb: "E0E7FF" } },
  fill: { fgColor: { rgb: "1E1B4B" } },
  alignment: { horizontal: "left", vertical: "center" },
};

const HEADERS = [
  "Epic Key", "Project Name", "Start Date", "End Date",
  "Total Tickets", "Done", "Completion %", "Total SP", "Done SP",
  "Logged Mandays", "Team Size", "Working Days", "Leave Days (INT-2,INT-4)", "Public Holidays (INT-24)",
  "Blocked", "High-Priority Open", "Issues / Risks", "Decisions",
];
const COL_WIDTHS = [14, 40, 14, 14, 14, 10, 14, 12, 12, 16, 12, 14, 18, 20, 12, 18, 60, 60];

/**
 * Export project summary table to Excel.
 *
 * @param {Array<{epic, data, override}>} projects
 * @param {string} boardName
 */
export async function exportProjectsReport(projects, boardName = "Projects_Report") {
  if (!window.Buffer) {
    const { Buffer } = await import("buffer");
    window.Buffer = Buffer;
  }
  const XLSX = await import("xlsx-js-style");

  const ws = XLSX.utils.aoa_to_sheet([]);

  // Title row
  ws["A1"] = { v: `Projects Report: ${boardName}`, t: "s", s: TITLE_STYLE };
  ws["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: HEADERS.length - 1 } }];

  // Header row (row 3, 0-indexed row 2)
  XLSX.utils.sheet_add_aoa(ws, [HEADERS], { origin: "A3" });
  HEADERS.forEach((_, ci) => {
    const ref = XLSX.utils.encode_cell({ r: 2, c: ci });
    if (ws[ref]) ws[ref].s = HEADER_STYLE;
  });

  // Data rows
  const rows = projects.map(({ epic, data, override }) => {
    const autoLeave    = data?.leaveData?.leaveDays    ?? 0;
    const autoHolidays = data?.leaveData?.publicHolidays ?? 0;
    const autoPerPerson = data?.leaveData?.perPerson ?? {};
    const memberLeaveOverrides = override?.memberLeave ?? {};

    const getMemberLeave = (name) => {
      if (memberLeaveOverrides[name] !== undefined && memberLeaveOverrides[name] !== null) return memberLeaveOverrides[name];
      if (autoPerPerson[name] !== undefined) return autoPerPerson[name];
      return autoLeave;
    };

    const computedTotalLeave = data?.teamMembers?.length > 0
      ? Math.round(data.teamMembers.reduce((sum, m) => sum + getMemberLeave(m.name), 0) * 10) / 10
      : 0;
    const leaveDays = override?.leaveDays !== null && override?.leaveDays !== undefined
      ? override.leaveDays : computedTotalLeave;
    const publicHolidays = override?.publicHolidays !== null && override?.publicHolidays !== undefined ? override.publicHolidays : autoHolidays;
    const completionPct = data?.totalCount > 0
      ? Math.round((data.doneCount / data.totalCount) * 100) : 0;
    const mandays     = data ? secondsToMandays(data.totalTimeSeconds) : 0;
    const workingDays = data ? countWorkingDays(data.startDate, data.endDate, publicHolidays, leaveDays) : 0;
    const risks = [
      ...(data?.blockedTickets ?? []).map(t => `BLOCKED: ${t.key} — ${t.summary} (${t.assignee})`),
      ...(data?.highPriorityNotDone ?? []).map(t => `${t.priority}: ${t.key} — ${t.summary} [${t.status}]`),
    ].join("\n") || "";

    return [
      epic.key,
      epic.name,
      data?.startDate ?? "",
      data?.endDate   ?? "",
      data?.totalCount    ?? 0,
      data?.doneCount     ?? 0,
      completionPct,
      data?.totalSP       ?? 0,
      data?.doneSP        ?? 0,
      mandays,
      data?.teamMembers?.length ?? 0,
      workingDays,
      leaveDays,
      publicHolidays,
      data?.blockedCount              ?? 0,
      data?.highPriorityNotDoneCount  ?? 0,
      risks,
      override?.decisions ?? "",
    ];
  });

  XLSX.utils.sheet_add_aoa(ws, rows, { origin: "A4" });

  // Column widths
  ws["!cols"] = COL_WIDTHS.map(w => ({ wch: w }));

  // Auto-filter on header row
  ws["!autofilter"] = { ref: `A3:${XLSX.utils.encode_col(HEADERS.length - 1)}3` };
  ws["!ref"] = `A1:${XLSX.utils.encode_col(HEADERS.length - 1)}${3 + rows.length}`;

  const wb = XLSX.utils.book_new();
  const sheetName = (boardName || "Projects").replace(/[^\w ]/g, "").slice(0, 31) || "Projects";
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  const safeName = (boardName || "projects").replace(/[^a-z0-9_\-]/gi, "_");
  const now = new Date();
  const ts = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  XLSX.writeFile(wb, `${safeName}_projects_${ts}.xlsx`);
}
