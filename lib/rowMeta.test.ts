import { describe, expect, it } from "vitest";
import { rowMeta } from "@/lib/rowMeta";

describe("rowMeta", () => {
  it("บอกชื่อหมวดเต็มเสมอ เพราะจุดสีอย่างเดียวบอกหมวดไม่ได้", () => {
    expect(rowMeta({ category: "goods" })).toBe("ของใช้");
  });

  it("ต่อด้วยวิธีจ่าย", () => {
    expect(rowMeta({ category: "food", pay: "card_due" })).toBe("อาหาร · บัตร · ต้องโอน");
  });

  it("วันที่ขึ้นก่อน เมื่อรายการไม่ได้จัดกลุ่มตามวัน", () => {
    expect(rowMeta({ category: "transport", pay: "bank" }, "26 พ.ย.")).toBe(
      "26 พ.ย. · เดินทาง · โอนจ่าย"
    );
  });
});
