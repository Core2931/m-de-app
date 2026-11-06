import type { BudgetProgress } from "@/lib/budgets";

/** 0 = within the daily allowance; 3 = far past it. */
export type PaceLevel = 0 | 1 | 2 | 3;

export interface TodayPace {
  level: PaceLevel;
  /** Whole baht the day was allowed, fixed at the start of the day. */
  allowance: number;
  /** How far past the allowance, in baht. Zero while level is 0. */
  overBy: number;
}

// Ratio of spend to allowance where each level begins (exclusive of the lower
// bound): up to 100% is fine, then yellow, orange, red.
const STEP_1 = 1.25;
const STEP_2 = 1.5;

/**
 * How today's spending sits against the daily allowance, or null when there is
 * nothing to measure against (no budget, or the cycle is over).
 *
 * The allowance is fixed at the START of the day: what is left now plus what
 * today already took, spread over the days left (today included). Using the
 * live "remaining / daysLeft" instead would shrink as you spend, so the same
 * baht would count against you twice and the number would turn red early.
 *
 * Measured on myShare, like the budget itself. The allowance is floored to
 * whole baht and compared as floored, so what the screen says and what the
 * colour means can never disagree.
 *
 * A start-of-day allowance of zero or less means the budget was already spent;
 * any spending today is then the worst level, and an empty day stays level 0.
 */
export function todayPace(
  progress: BudgetProgress | null,
  todayMyShare: number,
  daysLeft: number
): TodayPace | null {
  if (!progress) return null;
  if (!Number.isFinite(daysLeft) || daysLeft < 1) return null;
  if (!Number.isFinite(todayMyShare)) return null;

  const allowance = Math.max(0, Math.floor((progress.remaining + todayMyShare) / daysLeft));

  // Integer satang, so float dust in summed expenses cannot flip a boundary.
  const spentSatang = Math.round(todayMyShare * 100);
  const allowanceSatang = allowance * 100;
  const overSatang = spentSatang - allowanceSatang;

  if (overSatang <= 0) return { level: 0, allowance, overBy: 0 };

  const overBy = overSatang / 100;
  if (allowanceSatang === 0) return { level: 3, allowance, overBy };

  const ratio = spentSatang / allowanceSatang;
  const level: PaceLevel = ratio <= STEP_1 ? 1 : ratio <= STEP_2 ? 2 : 3;
  return { level, allowance, overBy };
}
