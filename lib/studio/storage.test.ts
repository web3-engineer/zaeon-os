import { describe, it, expect } from "vitest";
import { sanitizeId, studioFilePath, studioDir } from "@/lib/studio/storage";

describe("sanitizeId", () => {
  it("remove tudo que não for [a-zA-Z0-9_-] (anti path-traversal)", () => {
    expect(sanitizeId("../../etc/passwd")).toBe("etcpasswd");
    expect(sanitizeId("abc_123-XYZ")).toBe("abc_123-XYZ");
    expect(sanitizeId("a/b\\c.d")).toBe("abcd");
    expect(sanitizeId("")).toBe("");
  });
});

describe("studioFilePath", () => {
  it("monta <dir>/<id>.<ext> com id e ext saneados", () => {
    const p = studioFilePath("507f1f77bcf86cd799439011", "mp3");
    expect(p.startsWith(studioDir())).toBe(true);
    expect(p.endsWith("/507f1f77bcf86cd799439011.mp3")).toBe(true);
  });

  it("não permite traversal pela extensão e usa fallback bin", () => {
    expect(studioFilePath("id", "../x").endsWith("/id.x")).toBe(true);
    expect(studioFilePath("id", "").endsWith("/id.bin")).toBe(true);
  });
});
