import { buildPersonBalances } from "@/lib/balances";
import { summarizeExpense } from "@/lib/splits";
import type { Expense, Settlement } from "@/types";

/** Who the open money is with: they owe us, or we owe them. */
export type OutstandingKind = "owed" | "owe";

/**
 * Which expenses still have money open on them.
 *
 * Balances are kept per person, not per expense, so there is no telling which
 * of a person's expenses a repayment cleared. Every expense that involves
 * someone with a non-zero balance is therefore marked, which can include one
 * that was in fact settled while a newer one was not. Good enough to answer
 * "what is still hanging", not to audit a single line.
 *
 * Marked "owed" when anyone involved owes us, "owe" when it is only us owing.
 */
export function outstandingByExpense(
  expenses: Expense[],
  settlements: Settlement[]
): Map<string, OutstandingKind> {
  const balances = new Map<string, number>();
  for (const person of buildPersonBalances(expenses, settlements)) {
    balances.set(person.person, person.balance);
  }

  const result = new Map<string, OutstandingKind>();
  for (const expense of expenses) {
    let kind: OutstandingKind | null = null;
    for (const split of summarizeExpense(expense).splits) {
      const balance = balances.get(split.person);
      if (balance === undefined) continue;
      if (balance > 0) {
        kind = "owed";
        break;
      }
      kind = "owe";
    }
    if (kind) result.set(expense.id, kind);
  }
  return result;
}
