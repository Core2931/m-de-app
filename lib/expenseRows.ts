import { toCategory } from "@/lib/categories";
import { isISODate } from "@/lib/isoDays";
import { isPaidPay, isPayMethod } from "@/lib/payMethods";
import type { Expense, PayState } from "@/types";

// Column order of the `expenses` tab:
//   A id | B date | C item | D amount | E remark | F createdAt | G category | H payee
//   I pay | J paidAt
// Kept apart from lib/sheets.ts so the mapping can be tested without loading
// the Google client.

/** Reads the I and J cells. Anything unrecognised counts as "not recorded". */
export function readPayState(pay: unknown, paidAt: unknown): PayState {
  if (!isPayMethod(pay)) return {};
  if (isPaidPay(pay) && typeof paidAt === "string" && isISODate(paidAt)) {
    return { pay, paidAt };
  }
  return { pay };
}

export function rowToExpense(row: string[]): Expense {
  // Legacy rows stop at F (no category), G (no payee) or H (no pay).
  const [id, date, item, amount, remark, createdAt, category, payee, pay, paidAt] = row;
  return {
    id,
    date,
    item,
    amount: Number(amount) || 0,
    remark: remark ?? "",
    createdAt,
    category: toCategory(category),
    ...(payee ? { payee } : {}),
    ...readPayState(pay, paidAt),
  };
}

/** Columns A:G — what an edit rewrites. H is left out on purpose: the edit
 *  form does not know about the payee, and writing a blank over it would
 *  erase what the slip taught us about that shop. */
export function expenseToCoreRow(expense: Expense): string[] {
  return [
    expense.id,
    expense.date,
    expense.item,
    String(expense.amount),
    expense.remark ?? "",
    expense.createdAt,
    expense.category,
  ];
}

/** Columns I:J as plain values, for a RAW write. */
export function expenseToPayCells(state: PayState): [string, string] {
  return [state.pay ?? "", state.paidAt ?? ""];
}

/** Columns A:J — a brand-new row, written USER_ENTERED. */
export function expenseToRow(expense: Expense): string[] {
  const [pay, paidAt] = expenseToPayCells(expense);
  // The apostrophe keeps Sheets from turning the date into a date cell, which
  // could read back in another format. It is not stored as part of the text.
  return [...expenseToCoreRow(expense), expense.payee ?? "", pay, paidAt && `'${paidAt}`];
}
