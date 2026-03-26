import { describe, it, expect, vi } from "vitest";
import { resolveTheme, getSystemTheme, applyTheme, THEME_KEY } from "../themeUtils.js";

describe("resolveTheme", () => {
  it("returns 'dark' as-is", () => expect(resolveTheme("dark")).toBe("dark"));
  it("returns 'light' as-is", () => expect(resolveTheme("light")).toBe("light"));
  it("resolves 'system' via matchMedia", () => {
    window.matchMedia = vi.fn(() => ({ matches: true }));
    expect(resolveTheme("system")).toBe("dark");
  });
});

describe("getSystemTheme", () => {
  it("returns dark when prefers-color-scheme matches", () => {
    window.matchMedia = vi.fn(() => ({ matches: true }));
    expect(getSystemTheme()).toBe("dark");
  });
  it("returns light when prefers-color-scheme does not match", () => {
    window.matchMedia = vi.fn(() => ({ matches: false }));
    expect(getSystemTheme()).toBe("light");
  });
});

describe("applyTheme", () => {
  it("sets dataset.theme and colorScheme on documentElement", () => {
    window.matchMedia = vi.fn(() => ({ matches: false }));
    applyTheme("dark");
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(document.documentElement.style.colorScheme).toBe("dark");
  });
});

describe("THEME_KEY", () => {
  it("is the expected storage key", () => expect(THEME_KEY).toBe("sprint-tracker-theme"));
});
