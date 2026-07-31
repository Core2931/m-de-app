import { describe, expect, it } from "vitest";
import { isMissingTab } from "@/lib/settlementSheets";

// readAllSettlements tolerates a missing settlements tab by returning [].
// isMissingTab decides which errors get that treatment, so it must stay narrow:
// widen it and a bad GOOGLE_SHEET_ID stops being an error and starts looking
// like "no debts yet" — the exact failure this whole branch must not produce.
describe("isMissingTab", () => {
  it("เข้าคู่กับข้อความจริงตอน tab ไม่มี", () => {
    expect(
      isMissingTab(new Error("Unable to parse range: settlements!A2:G"))
    ).toBe(true);
  });

  it("ไม่สนใจตัวพิมพ์เล็กใหญ่", () => {
    expect(isMissingTab(new Error("unable to parse range: settlements!A2:G"))).toBe(true);
  });

  it("spreadsheet ID ผิด ต้องไม่ถูกกลืน", () => {
    expect(isMissingTab(new Error("Requested entity was not found."))).toBe(false);
  });

  it("error อื่นๆ ต้องไม่ถูกกลืน", () => {
    expect(isMissingTab(new Error("The caller does not have permission"))).toBe(false);
    expect(isMissingTab(new Error("Missing GOOGLE_SHEET_ID env var"))).toBe(false);
    expect(isMissingTab(new Error("Quota exceeded for quota metric 'Read requests'"))).toBe(false);
    expect(isMissingTab(new Error(""))).toBe(false);
  });

  it("ของที่ไม่ใช่ Error ต้องไม่ถูกกลืน", () => {
    expect(isMissingTab("Unable to parse range: settlements!A2:G")).toBe(false);
    expect(isMissingTab({ message: "Unable to parse range" })).toBe(false);
    expect(isMissingTab(null)).toBe(false);
    expect(isMissingTab(undefined)).toBe(false);
  });
});
