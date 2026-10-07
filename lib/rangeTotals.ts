import { summarizeExpense } from "@/lib/splits";
import type { Expense } from "@/types";

// Totals over an inclusive date range. ISO dates compare correctly as
// strings, so no parsing is needed. Lives in lib/ rather than beside the
// other selectors in the store because that is where this project's tests
// are collected from.

function inRange(expense: Expense, from: string, to: string): boolean {
  return expense.date >= from && expense.date <= to;
}

/** Every baht that went through the expenses dated `from`..`to`, inclusive. */
export function totalForRange(expenses: Expense[], from: string, to: string): number {
  return expenses.filter((e) => inRange(e, from, to)).reduce((sum, e) => sum + e.amount, 0);
}

/** What those expenses really cost us — the same myShare as everywhere else
 *  in the app (amount minus what was fronted for other people). */
export function myShareForRange(expenses: Expense[], from: string, to: string): number {
  return expenses
    .filter((e) => inRange(e, from, to))
    .reduce((sum, e) => sum + summarizeExpense(e).myShare, 0);
}
