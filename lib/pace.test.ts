import { describe, expect, it } from "vitest";
import { computeBudgetProgress } from "@/lib/budgets";
import { remainingLevel, todayPace } from "@/lib/pace";

// Budget 3,000 over 10 days left. Spent is the cycle total INCLUDING today.
function progress(spent: number, budget = 3000) {
  return computeBudgetProgress(spent, budget);
}

describe("todayPace", () => {
  it("ไม่มีงบ → null", () => {
    expect(todayPace(null, 100, 10)).toBeNull();
  });

  it("ไม่เหลือวัน → null", () => {
    expect(todayPace(progress(0), 100, 0)).toBeNull();
    expect(todayPace(progress(0), 100, Number.NaN)).toBeNull();
  });

  it("allowance คิดจากต้นวัน ไม่ลดตามที่ใช้ไปวันนี้", () => {
    // วันนี้ใช้ 200: remaining 2800 → ต้นวัน (2800+200)/10 = 300
    const p = todayPace(progress(200), 200, 10);
    expect(p).toEqual({ level: 0, allowance: 300, overBy: 0 });
    // ใช้ 300 พอดี = ยังไม่เกิน และ allowance ไม่เปลี่ยน
    expect(todayPace(progress(300), 300, 10)?.allowance).toBe(300);
    expect(todayPace(progress(300), 300, 10)?.level).toBe(0);
  });

  it("ไต่ระดับ 1.25 / 1.5 เท่า", () => {
    // allowance 300 ตลอด: spent = todayMyShare ตั้งแต่ต้นรอบ
    // remaining = 3000 - s, ต้นวัน = (3000 - s + s)/10 = 300
    expect(todayPace(progress(301), 301, 10)).toMatchObject({ level: 1, overBy: 1 });
    expect(todayPace(progress(375), 375, 10)?.level).toBe(1); // 1.25 พอดี
    expect(todayPace(progress(376), 376, 10)?.level).toBe(2);
    expect(todayPace(progress(450), 450, 10)?.level).toBe(2); // 1.5 พอดี
    expect(todayPace(progress(451), 451, 10)?.level).toBe(3);
  });

  it("allowance ปัดลงเป็นบาทเต็ม", () => {
    // 1000 / 3 = 333.33 → 333
    expect(todayPace(progress(0, 1000), 0, 3)?.allowance).toBe(333);
    // 333.50 เกิน 333 → ระดับ 1 เกิน 0.5
    const p = todayPace(computeBudgetProgress(333.5, 1000), 333.5, 3);
    expect(p).toMatchObject({ level: 1, allowance: 333, overBy: 0.5 });
  });

  it("งบหมดไปก่อนวันนี้ → ใช้เท่าไหร่ก็แดง วันที่ไม่ใช้ยังขาว", () => {
    // ใช้เกินไปแล้วก่อนวันนี้ (spent 3500, วันนี้ 0)
    expect(todayPace(progress(3500), 0, 10)).toEqual({ level: 0, allowance: 0, overBy: 0 });
    expect(todayPace(progress(3550), 50, 10)).toEqual({ level: 3, allowance: 0, overBy: 50 });
  });

  it("เหลือวันเดียว ได้ทั้งก้อน", () => {
    expect(todayPace(progress(2500), 100, 1)?.allowance).toBe(600);
  });
});

describe("remainingLevel", () => {
  const level = (spent: number) => remainingLevel(computeBudgetProgress(spent, 1000)!);

  it("green while there is plenty left", () => {
    expect(level(0)).toBe(0);
    expect(level(699)).toBe(0);
  });

  it("yellow from 70% used, orange from 85%", () => {
    expect(level(700)).toBe(1);
    expect(level(849)).toBe(1);
    expect(level(850)).toBe(2);
  });

  it("exactly the whole budget is orange, past it red", () => {
    expect(level(1000)).toBe(2);
    expect(level(1001)).toBe(3);
  });
});
