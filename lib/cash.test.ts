import { describe, expect, it } from "vitest";
import { cashPosition } from "@/lib/cash";
import type { Expense, Settlement } from "@/types";

function expense(date: string, amount: number, remark = ""): Expense {
  return {
    id: `${date}-${amount}`,
    date,
    item: "x",
    amount,
    remark,
    category: "food",
    createdAt: `${date}T08:00:00.000Z`,
  };
}

function settlement(date: string, amount: number, direction: "received" | "paid"): Settlement {
  return {
    id: `s-${date}-${amount}`,
    date,
    person: "ขนม",
    amount,
    direction,
    note: "",
    createdAt: `${date}T08:00:00.000Z`,
  };
}

const range = { from: "2026-10-29", to: "2026-11-26" };

describe("cashPosition", () => {
  it("nothing split: cash and budget views agree", () => {
    const p = cashPosition({
      expenses: [expense("2026-11-01", 6000)],
      settlements: [],
      budget: 9000,
      remaining: 3000,
      ...range,
    });
    expect(p).toEqual({ cashOut: 6000, cashRemaining: 3000, gap: 0 });
  });

  it("money fronted for someone: the account is lower than the budget says", () => {
    // Paid 7,000 of which 1,000 was ขนม's: myShare 6,000, cash out 7,000.
    const p = cashPosition({
      expenses: [expense("2026-11-01", 7000, "ขนม: [1000]")],
      settlements: [],
      budget: 9000,
      remaining: 3000,
      ...range,
    });
    expect(p).toEqual({ cashOut: 7000, cashRemaining: 2000, gap: 1000 });
  });

  it("a repayment dated in the cycle closes the gap", () => {
    const p = cashPosition({
      expenses: [expense("2026-11-01", 7000, "ขนม: [1000]")],
      settlements: [settlement("2026-11-05", 400, "received")],
      budget: 9000,
      remaining: 3000,
      ...range,
    });
    expect(p).toEqual({ cashOut: 7000, cashRemaining: 2400, gap: 600 });
  });

  it("someone else paid for us: the account is higher than the budget says", () => {
    // 1,000 item, ขนม paid 400 of it: we paid 600 but consumed 1,000.
    const p = cashPosition({
      expenses: [expense("2026-11-01", 1000, "ขนมจ่าย: [400]")],
      settlements: [],
      budget: 9000,
      remaining: 8000,
      ...range,
    });
    expect(p).toEqual({ cashOut: 600, cashRemaining: 8400, gap: -400 });
  });

  it("ignores expenses and settlements outside the range", () => {
    const p = cashPosition({
      expenses: [expense("2026-10-01", 500), expense("2026-12-01", 500)],
      settlements: [settlement("2026-10-01", 100, "received")],
      budget: 9000,
      remaining: 9000,
      ...range,
    });
    expect(p).toEqual({ cashOut: 0, cashRemaining: 9000, gap: 0 });
  });
});
