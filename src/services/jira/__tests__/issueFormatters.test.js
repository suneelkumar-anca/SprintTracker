import { describe, it, expect } from "vitest";
import { safeNum, fmtTimeSpent } from "../issueFormatters.js";

describe("safeNum", () => {
  it("returns null for null/undefined", () => {
    expect(safeNum(null)).toBeNull();
    expect(safeNum(undefined)).toBeNull();
  });
  it("returns a finite number", () => expect(safeNum(5)).toBe(5));
  it("converts string-like number", () => expect(safeNum("3")).toBe(3));
  it("returns null for NaN", () => expect(safeNum("abc")).toBeNull());
  it("handles object with value property", () => {
    expect(safeNum({ value: 8 })).toBe(8);
  });
});

describe("fmtTimeSpent", () => {
  it("returns empty for null/0/negative", () => {
    expect(fmtTimeSpent(null)).toBe("");
    expect(fmtTimeSpent(0)).toBe("");
    expect(fmtTimeSpent(-10)).toBe("");
  });
  it("formats hours and minutes", () => {
    expect(fmtTimeSpent(3660)).toBe("1h 1m");
  });
  it("formats only hours when no remainder", () => {
    expect(fmtTimeSpent(7200)).toBe("2h");
  });
  it("formats only minutes", () => {
    expect(fmtTimeSpent(300)).toBe("5m");
  });
  it("returns '< 1m' for very short durations", () => {
    expect(fmtTimeSpent(30)).toBe("< 1m");
  });
});
