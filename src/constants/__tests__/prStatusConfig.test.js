import { describe, it, expect } from "vitest";
import { prStatusCfg } from "../prStatusConfig.js";

describe("prStatusCfg", () => {
  it("returns config for MERGED", () => {
    const cfg = prStatusCfg("MERGED");
    expect(cfg.label).toBe("Merged");
    expect(cfg.color).toBe("#22c55e");
  });
  it("returns config for OPEN", () => {
    expect(prStatusCfg("OPEN").label).toBe("Open");
  });
  it("returns config for DECLINED", () => {
    expect(prStatusCfg("DECLINED").label).toBe("Declined");
  });
  it("returns fallback with original string as label for unknown", () => {
    const cfg = prStatusCfg("DRAFT");
    expect(cfg.label).toBe("DRAFT");
    expect(cfg.color).toBe("var(--text-3)");
  });
  it("returns fallback with 'PR' label for null", () => {
    expect(prStatusCfg(null).label).toBe("PR");
  });
});
