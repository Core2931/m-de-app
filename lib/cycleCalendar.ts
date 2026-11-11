import { addDays, daysBetween } from "@/lib/isoDays";
import { paceLevel, type PaceLevel } from "@/lib/pace";
import type { PayCycle } from "@/lib/payCycle";

export interface CalendarDay {
  date: string;
  /** Day of the month, for the cell label. */
  day: number;
  /** What the day really cost us (myShare). */
  spent: number;
  /** What the day was allowed at its start, in whole baht; null without a budget. */
  allowance: number | null;
  level: PaceLevel;
  isToday: boolean;
}

export interface CalendarWeek {
  /** Sunday to Saturday. Null where the cycle has not started or has ended. */
  cells: (CalendarDay | null)[];
  total: number;
  /** What the week's days in this cycle were allowed, or null without a budget. */
  cap: number | null;
  level: PaceLevel;
  isCurrent: boolean;
}

/** Column of a date in a Sunday-first week: 0 = Sunday, 6 = Saturday. */
function weekdayIndex(iso: string): number {
  return new Date(`${iso}T00:00:00.000Z`).getUTCDay();
}

/**
 * The cycle laid out as Sunday-first weeks, each day coloured by how it did
 * against the allowance it had at the START of that day: what the budget had
 * left after earlier days, spread over the days left from then (that day
 * included). Same definition as todayPace, so yesterday and today are judged
 * by one rule and a cell never changes colour once its day is over.
 *
 * Each week is held to its first in-cycle day's allowance times the days it
 * has in this cycle. Weeks at either end are partial and padded with nulls.
 *
 * Without a budget there is nothing to judge against, so every level is 0 and
 * the grid is just amounts.
 */
export function buildCycleCalendar(input: {
  cycle: PayCycle;
  today: string;
  budget: number | null;
  spentByDate: Map<string, number>;
}): CalendarWeek[] {
  const { cycle, today, budget, spentByDate } = input;
  const budgetValue = budget !== null && Number.isFinite(budget) && budget > 0 ? budget : null;

  const weeks: CalendarWeek[] = [];
  let cells: (CalendarDay | null)[] = Array(weekdayIndex(cycle.start)).fill(null);
  let weekTotal = 0;
  let weekDays = 0;
  let weekAllowance: number | null = null;
  let isCurrent = false;
  let spentBefore = 0;

  const closeWeek = () => {
    while (cells.length < 7) cells.push(null);
    const cap = weekAllowance === null ? null : weekAllowance * weekDays;
    weeks.push({
      cells,
      total: weekTotal,
      cap,
      level: cap === null ? 0 : paceLevel(weekTotal, cap).level,
      isCurrent,
    });
    cells = [];
    weekTotal = 0;
    weekDays = 0;
    weekAllowance = null;
    isCurrent = false;
  };

  for (let date = cycle.start; date <= cycle.end; date = addDays(date, 1)) {
    const spent = spentByDate.get(date) ?? 0;
    const daysLeft = daysBetween(date, cycle.nextPayday);
    const allowance =
      budgetValue !== null && daysLeft >= 1
        ? Math.max(0, Math.floor((budgetValue - spentBefore) / daysLeft))
        : null;

    if (weekAllowance === null && allowance !== null) weekAllowance = allowance;

    cells.push({
      date,
      day: Number(date.slice(8, 10)),
      spent,
      allowance,
      level: allowance === null ? 0 : paceLevel(spent, allowance).level,
      isToday: date === today,
    });
    weekTotal += spent;
    weekDays += 1;
    if (date === today) isCurrent = true;
    spentBefore += spent;

    if (cells.length === 7) closeWeek();
  }
  if (cells.length > 0) closeWeek();

  return weeks;
}
