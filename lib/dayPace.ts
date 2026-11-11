import { findBudgetForMonth } from "@/lib/budgets";
import { buildCycleCalendar } from "@/lib/cycleCalendar";
import type { PaceLevel } from "@/lib/pace";
import { cycleFor } from "@/lib/payCycle";
import { myShareByDate } from "@/lib/rangeTotals";
import type { Budget, Expense } from "@/types";

export interface DayPace {
  level: PaceLevel;
  /** Whole baht the day was allowed at its start, or null without a budget. */
  allowance: number | null;
  /** What the day really cost us (myShare). */
  spent: number;
}

/**
 * How each of the given days did against its own cycle's budget, for the list
 * screen: the same judgement the home calendar makes, so a colour means the
 * same thing in both places.
 *
 * Every cycle that holds at least one of the days is laid out once (a cycle
 * is judged as a whole, since each day's allowance depends on what the days
 * before it spent) and its cells are read back by date. A cycle with no budget
 * set simply has no level, so those days come back at level 0 and are left
 * uncoloured.
 */
export function dayPaceMap(input: {
  expenses: Expense[];
  budgets: Budget[];
  dates: string[];
}): Map<string, DayPace> {
  const { expenses, budgets, dates } = input;
  const result = new Map<string, DayPace>();
  const done = new Set<string>();

  for (const date of dates) {
    const cycle = cycleFor(date);
    if (done.has(cycle.start)) continue;
    done.add(cycle.start);

    const weeks = buildCycleCalendar({
      cycle,
      // Only used to mark "today", which the list does not show.
      today: "",
      budget: findBudgetForMonth(budgets, cycle.budgetMonth),
      spentByDate: myShareByDate(expenses, cycle.start, cycle.end),
    });

    for (const week of weeks) {
      for (const cell of week.cells) {
        if (!cell) continue;
        result.set(cell.date, {
          level: cell.level,
          allowance: cell.allowance,
          spent: cell.spent,
        });
      }
    }
  }

  return result;
}
