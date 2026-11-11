import { describe, expect, it } from "vitest";
import { dayPaceMap } from "@/lib/dayPace";
import type { Budget, Expense } from "@/types";

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

// The cycle 2026-10-29 .. 2026-11-26 is November's money (budgetMonth 2026-11).
const budget = (amount: number): Budget => ({
  id: "b1",
  month: "2026-11",
  amount,
  createdAt: "2026-10-29T00:00:00.000Z",
});

describe("dayPaceMap", () => {
  it("judges a day against the allowance of the cycle it falls in", () => {
    // 2,900 over 29 days = 100 a day; 130 is 1.3x -> level 2.
    const map = dayPaceMap({
      expenses: [expense("2026-10-29", 130)],
      budgets: [budget(2900)],
      dates: ["2026-10-29"],
    });
    expect(map.get("2026-10-29")).toEqual({ level: 2, allowance: 100, spent: 130 });
  });

  it("uses myShare, not the raw amount", () => {
    // 130 paid, 40 of it for a friend: our day was 90, inside the allowance.
    const map = dayPaceMap({
      expenses: [expense("2026-10-29", 130, "ขนม: [40]")],
      budgets: [budget(2900)],
      dates: ["2026-10-29"],
    });
    expect(map.get("2026-10-29")).toMatchObject({ level: 0, spent: 90 });
  });

  it("a cycle with no budget has no allowance and no colour", () => {
    const map = dayPaceMap({
      expenses: [expense("2026-10-29", 99999)],
      budgets: [],
      dates: ["2026-10-29"],
    });
    expect(map.get("2026-10-29")).toEqual({ level: 0, allowance: null, spent: 99999 });
  });

  it("days from two cycles are each judged against their own budget", () => {
    // 2026-10-15 belongs to the cycle that ended 2026-10-28 (budgetMonth 2026-10).
    const map = dayPaceMap({
      expenses: [expense("2026-10-15", 500), expense("2026-10-29", 500)],
      budgets: [budget(2900), { id: "b0", month: "2026-10", amount: 100000, createdAt: "2026-09-29T00:00:00.000Z" }],
      dates: ["2026-10-15", "2026-10-29"],
    });
    expect(map.get("2026-10-15")?.level).toBe(0); // 500 against a huge allowance
    expect(map.get("2026-10-29")?.level).toBe(3); // 500 against 100 a day
  });
});
