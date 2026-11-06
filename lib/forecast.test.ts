import { describe, expect, it } from "vitest";
import { forecastBudget } from "@/lib/forecast";

// Cycle 2026-10-29 .. 2026-11-26, next payday 2026-11-27.
const base = { cycleStart: "2026-10-29", nextPayday: "2026-11-27" };

describe("forecastBudget", () => {
  it("returns null too early in the cycle", () => {
    // 2 elapsed days (29, 30 Oct)
    expect(forecastBudget({ ...base, today: "2026-10-30", spent: 900, remaining: 2000 })).toBeNull();
  });

  it("returns null with nothing spent or nothing left", () => {
    expect(forecastBudget({ ...base, today: "2026-11-05", spent: 0, remaining: 5000 })).toBeNull();
    expect(forecastBudget({ ...base, today: "2026-11-05", spent: 800, remaining: 0 })).toBeNull();
    expect(forecastBudget({ ...base, today: "2026-11-05", spent: 800, remaining: -50 })).toBeNull();
  });

  it("returns null on the last day, when nothing is left to project", () => {
    expect(forecastBudget({ ...base, today: "2026-11-26", spent: 5000, remaining: 100 })).toBeNull();
  });

  it("ok: money lasts to payday, with the projected leftover", () => {
    // 8 days elapsed (29 Oct to 5 Nov), 800 spent = 100/day. 21 days after today = 2,100.
    const f = forecastBudget({ ...base, today: "2026-11-05", spent: 800, remaining: 3000 });
    expect(f).toEqual({ kind: "ok", left: 900 });
  });

  it("short: runs out on the day after the money covers, and counts days before payday", () => {
    // 100/day, 1,000 left covers 10 days, so it runs out on the 10th day after today.
    const f = forecastBudget({ ...base, today: "2026-11-05", spent: 800, remaining: 1000 });
    expect(f).toEqual({ kind: "short", runOutDate: "2026-11-15", daysShort: 12 });
  });

  it("short: a partial day still counts as running out that day", () => {
    // 100/day, 250 left = 2.5 days, so it runs out on day 3.
    const f = forecastBudget({ ...base, today: "2026-11-05", spent: 800, remaining: 250 });
    expect(f).toMatchObject({ kind: "short", runOutDate: "2026-11-08" });
  });

  it("exactly enough money is ok, not short", () => {
    const f = forecastBudget({ ...base, today: "2026-11-05", spent: 800, remaining: 2100 });
    expect(f).toEqual({ kind: "ok", left: 0 });
  });
});
