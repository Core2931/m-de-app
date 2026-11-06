import { paceLevel, type PaceLevel } from "@/lib/pace";
import type { PayCycle } from "@/lib/payCycle";

export interface CalendarDay {
  date: string;
  /** Day of the month, for the cell label. */
  day: number;
  /** What the day really cost us (myShare). */
  spent: number;
  level: PaceLevel;
  isToday: boolean;
}

export interface CalendarWeek {
  /** Monday to Sunday. Null where the cycle has not started or has ended. */
  cells: (CalendarDay | null)[];
  total: number;
  /** What the week's days in this cycle were allowed, or null without a budget. */
  cap: number | null;
  level: PaceLevel;
  isCurrent: boolean;
}

// Calendar dates only, in UTC, for the same reason payCycle does it: local
// time would make the grid depend on the machine's timezone.
function toDate(iso: string): Date {
  return new Date(`${iso}T00:00:00.000Z`);
}

function addDays(iso: string, days: number): string {
  const date = toDate(iso);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function daysBetween(from: string, to: string): number {
  return Math.round((toDate(to).getTime() - toDate(from).getTime()) / 86_400_000);
}

/** 0 = Monday, 6 = Sunday. */
function mondayIndex(iso: string): number {
  return (toDate(iso).getUTCDay() + 6) % 7;
}

/**
 * The cycle laid out as Monday-first weeks, each day coloured by how it did
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
  let cells: (CalendarDay | null)[] = Array(mondayIndex(cycle.start)).fill(null);
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
