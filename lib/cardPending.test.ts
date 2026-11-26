import { describe, expect, it } from "vitest";
import { markPaidChanges, restoreChanges, summarizeCardPending } from "@/lib/cardPending";
import type { Expense, PayMethod } from "@/types";

function row(
  id: string,
  pay: PayMethod | undefined,
  date: string,
  extra: Partial<Expense> = {}
): Expense {
  return {
    id,
    date,
    item: id,
    amount: 100,
    remark: "",
    createdAt: `${date}T08:00:00.000Z`,
    category: "food",
    ...(pay ? { pay } : {}),
    ...extra,
  };
}

describe("summarizeCardPending", () => {
  it("แยกกองต้องโอนกับสิ้นเดือน ค่าอื่นไม่นับ", () => {
    const result = summarizeCardPending([
      row("due", "card_due", "2026-11-20"),
      row("later", "card_later", "2026-11-20", { amount: 20 }),
      row("paid", "card_paid", "2026-11-20"),
      row("cash", "cash", "2026-11-20"),
      row("bank", "bank", "2026-11-20"),
      row("legacy", undefined, "2026-11-20"),
    ]);
    expect(result.due.entries.map((e) => e.expense.id)).toEqual(["due"]);
    expect(result.later.entries.map((e) => e.expense.id)).toEqual(["later"]);
    expect(result.due.total).toBe(100);
    expect(result.later.total).toBe(20);
    expect(result.total).toBe(120);
  });

  it("นับทุกรอบ และเรียงใหม่สุดก่อน", () => {
    const result = summarizeCardPending([
      row("old", "card_due", "2026-03-01"),
      row("new", "card_due", "2026-11-20"),
      row("newer-same-day", "card_due", "2026-11-20", {
        createdAt: "2026-11-20T09:00:00.000Z",
      }),
    ]);
    expect(result.due.entries.map((e) => e.expense.id)).toEqual(["newer-same-day", "new", "old"]);
    expect(result.total).toBe(300);
  });

  it("นับยอดที่รูดจริง: หักส่วนที่คนอื่นออก ไม่หักส่วนที่ออกให้คนอื่น", () => {
    const result = summarizeCardPending([
      row("borrowed", "card_due", "2026-11-20", { amount: 300, remark: "ขนมจ่าย: [100] ข้าว" }),
      row("lent", "card_due", "2026-11-19", { amount: 300, remark: "ขนม: [100] ข้าว" }),
    ]);
    expect(result.due.entries.map((e) => e.amount)).toEqual([200, 300]);
  });

  it("เพื่อนออกเต็มยอดหรือเกินยอด ไม่อยู่ในกอง", () => {
    const result = summarizeCardPending([
      row("full", "card_due", "2026-11-20", { remark: "ขนมจ่าย: [100] ข้าว" }),
      row("over", "card_later", "2026-11-20", { remark: "ขนมจ่าย: [150] ข้าว" }),
    ]);
    expect(result.due.entries).toEqual([]);
    expect(result.later.entries).toEqual([]);
    expect(result.total).toBe(0);
  });

  it("ผลรวมไม่มีเศษ float", () => {
    const result = summarizeCardPending([
      row("a", "card_due", "2026-11-20", { amount: 0.1 }),
      row("b", "card_later", "2026-11-20", { amount: 0.2 }),
    ]);
    expect(result.total).toBe(0.3);
  });
});

describe("คำสั่งเปลี่ยนสถานะของกอง", () => {
  const bucket = summarizeCardPending([
    row("a", "card_later", "2026-11-20"),
    row("b", "card_later", "2026-11-19"),
  ]).later;

  it("markPaidChanges กองสิ้นเดือน จำที่มาไว้ พร้อมวันที่", () => {
    expect(markPaidChanges(bucket, "2026-11-26")).toEqual([
      { id: "a", pay: "card_later_paid", paidAt: "2026-11-26" },
      { id: "b", pay: "card_later_paid", paidAt: "2026-11-26" },
    ]);
  });

  it("markPaidChanges กองต้องโอนเลย เป็นโอนแล้วธรรมดา", () => {
    const due = summarizeCardPending([row("c", "card_due", "2026-11-20")]).due;
    expect(markPaidChanges(due, "2026-11-26")).toEqual([
      { id: "c", pay: "card_paid", paidAt: "2026-11-26" },
    ]);
  });

  it("restoreChanges คืนสถานะเดิม ไม่มี paidAt", () => {
    expect(restoreChanges(bucket)).toEqual([
      { id: "a", pay: "card_later" },
      { id: "b", pay: "card_later" },
    ]);
  });
});
