import { snapZero, summarizeExpense } from "@/lib/splits";
import type { Expense, PayChange, PayMethod } from "@/types";

export interface CardEntry {
  expense: Expense;
  /** What actually went on our card: the bill minus what someone else paid. */
  amount: number;
}

export interface CardBucket {
  entries: CardEntry[];
  total: number;
}

export interface CardPendingSummary {
  due: CardBucket;
  later: CardBucket;
  total: number;
}

// Satang precision, so sums like 0.1 + 0.2 do not show float dust.
function money(value: number): number {
  return snapZero(Math.round(value * 100) / 100);
}

function bucketOf(expenses: Expense[], pay: PayMethod): CardBucket {
  const entries = expenses
    .filter((e) => e.pay === pay)
    // Money fronted for others stays in: it was still swiped on our card.
    .map((expense) => ({ expense, amount: money(summarizeExpense(expense).cashOut) }))
    .filter((entry) => entry.amount > 0)
    .sort(
      (a, b) =>
        b.expense.date.localeCompare(a.expense.date) ||
        b.expense.createdAt.localeCompare(a.expense.createdAt)
    );
  return { entries, total: money(entries.reduce((sum, e) => sum + e.amount, 0)) };
}

/**
 * Card spending not yet moved into the bill account. Deliberately not limited
 * to a pay cycle: an amount stays here until it is marked as moved.
 */
export function summarizeCardPending(expenses: Expense[]): CardPendingSummary {
  const due = bucketOf(expenses, "card_due");
  const later = bucketOf(expenses, "card_later");
  return { due, later, total: money(due.total + later.total) };
}

/** Covers only the entries passed in, so a row that was not on screen is never
 *  marked as moved. */
export function markPaidChanges(bucket: CardBucket, today: string): PayChange[] {
  return bucket.entries.map(({ expense }) => ({
    id: expense.id,
    pay: expense.pay === "card_later" ? "card_later_paid" : "card_paid",
    paidAt: today,
  }));
}

/** Puts each entry back to the status it had. Take this before marking. */
export function restoreChanges(bucket: CardBucket): PayChange[] {
  return bucket.entries.map(({ expense }) => ({ id: expense.id, pay: expense.pay as PayMethod }));
}
