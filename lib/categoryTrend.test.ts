import { describe, expect, it } from "vitest";
import { categoryTrends } from "@/lib/categoryTrend";
import type { Category } from "@/lib/categories";
import type { Expense } from "@/types";

function expense(date: string, amount: number, category: Category = "food"): Expense {
  return {
    id: `${date}-${amount}-${category}`,
    date,
    item: "x",
    amount,
    remark: "",
    category,
    createdAt: `${date}T08:00:00.000Z`,
  };
}

// Cycle 2026-10-29 .. 2026-11-26. The one before it is 2026-09-29 .. 2026-10-28.
const cur = (food: number) => new Map<Category, number>([["food", food]]);

describe("categoryTrends", () => {
  it("is null when the range is not a pay cycle", () => {
    expect(
      categoryTrends({ expenses: [], from: "2026-11-01", to: "", today: "2026-11-10", current: cur(100) })
    ).toBeNull();
    expect(
      categoryTrends({ expenses: [], from: "2026-10-29", to: "2026-11-10", today: "2026-11-10", current: cur(100) })
    ).toBeNull();
    expect(
      categoryTrends({ expenses: [], from: "", to: "", today: "2026-11-10", current: cur(100) })
    ).toBeNull();
  });

  it("compares a running cycle with the same number of days of the last one", () => {
    // 29 Oct to 10 Nov = 13 days elapsed; the matching stretch is 29 Sep to 11 Oct.
    const expenses = [
      expense("2026-09-30", 200), // inside
      expense("2026-10-11", 100), // inside, last matching day
      expense("2026-10-12", 5000), // after the matching stretch: ignored
    ];
    const t = categoryTrends({
      expenses,
      from: "2026-10-29",
      to: "",
      today: "2026-11-10",
      current: cur(450),
    });
    expect(t?.get("food")).toEqual({ previous: 300, pct: 50 });
  });

  it("a finished cycle is compared with the whole of the one before", () => {
    const expenses = [expense("2026-10-05", 400), expense("2026-10-28", 100)];
    const t = categoryTrends({
      expenses,
      from: "2026-10-29",
      to: "2026-11-26",
      today: "2026-12-05",
      current: cur(250),
    });
    expect(t?.get("food")).toEqual({ previous: 500, pct: -50 });
  });

  it("a category with nothing before has no percentage", () => {
    const t = categoryTrends({
      expenses: [expense("2026-10-05", 400, "transport")],
      from: "2026-10-29",
      to: "",
      today: "2026-11-10",
      current: cur(250),
    });
    expect(t?.get("food")).toEqual({ previous: 0, pct: null });
  });
});
