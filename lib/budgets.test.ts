import { describe, expect, it } from "vitest";
import {
  computeBudgetProgress,
  dailyAllowance,
  findBudgetForMonth,
  parseBudgetAmount,
} from "@/lib/budgets";
import type { Budget } from "@/types";

function budget(month: string, amount: number, createdAt = "2026-08-01T00:00:00.000Z"): Budget {
  return { id: `b-${month}-${amount}`, month, amount, createdAt };
}

describe("parseBudgetAmount", () => {
  it("ตัวเลขปกติ", () => {
    expect(parseBudgetAmount(10000)).toBe(10000);
    expect(parseBudgetAmount(9999.99)).toBe(9999.99);
  });

  it("ค่าที่พิมพ์มือมีตัวคั่นหลักพันหรือสัญลักษณ์เงิน", () => {
    // ชีตสร้างมือ ช่องอาจเป็น text แล้ว Number() ตรงๆ จะได้ NaN → งบหายเงียบ
    expect(parseBudgetAmount("10,000")).toBe(10000);
    expect(parseBudgetAmount("฿10,000")).toBe(10000);
    expect(parseBudgetAmount(" 10 000 ")).toBe(10000);
  });

  it("ศูนย์และติดลบไม่ใช่งบ", () => {
    // งบ 0 ถ้านับเป็นงบจะได้แถบ 100% เกินตลอด
    expect(parseBudgetAmount(0)).toBeNull();
    expect(parseBudgetAmount("0")).toBeNull();
    expect(parseBudgetAmount(-100)).toBeNull();
  });

  it("ค่าที่อ่านไม่ออกคืน null", () => {
    expect(parseBudgetAmount("abc")).toBeNull();
    expect(parseBudgetAmount("")).toBeNull();
    expect(parseBudgetAmount(null)).toBeNull();
    expect(parseBudgetAmount(undefined)).toBeNull();
    expect(parseBudgetAmount(Infinity)).toBeNull();
    expect(parseBudgetAmount(NaN)).toBeNull();
  });
});

describe("findBudgetForMonth", () => {
  it("เจอเดือนที่ตั้งไว้", () => {
    expect(findBudgetForMonth([budget("2026-08", 10000)], "2026-08")).toBe(10000);
  });

  it("เดือนที่ไม่ได้ตั้งคืน null", () => {
    expect(findBudgetForMonth([budget("2026-08", 10000)], "2026-09")).toBeNull();
  });

  it("ลิสต์ว่างคืน null", () => {
    expect(findBudgetForMonth([], "2026-08")).toBeNull();
  });

  it("เดือนเดียวมีหลายแถวเอาแถวที่สร้างล่าสุด", () => {
    const budgets = [
      budget("2026-08", 8000, "2026-08-01T00:00:00.000Z"),
      budget("2026-08", 12000, "2026-08-15T00:00:00.000Z"),
    ];
    expect(findBudgetForMonth(budgets, "2026-08")).toBe(12000);
  });

  it("แต่ละเดือนแยกกัน — ตั้งงบเดือนใหม่ไม่กระทบเดือนเก่า", () => {
    const budgets = [budget("2026-08", 10000), budget("2026-09", 15000)];
    expect(findBudgetForMonth(budgets, "2026-08")).toBe(10000);
    expect(findBudgetForMonth(budgets, "2026-09")).toBe(15000);
  });
});

describe("computeBudgetProgress", () => {
  it("ยังไม่ตั้งงบคืน null", () => {
    expect(computeBudgetProgress(500, null)).toBeNull();
  });

  it("ใช้น้อยกว่างบ", () => {
    expect(computeBudgetProgress(2500, 10000)).toEqual({
      budget: 10000,
      spent: 2500,
      remaining: 7500,
      pct: 25,
      over: false,
    });
  });

  it("ใช้พอดีงบ เหลือ 0 ไม่ใช่ -0 และยังไม่นับว่าเกิน", () => {
    const progress = computeBudgetProgress(10000, 10000)!;
    expect(Object.is(progress.remaining, -0)).toBe(false);
    expect(progress.remaining).toBe(0);
    expect(progress.over).toBe(false);
    expect(progress.pct).toBe(100);
  });

  it("เศษทศนิยมนิดเดียวยังไม่นับว่าเกิน", () => {
    expect(computeBudgetProgress(10000.001, 10000)!.over).toBe(false);
  });

  it("ใช้เกินงบ pct ทะลุ 100 ได้ ไม่ถูกหนีบ", () => {
    const progress = computeBudgetProgress(12000, 10000)!;
    expect(progress.pct).toBe(120);
    expect(progress.over).toBe(true);
    expect(progress.remaining).toBe(-2000);
  });

  it("ยังไม่ใช้เลย", () => {
    expect(computeBudgetProgress(0, 10000)).toMatchObject({ pct: 0, over: false, remaining: 10000 });
  });

  it("งบ 0 หรือติดลบไม่ใช่งบ", () => {
    expect(computeBudgetProgress(100, 0)).toBeNull();
    expect(computeBudgetProgress(100, -5)).toBeNull();
  });
});

describe("dailyAllowance", () => {
  it("งบที่เหลือหารด้วยวันที่เหลือ ปัดลงเป็นบาทเต็ม", () => {
    // เหลือ 8,000 อีก 23 วัน → 347.82… → 347
    expect(dailyAllowance(computeBudgetProgress(2000, 10000), 23)).toBe(347);
  });

  it("วันสุดท้ายของรอบ ใช้ได้เท่าที่เหลือทั้งหมด", () => {
    expect(dailyAllowance(computeBudgetProgress(9500, 10000), 1)).toBe(500);
  });

  it("เหลือน้อยกว่าจำนวนวัน ได้ 0 ไม่ใช่เศษ", () => {
    expect(dailyAllowance(computeBudgetProgress(9990, 10000), 23)).toBe(0);
  });

  it("ไม่มีงบ คืน null", () => {
    expect(dailyAllowance(null, 23)).toBeNull();
    expect(dailyAllowance(computeBudgetProgress(2000, null), 23)).toBeNull();
  });

  it("เกินงบหรือใช้พอดีงบ คืน null", () => {
    expect(dailyAllowance(computeBudgetProgress(12000, 10000), 23)).toBeNull();
    expect(dailyAllowance(computeBudgetProgress(10000, 10000), 23)).toBeNull();
  });

  it("จำนวนวันที่ใช้ไม่ได้ คืน null ไม่หารด้วยศูนย์", () => {
    const progress = computeBudgetProgress(2000, 10000);
    expect(dailyAllowance(progress, 0)).toBeNull();
    expect(dailyAllowance(progress, -3)).toBeNull();
    expect(dailyAllowance(progress, NaN)).toBeNull();
  });
});
