const STORAGE_KEY = "sprint_tracker_reports";

export function loadSavedReports() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function saveReport(report) {
  const all = loadSavedReports();
  const idx = all.findIndex(
    (r) => r.id === report.id ||
           (report.sprintId && r.sprintId === report.sprintId &&
            report.boardId  && r.boardId  === report.boardId)
  );
  if (idx >= 0) {
    all[idx] = report;
  } else {
    all.unshift(report);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all.slice(0, 20)));
}

export function deleteReport(id) {
  const filtered = loadSavedReports().filter((r) => r.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
}

export function reorderReports(newOrder) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(newOrder.slice(0, 20)));
}
