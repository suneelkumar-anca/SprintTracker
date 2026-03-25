/**
 * storage.js — Persist sprint reports in localStorage
 */

const STORAGE_KEY = "sprint_tracker_reports";

export function loadSavedReports() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

/** Upsert a report (matched by id). Keeps most recent 20 reports. */
export function saveReport(report) {
  const all = loadSavedReports();
  const idx = all.findIndex((r) => r.id === report.id);
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
