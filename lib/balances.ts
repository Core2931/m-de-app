import { summarizeExpense } from "@/lib/splits";
import type {
  BalanceTotals,
  Expense,
  PersonBalance,
  Settlement,
  SplitEntry,
} from "@/types";

// Balances below this are treated as settled — guards against float drift
// from decimal amounts (e.g. 0.1 + 0.2).
const EPSILON = 0.005;

export function buildPersonBalances(
  expenses: Expense[],
  settlements: Settlement[]
): PersonBalance[] {
  const byPerson = new Map<string, PersonBalance>();

  function ensure(person: string): PersonBalance {
    let entry = byPerson.get(person);
    if (!entry) {
      entry = { person, balance: 0, lentOut: 0, borrowed: 0, settledNet: 0, entries: [] };
      byPerson.set(person, entry);
    }
    return entry;
  }

  for (const expense of expenses) {
    const summary = summarizeExpense(expense);
    for (const split of summary.splits) {
      const person = ensure(split.person);
      if (split.direction === "owed_to_me") person.lentOut += split.amount;
      else person.borrowed += split.amount;
      const entry: SplitEntry = {
        expenseId: expense.id,
        date: expense.date,
        item: expense.item,
        split,
      };
      person.entries.push(entry);
    }
  }

  for (const settlement of settlements) {
    const person = ensure(settlement.person);
    person.settledNet +=
      settlement.direction === "received" ? settlement.amount : -settlement.amount;
  }

  const result: PersonBalance[] = [];
  for (const person of byPerson.values()) {
    person.balance = person.lentOut - person.borrowed - person.settledNet;
    if (Math.abs(person.balance) < EPSILON) continue;
    person.entries.sort((a, b) => b.date.localeCompare(a.date));
    result.push(person);
  }

  return result.sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance));
}

export function summarizeBalances(balances: PersonBalance[]): BalanceTotals {
  let reserved = 0;
  let receivable = 0;
  for (const { balance } of balances) {
    if (balance < 0) reserved += -balance;
    else receivable += balance;
  }
  return { reserved, receivable };
}
