import { describe, it, expect } from "vitest";
import { fmt, fmtFull, relativeDuration } from "../dateUtils.js";

describe("fmt", () => {
  it("formats a date as DD Mon YY", () => {
    expect(fmt("2024-03-15")).toMatch(/15 Mar 24/);
  });
  it("returns dash for null", () => {
    expect(fmt(null)).toBe("\u2014");
  });
});

describe("fmtFull", () => {
  it("formats a date with full year", () => {
    expect(fmtFull("2024-03-15")).toMatch(/15 Mar 2024/);
  });
  it("returns dash for undefined", () => {
    expect(fmtFull(undefined)).toBe("\u2014");
  });
});

describe("relativeDuration", () => {
  it("calculates days between two dates", () => {
    expect(relativeDuration("2024-01-01", "2024-01-10")).toBe("9 days");
  });
  it("returns singular for 1 day", () => {
    expect(relativeDuration("2024-01-01", "2024-01-02")).toBe("1 day");
  });
  it("returns null if start or end missing", () => {
    expect(relativeDuration(null, "2024-01-02")).toBeNull();
    expect(relativeDuration("2024-01-01", null)).toBeNull();
  });
});
