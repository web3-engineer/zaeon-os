import { describe, it, expect } from "vitest";
import {
  ttlString,
  isCacheableEstimate,
  parseCacheName,
  buildCacheRequest,
  MIN_CACHE_BASE64,
} from "./contextCache";

describe("ttlString", () => {
  it("formats seconds as a Vertex ttl string", () => {
    expect(ttlString(2700)).toBe("2700s");
  });
  it("never goes below 1s", () => {
    expect(ttlString(0)).toBe("1s");
    expect(ttlString(0.4)).toBe("1s");
  });
});

describe("isCacheableEstimate", () => {
  it("is false for tiny PDFs (below the byte floor)", () => {
    expect(isCacheableEstimate(MIN_CACHE_BASE64 - 1)).toBe(false);
  });
  it("is true at/above the floor", () => {
    expect(isCacheableEstimate(MIN_CACHE_BASE64)).toBe(true);
    expect(isCacheableEstimate(MIN_CACHE_BASE64 * 3)).toBe(true);
  });
});

describe("parseCacheName", () => {
  it("extracts the cache resource name", () => {
    expect(parseCacheName({ name: "projects/p/locations/l/cachedContents/9" }))
      .toBe("projects/p/locations/l/cachedContents/9");
  });
  it("returns null when absent", () => {
    expect(parseCacheName({})).toBe(null);
    expect(parseCacheName(null)).toBe(null);
    expect(parseCacheName("x")).toBe(null);
  });
});

describe("buildCacheRequest", () => {
  it("builds the cachedContents body with the PDF inline and a ttl", () => {
    const body: any = buildCacheRequest({
      project: "proj", location: "us-central1", model: "gemini-2.5-flash",
      pdfBase64: "QUJD", ttlSeconds: 2700,
    });
    expect(body.model).toBe(
      "projects/proj/locations/us-central1/publishers/google/models/gemini-2.5-flash",
    );
    expect(body.contents[0].parts[0].inlineData.mimeType).toBe("application/pdf");
    expect(body.contents[0].parts[0].inlineData.data).toBe("QUJD");
    expect(body.ttl).toBe("2700s");
  });
});
