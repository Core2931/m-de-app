import { describe, expect, it } from "vitest";
import { myShareForRange, totalForRange } from "@/lib/rangeTotals";
import type { Expense } from "@/types";

function expense(date: string, amount: number, remark = ""): Expense {
  return {
    id: `${date}-${amount}`,
    date,
    item: "รายการ",
    amount,
    remark,
    category: "food",
    createdAt: `${date}T05:00:00.000Z`,
  };
}

const FROM = "2026-09-29";
const TO = "2026-10-28";

describe("totalForRange", () => {
  it("รวมวันแรกและวันสุดท้ายของช่วง", () => {
    const expenses = [expense(FROM, 100), expense("2026-10-10", 20), expense(TO, 3)];
    expect(totalForRange(expenses, FROM, TO)).toBe(123);
  });

  it("ไม่รวมวันก่อนช่วงและวันหลังช่วง", () => {
    const expenses = [expense("2026-09-28", 1000), expense("2026-10-29", 2000), expense(FROM, 5)];
    expect(totalForRange(expenses, FROM, TO)).toBe(5);
  });

  it("ไม่มีรายจ่ายในช่วง ได้ 0", () => {
    expect(totalForRange([], FROM, TO)).toBe(0);
    expect(totalForRange([expense("2026-01-01", 50)], FROM, TO)).toBe(0);
  });
});

describe("myShareForRange", () => {
  it("หักส่วนที่ออกให้คนอื่นออก", () => {
    // 120 ทั้งบิล ออกให้ขนม 50 → ของฉัน 70
    const expenses = [expense("2026-10-01", 120, "ขนม: [50] ข้าว"), expense("2026-10-02", 30)];
    expect(myShareForRange(expenses, FROM, TO)).toBe(100);
  });

  it("ใช้ขอบเขตช่วงเดียวกับยอดรวม", () => {
    const expenses = [
      expense("2026-09-28", 500, "ขนม: [100] ข้าว"),
      expense(FROM, 120, "ขนม: [50] ข้าว"),
      expense(TO, 10),
      expense("2026-10-29", 999),
    ];
    expect(myShareForRange(expenses, FROM, TO)).toBe(80);
  });
});
