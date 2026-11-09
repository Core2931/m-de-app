import { addDays, daysBetween } from "@/lib/isoDays";

export type BudgetForecast =
  /** At this pace the money lasts to payday, with roughly `left` over. */
  | { kind: "ok"; left: number }
  /** At this pace it runs out on `runOutDate`, `daysShort` days before payday. */
  | { kind: "short"; runOutDate: string; daysShort: number };

/** Fewer elapsed days than this and one big purchase decides the whole answer. */
export const MIN_DAYS_FOR_FORECAST = 3;

/**
 * Where the budget is heading if the rest of the cycle looks like the part
 * already gone: the average myShare per elapsed day (today included) carried
 * forward over the days still to come.
 *
 * Null when there is nothing honest to say: too early in the cycle, nothing
 * spent, or the budget is already gone (the card says "เกิน" for that).
 *
 * Today is already inside `spent`, so only the days after today are projected.
 * That keeps the answer from shifting every time an item is added today beyond
 * what that item really changes.
 */
export function forecastBudget(input: {
  spent: number;
  remaining: number;
  cycleStart: string;
  today: string;
  nextPayday: string;
}): BudgetForecast | null {
  const { spent, remaining, cycleStart, today, nextPayday } = input;
  if (![spent, remaining].every(Number.isFinite)) return null;

  const elapsed = daysBetween(cycleStart, today) + 1;
  if (elapsed < MIN_DAYS_FOR_FORECAST) return null;
  if (spent <= 0 || remaining <= 0) return null;

  // Days after today that still need paying for. Zero or less on payday eve.
  const daysAhead = daysBetween(today, nextPayday) - 1;
  if (daysAhead < 1) return null;

  const average = spent / elapsed;
  const needed = average * daysAhead;
  if (needed <= remaining) return { kind: "ok", left: remaining - needed };

  // Whole days the money covers; it runs out during the next one.
  const runOutDate = addDays(today, Math.ceil(remaining / average));
  return {
    kind: "short",
    runOutDate,
    daysShort: Math.max(1, daysBetween(runOutDate, nextPayday)),
  };
}

/**
 * What a day has really cost so far this cycle: spent over the calendar days
 * elapsed, today included. Days with nothing spent count, or the figure would
 * flatter big days and disagree with the forecast, which uses the same average.
 */
export function dailyAverage(spent: number, cycleStart: string, today: string): number | null {
  if (!Number.isFinite(spent) || spent <= 0) return null;
  const elapsed = Math.max(1, daysBetween(cycleStart, today) + 1);
  return spent / elapsed;
}
