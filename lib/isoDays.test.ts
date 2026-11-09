import { describe, expect, it } from "vitest";
import { isISODate } from "@/lib/isoDays";

describe("isISODate", () => {
  it("accepts real calendar days", () => {
    expect(isISODate("2026-11-06")).toBe(true);
    expect(isISODate("2028-02-29")).toBe(true);
  });

  it("rejects impossible days and other shapes", () => {
    expect(isISODate("2026-02-30")).toBe(false);
    expect(isISODate("2026-13-01")).toBe(false);
    expect(isISODate("2026-1-6")).toBe(false);
    expect(isISODate("")).toBe(false);
    expect(isISODate("2026-11-06T00:00")).toBe(false);
  });
});
