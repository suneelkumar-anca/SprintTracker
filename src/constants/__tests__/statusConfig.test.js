import { describe, it, expect } from "vitest";
import { statusCfg } from "../statusConfig.js";

describe("statusCfg", () => {
  it("returns config for known status (case-insensitive)", () => {
    const cfg = statusCfg("Done");
    expect(cfg.color).toBe("var(--color-success)");
    expect(cfg.dot).toBe("var(--color-success)");
    expect(cfg.bg).toContain("rgba");
  });
  it("returns config for 'in progress'", () => {
    expect(statusCfg("In Progress").color).toBe("var(--color-warning)");
  });
  it("returns fallback for unknown status", () => {
    const cfg = statusCfg("nonexistent-status");
    expect(cfg.color).toBe("var(--text-3)");
  });
  it("returns fallback for null", () => {
    const cfg = statusCfg(null);
    expect(cfg.color).toBe("var(--text-3)");
  });
  it("returns fallback for undefined", () => {
    const cfg = statusCfg(undefined);
    expect(cfg.color).toBe("var(--text-3)");
  });
});
