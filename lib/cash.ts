import { snapZero, summarizeExpense } from "@/lib/splits";
import type { Expense, Settlement } from "@/types";

/**
 * What really left our pocket in a date range, net of repayments: the cash
 * view of "spent", next to the budget's myShare view.
 *
 * myShare assumes money fronted for other people is already back. Until it is,
 * the account is lower than the budget says: pay ฿7,000, of which ฿1,000 was
 * for a friend, and myShare is ฿6,000 while cash spent is ฿7,000. Settlements
 * dated in the range move cash in or out, so the two figures meet as people
 * pay back. When someone else paid for us the cash figure is the lower one.
 *
 * Unlike the person balances, a settlement is counted even if its expense is
 * gone: money that moved is money that moved.
 */
export function cashSpent(input: {
  expenses: Expense[];
  settlements: Settlement[];
  from: string;
  to: string;
}): number {
  const { expenses, settlements, from, to } = input;

  let spent = 0;
  for (const expense of expenses) {
    if (expense.date < from || expense.date > to) continue;
    spent += summarizeExpense(expense).cashOut;
  }

  for (const settlement of settlements) {
    if (settlement.date < from || settlement.date > to) continue;
    spent += settlement.direction === "received" ? -settlement.amount : settlement.amount;
  }

  return snapZero(spent);
}
