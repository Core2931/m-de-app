import type { Category } from "@/lib/categories";
import { addDays, daysBetween } from "@/lib/isoDays";
import { cycleFor, previousCycle } from "@/lib/payCycle";
import type { Expense } from "@/types";

export interface CategoryTrend {
  /** What the same category came to in the matching stretch of the cycle before. */
  previous: number;
  /** Change against `previous`, in percent; null when there was nothing before. */
  pct: number | null;
}

/**
 * Whether the range on screen is a pay cycle (or the running one, open-ended)
 * and so has a cycle before it to be compared with. Anything else, an
 * arbitrary pair of dates, has no honest comparison and gets none.
 */
function cycleOfRange(from: string, to: string) {
  if (!from) return null;
  const cycle = cycleFor(from);
  if (from !== cycle.start) return null;
  if (to !== "" && to !== cycle.end) return null;
  return cycle;
}

/**
 * Each category's total against the cycle before it, like for like: a cycle
 * that is only ten days old is compared with the first ten days of the last
 * one, not with its whole month, which would make everything look cheap.
 *
 * Totals are the raw amounts, the figure the category rows themselves show.
 * Returns null when the range is not a cycle.
 */
export function categoryTrends(input: {
  expenses: Expense[];
  from: string;
  to: string;
  today: string;
  /** The totals the screen is showing now, by category. */
  current: Map<Category, number>;
}): Map<Category, CategoryTrend> | null {
  const { expenses, from, to, today, current } = input;
  const cycle = cycleOfRange(from, to);
  if (!cycle) return null;

  // A cycle that has not started yet has nothing to compare.
  const lastDay = today < cycle.end ? today : cycle.end;
  const elapsed = daysBetween(cycle.start, lastDay) + 1;
  if (elapsed < 1) return null;

  const before = previousCycle(cycle);
  // A finished cycle is compared with the whole of the one before (cycles are
  // not all the same length, so cutting it at the same day count would drop a
  // day); a running one only with the same stretch.
  const finished = today > cycle.end;
  const comparedTo = addDays(before.start, elapsed - 1);
  const rangeEnd = finished || comparedTo > before.end ? before.end : comparedTo;

  const previous = new Map<Category, number>();
  for (const expense of expenses) {
    if (expense.date < before.start || expense.date > rangeEnd) continue;
    previous.set(expense.category, (previous.get(expense.category) ?? 0) + expense.amount);
  }

  const result = new Map<Category, CategoryTrend>();
  for (const [category, total] of current) {
    const was = previous.get(category) ?? 0;
    result.set(category, {
      previous: was,
      pct: was > 0 ? ((total - was) / was) * 100 : null,
    });
  }
  return result;
}
