import { EPSILON, snapZero } from "@/lib/splits";
import type { Budget } from "@/types";

export const MONTH_RE = /^\d{4}-\d{2}$/;

/**
 * Reads a budget amount out of whatever a hand-edited sheet cell contains.
 *
 * The single place amounts get parsed, so the sheet reader and the selector
 * cannot disagree. A text-formatted cell arrives as "10,000" or "฿10,000";
 * Number() alone reads either as NaN, which would make the budget silently
 * vanish rather than show as wrong.
 *
 * Zero and negatives are null, not a budget: treating 0 as one renders a bar
 * that is permanently 100% over, and "not set" is what was meant.
 */
export function parseBudgetAmount(raw: unknown): number | null {
  const amount =
    typeof raw === "number" ? raw : Number(String(raw ?? "").replace(/[,฿\s]/g, ""));
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return amount;
}

/**
 * The budget in force for a month, or null when there is not a usable one.
 * The most recently created row wins if a month somehow has more than one.
 */
export function findBudgetForMonth(budgets: Budget[], month: string): number | null {
  const rows = budgets
    .filter((b) => b.month === month)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return rows.length === 0 ? null : parseBudgetAmount(rows[0].amount);
}

export interface BudgetProgress {
  budget: number;
  spent: number;
  remaining: number;
  /** Not clamped — the text should be able to say 120%. */
  pct: number;
  over: boolean;
}

export function computeBudgetProgress(
  spent: number,
  budget: number | null
): BudgetProgress | null {
  if (budget === null || !Number.isFinite(budget) || budget <= 0) return null;
  const safeSpent = Number.isFinite(spent) ? spent : 0;
  return {
    budget,
    spent: snapZero(safeSpent),
    // snapZero so a month that lands exactly on budget shows 0, not -0.
    remaining: snapZero(budget - safeSpent),
    pct: (safeSpent / budget) * 100,
    // EPSILON so a month that lands exactly on budget is not reported as over
    // because of float dust in the summed expenses.
    over: safeSpent - budget > EPSILON,
  };
}

/**
 * How much can be spent per day for the rest of the cycle without going over:
 * what is left of the budget spread across the days still to get through.
 *
 * Whole baht, rounded down — a figure to steer by, and rounding up would
 * promise money that is not there. Null when there is nothing useful to say:
 * no budget, nothing left, or already over (the card says "เกิน" for that).
 */
export function dailyAllowance(progress: BudgetProgress | null, daysLeft: number): number | null {
  if (!progress || progress.over || progress.remaining <= 0) return null;
  if (!Number.isFinite(daysLeft) || daysLeft < 1) return null;
  return Math.floor(progress.remaining / daysLeft);
}
