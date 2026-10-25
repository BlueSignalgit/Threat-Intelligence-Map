import { describe, it, expect } from "vitest";
import { matches, sourceFresh, validateData } from "./data";
describe("intelligence presentation", () => {
  it("searches case-insensitively across fields", () => {
    expect(matches("  cve-2025 ", ["CVE-2025-1234", "vendor"])).toBe(true);
    expect(matches("missing", ["product"])).toBe(false);
  });
  it("rejects malformed snapshots", () => {
    expect(() => validateData({ indicators: [] })).toThrow();
    expect(() => validateData("<html>")).toThrow();
  });
  it("does not label failed or stale sources current", () => {
    const timestamp = Date.parse("2026-10-25T12:00:00Z");
    const source = {
      status: "ok",
      lastSuccess: "2026-10-25T00:00:00Z",
      count: 0,
      url: "https://example.com",
    };
    expect(sourceFresh(source, timestamp)).toBe(true);
    expect(sourceFresh({ ...source, status: "error" }, timestamp)).toBe(false);
    expect(
      sourceFresh(
        { ...source, lastSuccess: "2026-10-20T00:00:00Z" },
        timestamp,
      ),
    ).toBe(false);
  });
});
