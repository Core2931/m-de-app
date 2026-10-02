import { toCategory } from "@/lib/categories";
import type { Expense } from "@/types";

// Column order of the `expenses` tab:
//   A id | B date | C item | D amount | E remark | F createdAt | G category | H payee
// Kept apart from lib/sheets.ts so the mapping can be tested without loading
// the Google client.

export function rowToExpense(row: string[]): Expense {
  // Legacy rows stop at F (no category) or G (no payee).
  const [id, date, item, amount, remark, createdAt, category, payee] = row;
  return {
    id,
    date,
    item,
    amount: Number(amount) || 0,
    remark: remark ?? "",
    createdAt,
    category: toCategory(category),
    ...(payee ? { payee } : {}),
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

/** Columns A:H — a brand-new row. */
export function expenseToRow(expense: Expense): string[] {
  return [...expenseToCoreRow(expense), expense.payee ?? ""];
}
