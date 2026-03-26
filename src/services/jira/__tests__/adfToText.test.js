import { describe, it, expect } from "vitest";
import { adfToText } from "../adfToText.js";

describe("adfToText", () => {
  it("returns empty string for null/undefined", () => {
    expect(adfToText(null)).toBe("");
    expect(adfToText(undefined)).toBe("");
  });
  it("returns string input as-is", () => {
    expect(adfToText("hello")).toBe("hello");
  });
  it("extracts text from a text node", () => {
    expect(adfToText({ type: "text", text: "world" })).toBe("world");
  });
  it("returns empty for text node without text", () => {
    expect(adfToText({ type: "text" })).toBe("");
  });
  it("joins paragraph content with newline", () => {
    const doc = {
      type: "paragraph",
      content: [{ type: "text", text: "a" }, { type: "text", text: "b" }],
    };
    expect(adfToText(doc)).toBe("a\nb");
  });
  it("handles nested doc structure", () => {
    const doc = {
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "line1" }] },
        { type: "paragraph", content: [{ type: "text", text: "line2" }] },
      ],
    };
    expect(adfToText(doc)).toContain("line1");
    expect(adfToText(doc)).toContain("line2");
  });
  it("returns empty for node without content array", () => {
    expect(adfToText({ type: "unknown" })).toBe("");
  });
});
