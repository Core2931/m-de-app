import { describe, expect, it } from "vitest";
import { buildCycleCalendar } from "@/lib/cycleCalendar";
import type { PayCycle } from "@/lib/payCycle";

// 2026-10-29 is a Thursday. The cycle runs to 2026-11-26 (next payday 11-27): 29 days.
const cycle: PayCycle = {
  start: "2026-10-29",
  end: "2026-11-26",
  nextPayday: "2026-11-27",
  budgetMonth: "2026-11",
};

function build(spent: Record<string, number>, budget: number | null, today = "2026-11-06") {
  return buildCycleCalendar({
    cycle,
    today,
    budget,
    spentByDate: new Map(Object.entries(spent)),
  });
}

describe("buildCycleCalendar layout", () => {
  it("lays out Monday-first weeks, blank before the start and after the end", () => {
    const weeks = build({}, null);
    // Thu start: Mon Tue Wed are blank
    expect(weeks[0].cells.slice(0, 3)).toEqual([null, null, null]);
    expect(weeks[0].cells[3]?.date).toBe("2026-10-29");
    // Thu end: Fri Sat Sun are blank
    const last = weeks[weeks.length - 1];
    expect(last.cells[3]?.date).toBe("2026-11-26");
    expect(last.cells.slice(4)).toEqual([null, null, null]);
    expect(weeks.every((w) => w.cells.length === 7)).toBe(true);
    expect(weeks.flatMap((w) => w.cells).filter(Boolean)).toHaveLength(29);
  });

  it("a cycle that starts on Monday has no leading blanks", () => {
    const monday: PayCycle = {
      ...cycle,
      start: "2026-11-02",
      end: "2026-11-08",
      nextPayday: "2026-11-09",
    };
    const weeks = buildCycleCalendar({
      cycle: monday,
      today: "2026-11-02",
      budget: null,
      spentByDate: new Map(),
    });
    expect(weeks).toHaveLength(1);
    expect(weeks[0].cells.every(Boolean)).toBe(true);
  });

  it("marks today and the current week", () => {
    const weeks = build({}, null, "2026-11-06");
    const cells = weeks.flatMap((w) => w.cells).filter(Boolean);
    expect(cells.filter((c) => c?.isToday).map((c) => c?.date)).toEqual(["2026-11-06"]);
    expect(weeks.filter((w) => w.isCurrent)).toHaveLength(1);
  });

  it("no budget: every level is 0 and weeks have no cap", () => {
    const weeks = build({ "2026-11-06": 99999 }, null);
    expect(weeks.every((w) => w.level === 0 && w.cap === null)).toBe(true);
    expect(weeks.flatMap((w) => w.cells).every((c) => !c || c.level === 0)).toBe(true);
  });

  it("sums each week", () => {
    const weeks = build({ "2026-10-29": 100, "2026-10-31": 50, "2026-11-02": 70 }, null);
    expect(weeks[0].total).toBe(150);
    expect(weeks[1].total).toBe(70);
  });
});

describe("buildCycleCalendar levels", () => {
  // Budget 2,900 over 29 days = 100 a day on the first day.
  it("the first day is judged against budget / days", () => {
    expect(build({ "2026-10-29": 100 }, 2900)[0].cells[3]).toMatchObject({ spent: 100, level: 0 });
    expect(build({ "2026-10-29": 130 }, 2900)[0].cells[3]?.level).toBe(2);
  });

  it("the next day's allowance shrinks after an overspend (rolling)", () => {
    // 300 on day one leaves 2600 over 28 days = 92, so 100 is a little over.
    const weeks = build({ "2026-10-29": 300, "2026-10-30": 100 }, 2900);
    expect(weeks[0].cells[3]?.level).toBe(3);
    expect(weeks[0].cells[4]?.level).toBe(1);
  });

  it("a day with no spending stays level 0 even when the budget is gone", () => {
    const weeks = build({ "2026-10-29": 5000 }, 2900);
    expect(weeks[0].cells[5]?.level).toBe(0);
  });

  it("a week's cap is its first day's allowance times its days in the cycle", () => {
    const weeks = build({}, 2900);
    // First row has 4 days (Thu to Sun), 100 a day.
    expect(weeks[0].cap).toBe(400);
  });

  it("a week over its cap is coloured", () => {
    // Cap 400, spent 520 = 1.3x.
    const weeks = build(
      { "2026-10-29": 100, "2026-10-30": 100, "2026-10-31": 100, "2026-11-01": 220 },
      2900
    );
    expect(weeks[0].total).toBe(520);
    expect(weeks[0].level).toBe(2);
  });
});
