import { describe, it, expect, beforeEach } from "vitest";
import { loadSavedReports, saveReport, deleteReport } from "../storage.js";

const KEY = "sprint_tracker_reports";
beforeEach(() => localStorage.clear());

describe("loadSavedReports", () => {
  it("returns empty array when nothing stored", () => {
    expect(loadSavedReports()).toEqual([]);
  });
  it("returns stored reports", () => {
    localStorage.setItem(KEY, JSON.stringify([{ id: "r1" }]));
    expect(loadSavedReports()).toEqual([{ id: "r1" }]);
  });
  it("returns empty array for corrupt JSON", () => {
    localStorage.setItem(KEY, "bad");
    expect(loadSavedReports()).toEqual([]);
  });
});

describe("saveReport", () => {
  it("adds a new report", () => {
    saveReport({ id: "r1", name: "Sprint 1" });
    expect(loadSavedReports()).toHaveLength(1);
  });
  it("updates existing report by id", () => {
    saveReport({ id: "r1", name: "v1" });
    saveReport({ id: "r1", name: "v2" });
    const all = loadSavedReports();
    expect(all).toHaveLength(1);
    expect(all[0].name).toBe("v2");
  });
  it("caps at 20 reports", () => {
    for (let i = 0; i < 25; i++) saveReport({ id: `r${i}` });
    expect(loadSavedReports()).toHaveLength(20);
  });
});

describe("deleteReport", () => {
  it("removes a report by id", () => {
    saveReport({ id: "r1" });
    saveReport({ id: "r2" });
    deleteReport("r1");
    expect(loadSavedReports().map(r => r.id)).toEqual(["r2"]);
  });
});
