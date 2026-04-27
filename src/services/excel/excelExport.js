import { EXCEL_HEADERS, EXCEL_COL_WIDTHS, HEADER_STYLE, TITLE_STYLE, NUM_COLS, DATE_COL_INDICES, DATE_NUM_FMT, ticketToRow } from "./excelConfig.js";

export async function exportToExcel(tickets, sprintName = "Sprint_Report") {
  if (!window.Buffer) { const { Buffer } = await import("buffer"); window.Buffer = Buffer; }
  const XLSX = await import("xlsx-js-style");
  const ws = XLSX.utils.aoa_to_sheet([]);

  ws["A1"] = { v: `Sprint: ${sprintName}`, t: "s", s: TITLE_STYLE };
  ws["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: NUM_COLS - 1 } }];

  XLSX.utils.sheet_add_aoa(ws, [EXCEL_HEADERS], { origin: "A4" });
  EXCEL_HEADERS.forEach((_, ci) => {
    const ref = XLSX.utils.encode_cell({ r: 3, c: ci });
    if (ws[ref]) ws[ref].s = HEADER_STYLE;
  });

  const dataRows = tickets.map((t) => ticketToRow(t, sprintName));
  
  XLSX.utils.sheet_add_aoa(ws, dataRows, { origin: "A5" });

  // Apply date number format so Excel treats date columns as real dates (enables filtering/sorting)
  tickets.forEach((_, i) => {
    DATE_COL_INDICES.forEach((ci) => {
      const cellRef = XLSX.utils.encode_cell({ r: 4 + i, c: ci });
      if (ws[cellRef] && ws[cellRef].v !== "" && ws[cellRef].v !== undefined) {
        ws[cellRef].t = "n";
        ws[cellRef].s = { numFmt: DATE_NUM_FMT };
      }
    });
  });

  // Format Story Points column (column E = index 4) as numbers - properly merge cell properties
  tickets.forEach((t, i) => {
    const spValue = t.sp !== null && t.sp !== undefined && t.sp !== "" ? Number(t.sp) : null;
    if (spValue !== null && !isNaN(spValue)) {
      const cellRef = XLSX.utils.encode_cell({ r: 4 + i, c: 4 });
      if (ws[cellRef]) {
        ws[cellRef].t = "n";
        ws[cellRef].v = spValue;
      }
    }
  });

  tickets.forEach((t, i) => {
    if (!t.jiraUrl) return;
    const cellRef = XLSX.utils.encode_cell({ r: 4 + i, c: 15 });
    if (ws[cellRef]) {
      ws[cellRef].l = { Target: t.jiraUrl, Tooltip: `Open ${t.id} in Jira` };
    }
  });

  ws["!cols"]       = EXCEL_COL_WIDTHS;
  const lastColLetter = XLSX.utils.encode_col(NUM_COLS - 1);
  ws["!autofilter"] = { ref: `A4:${lastColLetter}4` };
  ws["!ref"]        = `A1:${lastColLetter}${4 + tickets.length}`;

  const wb = XLSX.utils.book_new();
  const sheetName = (sprintName || "Sprint").replace(/[^\w ]/g, "").slice(0, 31) || "Sprint";
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  const safeName = (sprintName || "sprint").replace(/[^a-z0-9_\-]/gi, "_");
  const now = new Date();
  const ts = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}_${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}`;
  XLSX.writeFile(wb, `${safeName}_report_${ts}.xlsx`);
}
