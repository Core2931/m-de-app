import { describe, expect, it } from "vitest";
import { cashSpent } from "@/lib/cash";
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

describe("cashSpent", () => {
  it("nothing split: the same as myShare", () => {
    expect(cashSpent({ expenses: [expense("2026-11-01", 6000)], settlements: [], ...range })).toBe(6000);
  });

  it("money fronted for someone counts in full until it comes back", () => {
    const expenses = [expense("2026-11-01", 7000, "ขนม: [1000]")];
    expect(cashSpent({ expenses, settlements: [], ...range })).toBe(7000);
  });

  it("a repayment dated in the cycle brings it down", () => {
    const expenses = [expense("2026-11-01", 7000, "ขนม: [1000]")];
    const settlements = [settlement("2026-11-05", 400, "received")];
    expect(cashSpent({ expenses, settlements, ...range })).toBe(6600);
  });

  it("someone else paid for us: only our own cash counts, and paying them back adds", () => {
    const expenses = [expense("2026-11-01", 1000, "ขนมจ่าย: [400]")];
    expect(cashSpent({ expenses, settlements: [], ...range })).toBe(600);
    const repaid = [settlement("2026-11-03", 400, "paid")];
    expect(cashSpent({ expenses, settlements: repaid, ...range })).toBe(1000);
  });

  it("ignores expenses and settlements outside the range", () => {
    const expenses = [expense("2026-10-01", 500), expense("2026-12-01", 500)];
    const settlements = [settlement("2026-10-01", 100, "received")];
    expect(cashSpent({ expenses, settlements, ...range })).toBe(0);
  });
});
