import { describe, expect, it } from "vitest";
import {
  CARD_PAYS,
  PAY_METHODS,
  applyPayChanges,
  choosePay,
  isCardPay,
  pickerValue,
  matchesPayFilter,
  mergePay,
  payTag,
} from "@/lib/payMethods";
import type { Expense } from "@/types";

const base: Expense = {
  id: "e1",
  date: "2026-11-20",
  item: "กาแฟ",
  amount: 65,
  remark: "",
  createdAt: "2026-11-20T08:00:00.000Z",
  category: "food",
};

it("payTag บอกว่าเป็นบัตรเฉพาะค่าบัตร", () => {
  expect(payTag("card_due")).toBe("บัตร · ต้องโอน");
  expect(payTag("card_later")).toBe("บัตร · สิ้นเดือน");
  expect(payTag("card_paid")).toBe("บัตร · โอนแล้ว");
  expect(payTag("cash")).toBe("เงินสด");
  expect(payTag("bank")).toBe("โอนจ่าย");
});

it("ปุ่มบัตรเรียง ต้องโอน · โอนแล้ว · สิ้นเดือน ตามที่ลองใน prototype", () => {
  expect(CARD_PAYS).toEqual(["card_due", "card_paid", "card_later"]);
});

describe("mergePay", () => {
  const paid = { pay: "card_paid", paidAt: "2026-11-20" } as const;

  it("request ไม่ส่ง pay คงค่าเดิมทั้งคู่", () => {
    expect(mergePay({}, paid)).toEqual(paid);
    expect(mergePay({}, {})).toEqual({});
  });

  it("โอนแล้วอยู่เดิม คงวันที่โอนเดิม", () => {
    expect(mergePay({ pay: "card_paid", paidAt: "2026-11-26" }, paid)).toEqual(paid);
  });

  it("โอนแล้วอยู่เดิมแต่ไม่มีวันที่ ใช้วันที่ที่ส่งมา", () => {
    expect(mergePay({ pay: "card_paid", paidAt: "2026-11-26" }, { pay: "card_paid" })).toEqual({
      pay: "card_paid",
      paidAt: "2026-11-26",
    });
  });

  it("เพิ่งเปลี่ยนเป็นโอนแล้ว ใช้วันที่ที่ส่งมา", () => {
    expect(mergePay({ pay: "card_paid", paidAt: "2026-11-26" }, { pay: "card_due" })).toEqual({
      pay: "card_paid",
      paidAt: "2026-11-26",
    });
  });

  it("เปลี่ยนเป็นค่าอื่น ล้างวันที่โอน", () => {
    expect(mergePay({ pay: "cash" }, paid)).toEqual({ pay: "cash" });
  });
});

it("applyPayChanges แก้เฉพาะ id ที่ระบุ และลบ paidAt เมื่อไม่ใช่โอนแล้ว", () => {
  const list: Expense[] = [
    { ...base, id: "a", pay: "card_paid", paidAt: "2026-11-26" },
    { ...base, id: "b", pay: "card_due" },
  ];
  const next = applyPayChanges(list, [{ id: "a", pay: "card_later" }]);
  expect(next[0].pay).toBe("card_later");
  expect(next[0]).not.toHaveProperty("paidAt");
  expect(next[1]).toBe(list[1]);
});

describe("matchesPayFilter", () => {
  const all = [
    "card_due",
    "card_later",
    "card_paid",
    "card_later_paid",
    "cash",
    "bank",
    undefined,
  ] as const;
  const passing = (filter: "all" | "card" | "cash" | "bank") =>
    all.filter((pay) => matchesPayFilter(pay, filter));

  it("ทั้งหมด รับทุกค่า รวมรายการที่ไม่ระบุ", () => {
    expect(passing("all")).toEqual([...all]);
  });

  it("บัตรเครดิต รับสถานะบัตรทุกค่าเท่านั้น", () => {
    expect(passing("card")).toEqual(["card_due", "card_later", "card_paid", "card_later_paid"]);
  });

  it("เงินสด กับ โอนจ่าย รับเฉพาะตัวเอง", () => {
    expect(passing("cash")).toEqual(["cash"]);
    expect(passing("bank")).toEqual(["bank"]);
  });
});

describe("card_later_paid คือ โอนแล้ว ที่มาจากกองสิ้นเดือน", () => {
  it("แสดงเหมือน โอนแล้ว และไม่มีปุ่มของตัวเอง", () => {
    expect(payTag("card_later_paid")).toBe("บัตร · โอนแล้ว");
    expect(isCardPay("card_later_paid")).toBe(true);
    expect(PAY_METHODS).toContain("card_later_paid");
    expect(CARD_PAYS).not.toContain("card_later_paid");
    expect(pickerValue("card_later_paid")).toBe("card_paid");
    expect(pickerValue("cash")).toBe("cash");
    expect(pickerValue(null)).toBeNull();
  });

  it("เลือก โอนแล้ว บนรายการสิ้นเดือน จำที่มาไว้", () => {
    expect(choosePay("card_paid", "card_later")).toBe("card_later_paid");
    expect(choosePay("card_paid", "card_later_paid")).toBe("card_later_paid");
    expect(choosePay("card_paid", "card_due")).toBe("card_paid");
    expect(choosePay("card_paid", undefined)).toBe("card_paid");
    expect(choosePay("cash", "card_later")).toBe("cash");
  });

  it("mergePay คงวันที่โอนเดิม และ applyPayChanges เก็บ paidAt", () => {
    const stored = { pay: "card_later_paid", paidAt: "2026-11-20" } as const;
    expect(mergePay({ pay: "card_later_paid", paidAt: "2026-11-26" }, stored)).toEqual(stored);
    const [next] = applyPayChanges(
      [{ ...base, id: "a", pay: "card_later" }],
      [{ id: "a", pay: "card_later_paid", paidAt: "2026-11-26" }]
    );
    expect(next.paidAt).toBe("2026-11-26");
  });
});
