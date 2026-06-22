import { describe, it, expect } from "vitest";
import { clampDocText, extractDocText, buildRelateTextContext, DOC_TEXT_MAX } from "./docContext";

describe("clampDocText", () => {
  it("leaves short text untouched (trimmed)", () => {
    expect(clampDocText("  hello world  ", 100)).toBe("hello world");
  });
  it("truncates long text and marks it with an ellipsis", () => {
    const r = clampDocText("x".repeat(50), 10);
    expect(r.length).toBeLessThanOrEqual(11);
    expect(r.endsWith("…")).toBe(true);
    expect(r.startsWith("xxxx")).toBe(true);
  });
  it("defaults to DOC_TEXT_MAX", () => {
    expect(clampDocText("y".repeat(DOC_TEXT_MAX + 100)).endsWith("…")).toBe(true);
  });
});

describe("extractDocText", () => {
  it("returns trimmed strings as-is", () => {
    expect(extractDocText("  abc ")).toBe("abc");
  });
  it("reads content/text/markdown/body from an object", () => {
    expect(extractDocText({ content: "c" })).toBe("c");
    expect(extractDocText({ text: "t" })).toBe("t");
    expect(extractDocText({ markdown: "m" })).toBe("m");
    expect(extractDocText({ body: "b" })).toBe("b");
  });
  it("prefers content over the other fields", () => {
    expect(extractDocText({ content: "c", text: "t" })).toBe("c");
  });
  it("digs into a StudyItem-style payload wrapper", () => {
    expect(extractDocText({ payload: { text: "p" } })).toBe("p");
  });
  it("falls back to summary when no body text exists", () => {
    expect(extractDocText({ summary: "s" })).toBe("s");
  });
  it("returns empty string for null/undefined/empty", () => {
    expect(extractDocText(null)).toBe("");
    expect(extractDocText(undefined)).toBe("");
    expect(extractDocText({})).toBe("");
  });
});

describe("buildRelateTextContext", () => {
  it("includes both titles and clamped contents", () => {
    const ctx = buildRelateTextContext(
      { title: "Alpha", text: "corpo do alpha" },
      { title: "Beta", text: "corpo do beta" },
    );
    expect(ctx).toContain("TRABALHO A");
    expect(ctx).toContain("Alpha");
    expect(ctx).toContain("corpo do alpha");
    expect(ctx).toContain("TRABALHO B");
    expect(ctx).toContain("Beta");
    expect(ctx).toContain("corpo do beta");
  });
});
