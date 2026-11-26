import { describe, expect, it } from "vitest";
import { buildScopeLabel, type ScopeLabelInput } from "@/lib/scopeLabel";

// These assert composition and ordering only. The date segments run through
// Intl with a Thai locale, whose exact output shifts between ICU versions, so
// they are matched loosely on purpose — pinning them would make this file fail
// on a Node upgrade for no real reason.
const EMPTY: ScopeLabelInput = { from: "", to: "", categories: [], query: "" };

describe("buildScopeLabel", () => {
  it("ไม่กรองอะไรเลยได้ 'ทั้งหมด'", () => {
    expect(buildScopeLabel({ ...EMPTY })).toBe("ทั้งหมด");
  });

  it("มีทั้งวันเริ่มและวันจบใช้ช่วง", () => {
    const label = buildScopeLabel({ ...EMPTY, from: "2026-08-01", to: "2026-08-31" });
    expect(label).toContain("–");
    expect(label).not.toContain("ทั้งหมด");
  });

  it("มีแต่วันเริ่ม", () => {
    expect(buildScopeLabel({ ...EMPTY, from: "2026-08-01" })).toContain("ตั้งแต่");
  });

  it("มีแต่วันจบ", () => {
    expect(buildScopeLabel({ ...EMPTY, to: "2026-08-31" })).toContain("ถึง");
  });

  it("หมวดหลายอันคั่นด้วย , แล้วต่อท้ายด้วย ·", () => {
    expect(buildScopeLabel({ ...EMPTY, categories: ["food", "transport"] })).toBe(
      "ทั้งหมด · อาหาร, เดินทาง"
    );
  });

  it("คำค้นหาต่อท้ายสุดเสมอ", () => {
    const label = buildScopeLabel({
      ...EMPTY,
      categories: ["food"],
      query: "ข้าว",
    });
    expect(label).toBe('ทั้งหมด · อาหาร · ค้นหา "ข้าว"');
  });

  it("คำค้นหาถูก trim ก่อนแสดง", () => {
    expect(buildScopeLabel({ ...EMPTY, query: "  ข้าว  " })).toContain('ค้นหา "ข้าว"');
  });

  it("คำค้นหามีแต่ช่องว่างไม่ขึ้นส่วนค้นหา", () => {
    expect(buildScopeLabel({ ...EMPTY, query: "   " })).toBe("ทั้งหมด");
  });

  it("ลำดับส่วนคือ วันที่ · หมวด · ค้นหา", () => {
    const label = buildScopeLabel({
      from: "2026-08-01",
      to: "2026-08-31",
      categories: ["goods"],
      query: "สบู่",
    });
    const parts = label.split(" · ");
    expect(parts).toHaveLength(3);
    expect(parts[1]).toBe("ของใช้");
    expect(parts[2]).toBe('ค้นหา "สบู่"');
  });
});

describe("buildScopeLabel กับวิธีจ่าย", () => {
  const open = { from: "", to: "", categories: [], query: "" };

  it("ต่อท้ายวิธีจ่ายเมื่อกรองอยู่", () => {
    expect(buildScopeLabel({ ...open, pay: "cash" })).toBe("ทั้งหมด · เงินสด");
  });

  it("ทั้งหมด หรือไม่ส่ง ไม่เพิ่มอะไร", () => {
    expect(buildScopeLabel({ ...open, pay: "all" })).toBe("ทั้งหมด");
    expect(buildScopeLabel(open)).toBe("ทั้งหมด");
  });

  it("เรียง ช่วงวันที่ · หมวด · วิธีจ่าย · ค้นหา", () => {
    expect(
      buildScopeLabel({ ...open, categories: ["food"], pay: "card", query: "mrt" })
    ).toBe('ทั้งหมด · อาหาร · บัตรเครดิต · ค้นหา "mrt"');
  });
});
