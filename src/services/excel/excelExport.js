import { EXCEL_HEADERS, EXCEL_COL_WIDTHS, HEADER_STYLE, TITLE_STYLE, NUM_COLS, ticketToRow } from "./excelConfig.js";

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

  tickets.forEach((t, i) => {
    if (!t.jiraUrl) return;
    ws[XLSX.utils.encode_cell({ r: 4 + i, c: 15 })] = {
      t: "s", v: t.jiraUrl,
      l: { Target: t.jiraUrl, Tooltip: `Open ${t.id} in Jira` },
    };
  });

  ws["!cols"]       = EXCEL_COL_WIDTHS;
  ws["!freeze"]     = { xSplit: 0, ySplit: 4 };
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
