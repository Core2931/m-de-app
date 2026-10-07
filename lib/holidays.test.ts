import { describe, expect, it } from "vitest";
import { BANK_HOLIDAYS, hasHolidayData, isBankHoliday } from "@/lib/holidays";

describe("BANK_HOLIDAYS", () => {
  it("จำนวนวันตรงกับประกาศ ธปท.", () => {
    expect(BANK_HOLIDAYS[2026]).toHaveLength(20);
    expect(BANK_HOLIDAYS[2027]).toHaveLength(18);
  });

  it("ทุกค่าเป็นวันที่ที่มีจริง และอยู่ในปีของ key", () => {
    for (const [year, dates] of Object.entries(BANK_HOLIDAYS)) {
      for (const iso of dates) {
        // Round-trips only for a real calendar day in ISO form.
        expect(new Date(`${iso}T00:00:00.000Z`).toISOString().slice(0, 10), iso).toBe(iso);
        expect(iso.slice(0, 4), iso).toBe(year);
      }
    }
  });

  it("ไม่มีวันซ้ำ", () => {
    for (const dates of Object.values(BANK_HOLIDAYS)) {
      expect(new Set(dates).size).toBe(dates.length);
    }
  });

  it("ไม่มีวันหยุดที่ตรงกับเสาร์อาทิตย์", () => {
    // ธปท. ประกาศวันชดเชยเป็นวันทำการเสมอ — วันเสาร์อาทิตย์ในรายการแปลว่าพิมพ์ผิด
    for (const dates of Object.values(BANK_HOLIDAYS)) {
      for (const iso of dates) {
        const dow = new Date(`${iso}T00:00:00.000Z`).getUTCDay();
        expect([0, 6], iso).not.toContain(dow);
      }
    }
  });
});

describe("isBankHoliday", () => {
  it("วันในรายการเป็นวันหยุด", () => {
    expect(isBankHoliday("2026-07-28")).toBe(true);
    expect(isBankHoliday("2026-07-29")).toBe(true);
    expect(isBankHoliday("2027-10-25")).toBe(true);
  });

  it("วันทำการปกติไม่ใช่วันหยุด", () => {
    expect(isBankHoliday("2026-07-27")).toBe(false);
    expect(isBankHoliday("2026-09-29")).toBe(false);
  });

  it("ปีที่ไม่มีข้อมูลไม่ถือว่าเป็นวันหยุด", () => {
    expect(isBankHoliday("2028-07-28")).toBe(false);
  });
});

describe("hasHolidayData", () => {
  it("บอกได้ว่าปีไหนมีรายการ", () => {
    expect(hasHolidayData(2026)).toBe(true);
    expect(hasHolidayData(2027)).toBe(true);
    expect(hasHolidayData(2025)).toBe(false);
    expect(hasHolidayData(2028)).toBe(false);
  });
});
