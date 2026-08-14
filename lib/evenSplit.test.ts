import { describe, expect, it } from "vitest";
import {
  buildEvenSplitRemark,
  firstPlaceholderRange,
  hasPlaceholderPerson,
  splitEvenly,
  PLACEHOLDER_PERSON,
} from "@/lib/evenSplit";
import { summarizeExpense } from "@/lib/splits";
import type { Expense } from "@/types";

/** Compares money at satang precision — float equality would be a lie here. */
function satang(value: number): number {
  return Math.round(value * 100);
}

describe("splitEvenly", () => {
  it("หาร 2 คนลงตัว", () => {
    expect(splitEvenly(100, 2)).toMatchObject({ share: 50, others: 1, myShare: 50 });
  });

  it("หาร 3 คนไม่ลงตัว เศษตกที่เรา", () => {
    const split = splitEvenly(100, 3)!;
    expect(split.share).toBe(33.33);
    expect(split.others).toBe(2);
    expect(split.myShare).toBe(33.34);
    // ผลรวมต้องเท่ายอดบิลเป๊ะที่ระดับสตางค์
    expect(satang(split.share) * split.others + satang(split.myShare)).toBe(satang(100));
  });

  it("ยอดน้อยที่หารไม่ลงตัว", () => {
    const split = splitEvenly(10, 3)!;
    expect(split.share).toBe(3.33);
    expect(split.myShare).toBe(3.34);
  });

  it("กับดัก float: 0.1 หาร 2", () => {
    // 0.1 * 100 === 10.000000000000002 ถ้าไม่ปัดก่อนจะได้ 0.04 กับ 0.06
    const split = splitEvenly(0.1, 2)!;
    expect(split.share).toBe(0.05);
    expect(split.myShare).toBe(0.05);
  });

  it("ส่วนแบ่งต่ำกว่า 1 สตางค์คืน null", () => {
    // ปล่อยให้ออก [0] จะโดน parseBlocks ทิ้ง แล้ว parseRemark ตั้ง invalid
    // ผู้ใช้จะเจอ "อ่าน format ไม่ออก" กับข้อความที่แอปเขียนเอง
    expect(splitEvenly(0.02, 3)).toBeNull();
  });

  it("จำนวนคนที่ใช้ไม่ได้คืน null", () => {
    expect(splitEvenly(100, 1)).toBeNull();
    expect(splitEvenly(100, 0)).toBeNull();
    expect(splitEvenly(100, -2)).toBeNull();
    expect(splitEvenly(100, 2.5)).toBeNull();
    expect(splitEvenly(100, 99)).toBeNull();
  });

  it("ยอดเงินที่ใช้ไม่ได้คืน null", () => {
    expect(splitEvenly(0, 2)).toBeNull();
    expect(splitEvenly(-5, 2)).toBeNull();
    expect(splitEvenly(NaN, 2)).toBeNull();
    expect(splitEvenly(Infinity, 2)).toBeNull();
  });

  it("myShare ไม่มีทางติดลบ และ share ไม่มีทางเกินส่วนเรา", () => {
    for (let amount = 1; amount <= 200; amount += 7) {
      for (let ways = 2; ways <= 10; ways++) {
        const split = splitEvenly(amount, ways);
        if (!split) continue;
        expect(split.myShare).toBeGreaterThanOrEqual(split.share);
        expect(satang(split.share) * split.others + satang(split.myShare)).toBe(satang(amount));
      }
    }
  });
});

describe("buildEvenSplitRemark ผ่าน summarizeExpense", () => {
  function check(amount: number, ways: number, base = "") {
    const split = splitEvenly(amount, ways)!;
    const remark = buildEvenSplitRemark(base, split);
    const expense: Expense = {
      id: "e1",
      date: "2026-07-10",
      item: "x",
      amount,
      remark,
      category: "food",
      createdAt: "2026-07-10T05:00:00.000Z",
    };
    return { remark, summary: summarizeExpense(expense), split };
  }

  it("ข้อความที่ gen มา parse กลับได้ตรง ไม่ over-allocate", () => {
    for (const [amount, ways] of [
      [100, 2],
      [100, 3],
      [10, 3],
      [333.33, 4],
      [1, 2],
    ] as const) {
      const { summary, split } = check(amount, ways);
      expect(summary.invalid, `${amount}/${ways}`).toBe(false);
      expect(summary.overAllocated, `${amount}/${ways}`).toBe(false);
      expect(summary.splits, `${amount}/${ways}`).toHaveLength(split.others);
      expect(satang(summary.myShare), `${amount}/${ways}`).toBe(satang(split.myShare));
    }
  });

  it("ต่อท้ายของเดิม ไม่เขียนทับ", () => {
    const { remark } = check(100, 2, "ขนม: [20] ข้าว");
    expect(remark.startsWith("ขนม: [20] ข้าว")).toBe(true);
    expect(remark).toContain(`${PLACEHOLDER_PERSON}: [50]`);
  });
});

describe("hasPlaceholderPerson", () => {
  it("true เมื่อยังไม่ได้ใส่ชื่อ", () => {
    expect(hasPlaceholderPerson("?: [50] ")).toBe(true);
    expect(hasPlaceholderPerson("ขนม: [50]; ?: [50] ")).toBe(true);
  });

  it("false หลังแทนชื่อครบแล้ว", () => {
    expect(hasPlaceholderPerson("ขนม: [50] ; ต้อม: [50] ")).toBe(false);
  });

  it("false เมื่อ ? อยู่ใน label ไม่ใช่ตำแหน่งชื่อ", () => {
    // เคสนี้กัดแน่ถ้าเช็คด้วย remark.includes("?")
    expect(hasPlaceholderPerson("ขนม: [50] ค่าอะไร?")).toBe(false);
  });

  it("false กับหมายเหตุว่างหรือธรรมดา", () => {
    expect(hasPlaceholderPerson("")).toBe(false);
    expect(hasPlaceholderPerson("ข้าวเที่ยง")).toBe(false);
  });
});

describe("firstPlaceholderRange", () => {
  it("ชี้ตรงตัว ? ตัวแรก", () => {
    const remark = "ขนม: [20] ข้าว; ?: [50] ";
    const range = firstPlaceholderRange(remark)!;
    expect(remark.slice(range.start, range.end)).toBe("?");
  });

  it("ตัวแรกสุดเมื่อมีหลายตัว", () => {
    const remark = "?: [50] ; ?: [50] ";
    const range = firstPlaceholderRange(remark)!;
    expect(range.start).toBe(0);
  });

  it("null เมื่อไม่มี placeholder", () => {
    expect(firstPlaceholderRange("ขนม: [50] ค่าอะไร?")).toBeNull();
  });
});
