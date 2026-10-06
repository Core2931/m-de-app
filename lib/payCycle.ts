import { hasHolidayData, isBankHoliday } from "@/lib/holidays";

// Salary lands on the last banking day on or before this day of the month.
const PAY_DAY = 29;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * One salary period: from a payday up to the day before the next one.
 *
 * `budgetMonth` is the calendar month this money is for — pay that lands at
 * the end of September is October's money — and is the key the budgets tab
 * already uses, so existing budget rows keep working.
 */
export interface PayCycle {
  start: string; // YYYY-MM-DD, a payday
  end: string; // YYYY-MM-DD, inclusive
  nextPayday: string; // YYYY-MM-DD, the day after `end`
  budgetMonth: string; // YYYY-MM
}

// All date arithmetic is done in UTC on calendar dates, never local time: a
// date here is a day on the calendar, and local-time math would make the
// answer depend on the timezone of whatever machine runs it.
function toDate(iso: string): Date {
  return new Date(`${iso}T00:00:00.000Z`);
}

function toISO(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(iso: string, days: number): string {
  const date = toDate(iso);
  date.setUTCDate(date.getUTCDate() + days);
  return toISO(date);
}

function isNonWorkingDay(iso: string): boolean {
  const dayOfWeek = toDate(iso).getUTCDay();
  return dayOfWeek === 0 || dayOfWeek === 6 || isBankHoliday(iso);
}

/** Month arithmetic that rolls the year. `month` is 1–12 in and out. */
function shiftMonth(year: number, month: number, delta: number): [number, number] {
  const index = year * 12 + (month - 1) + delta;
  return [Math.floor(index / 12), (index % 12) + 1];
}

/**
 * The day salary is paid in a given month (`month` is 1–12): the 29th, or the
 * month's last day when it has no 29th, moved back past weekends and bank
 * holidays until it lands on a banking day.
 */
export function paydayOf(year: number, month: number): string {
  // Day 0 of the following month is this month's last day.
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  let payday = toISO(new Date(Date.UTC(year, month - 1, Math.min(PAY_DAY, lastDay))));
  while (isNonWorkingDay(payday)) payday = addDays(payday, -1);
  return payday;
}

/** The cycle a calendar day falls in. A payday starts its own cycle. */
export function cycleFor(dateISO: string): PayCycle {
  const year = Number(dateISO.slice(0, 4));
  const month = Number(dateISO.slice(5, 7));
  const thisMonthPayday = paydayOf(year, month);

  if (dateISO >= thisMonthPayday) {
    const [nextYear, nextMonth] = shiftMonth(year, month, 1);
    const nextPayday = paydayOf(nextYear, nextMonth);
    return {
      start: thisMonthPayday,
      end: addDays(nextPayday, -1),
      nextPayday,
      budgetMonth: `${nextYear}-${String(nextMonth).padStart(2, "0")}`,
    };
  }

  const [prevYear, prevMonth] = shiftMonth(year, month, -1);
  return {
    start: paydayOf(prevYear, prevMonth),
    end: addDays(thisMonthPayday, -1),
    nextPayday: thisMonthPayday,
    budgetMonth: `${year}-${String(month).padStart(2, "0")}`,
  };
}

export function previousCycle(cycle: PayCycle): PayCycle {
  return cycleFor(addDays(cycle.start, -1));
}

/**
 * The cycle before the one a date filter is currently showing. `from` is
 * whatever sits in the List's "จากวันที่" field: possibly empty, possibly a
 * day in the middle of a cycle — anything that is not a real date falls back
 * to today, so the button always does something sensible.
 */
export function previousCycleFrom(from: string, today: string): PayCycle {
  return previousCycle(cycleFor(isRealDate(from) ? from : today));
}

/** True only for an ISO string naming an actual calendar day. The NaN check
 *  comes first because toISOString throws on an invalid Date ("2026-13-45"). */
function isRealDate(iso: string): boolean {
  if (!ISO_DATE.test(iso)) return false;
  const date = toDate(iso);
  return !Number.isNaN(date.getTime()) && toISO(date) === iso;
}

/** Days still to get through on this money, today included. 1 on the last day. */
export function daysLeftInCycle(cycle: PayCycle, today: string): number {
  return Math.round((toDate(cycle.nextPayday).getTime() - toDate(today).getTime()) / 86_400_000);
}

/**
 * A year this cycle depends on that has no holiday list yet, or null.
 *
 * Without the list the cycle is still computed, from weekends alone, and can
 * be a day or two off — quietly, and believably. The caller says so.
 */
export function missingHolidayYear(cycle: PayCycle): number | null {
  for (const iso of [cycle.nextPayday, cycle.start]) {
    const year = Number(iso.slice(0, 4));
    if (!hasHolidayData(year)) return year;
  }
  return null;
}
