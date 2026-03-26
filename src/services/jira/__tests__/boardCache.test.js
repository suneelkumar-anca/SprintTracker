import { describe, it, expect, beforeEach, vi } from "vitest";
import { getCachedBoards, setCachedBoards, clearBoardCache } from "../boardCache.js";

const KEY = "sprint_tracker_boards_cache";

beforeEach(() => localStorage.clear());

describe("setCachedBoards + getCachedBoards", () => {
  it("stores and retrieves data", () => {
    setCachedBoards([{ id: 1 }]);
    expect(getCachedBoards()).toEqual([{ id: 1 }]);
  });
  it("returns null when cache is empty", () => {
    expect(getCachedBoards()).toBeNull();
  });
  it("returns null when cache is expired", () => {
    setCachedBoards([{ id: 1 }]);
    const stored = JSON.parse(localStorage.getItem(KEY));
    stored.ts = Date.now() - 6 * 60 * 1000;
    localStorage.setItem(KEY, JSON.stringify(stored));
    expect(getCachedBoards()).toBeNull();
  });
  it("returns null for corrupt JSON", () => {
    localStorage.setItem(KEY, "not-json");
    expect(getCachedBoards()).toBeNull();
  });
});

describe("clearBoardCache", () => {
  it("removes the cache entry", () => {
    setCachedBoards([{ id: 1 }]);
    clearBoardCache();
    expect(getCachedBoards()).toBeNull();
  });
});
