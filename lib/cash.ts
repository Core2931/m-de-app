import { snapZero, summarizeExpense } from "@/lib/splits";
import type { Expense, Settlement } from "@/types";

export interface CashPosition {
  /** What actually left our pocket on expenses dated in the range. */
  cashOut: number;
  /** Budget minus cash out plus repayments dated in the range: the money that
   *  should be sitting in the account. */
  cashRemaining: number;
  /**
   * How far the budget's "remaining" is from the cash: positive means money
   * we fronted has not come back yet, negative means we owe someone.
   * Zero when nothing is outstanding in the range.
   */
  gap: number;
}

/**
 * The cash view of a cycle, next to the budget view.
 *
 * The budget counts myShare, which assumes money fronted for other people
 * is already back. Until it is, the account is lower than "remaining" says:
 * pay ฿7,000, of which ฿1,000 was for a friend, against a ฿9,000 budget, and
 * the budget reads ฿3,000 left while the account holds ฿2,000. Settlements
 * dated in the range move cash in or out, which is why they are included
 * here and the gap closes as people pay back.
 *
 * Unlike the person balances, a settlement is counted even if its expense is
 * gone: money that moved is money that moved.
 */
export function cashPosition(input: {
  expenses: Expense[];
  settlements: Settlement[];
  budget: number;
  /** The budget view's remaining (budget minus myShare), for the gap. */
  remaining: number;
  from: string;
  to: string;
}): CashPosition {
  const { expenses, settlements, budget, remaining, from, to } = input;

  let cashOut = 0;
  for (const expense of expenses) {
    if (expense.date < from || expense.date > to) continue;
    cashOut += summarizeExpense(expense).cashOut;
  }

  let settledNet = 0;
  for (const settlement of settlements) {
    if (settlement.date < from || settlement.date > to) continue;
    settledNet += settlement.direction === "received" ? settlement.amount : -settlement.amount;
  }

  const cashRemaining = budget - cashOut + settledNet;
  return {
    cashOut: snapZero(cashOut),
    cashRemaining: snapZero(cashRemaining),
    gap: snapZero(remaining - cashRemaining),
  };
}
