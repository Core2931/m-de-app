import { snapZero, summarizeExpense } from "@/lib/splits";
import type { Expense, PeriodSummary, PersonPeriodTotal, SplitEntry } from "@/types";

/**
 * Rolls a filtered slice of expenses up into "what did this range cost me, and
 * who owes me for it" — the question the List screen's date/category filters
 * are actually asked in service of.
 *
 * Deliberately takes only expenses, no settlements: see PersonPeriodTotal.
 * Deliberately drops nobody either, unlike buildPersonBalances — a person who
 * lent and borrowed the same amount inside the range nets to zero but still
 * appears, because "we're even for August" is a real answer and vanishing from
 * the list reads as "no shared spending at all".
 */
export function summarizePeriod(expenses: Expense[]): PeriodSummary {
  const byPerson = new Map<string, PersonPeriodTotal>();
  let total = 0;
  let lentOut = 0;
  let borrowed = 0;

  for (const expense of expenses) {
    const summary = summarizeExpense(expense);
    total += expense.amount;
    lentOut += summary.lentOut;
    borrowed += summary.borrowed;

    for (const split of summary.splits) {
      let person = byPerson.get(split.person);
      if (!person) {
        person = { person: split.person, lentOut: 0, borrowed: 0, net: 0, entries: [] };
        byPerson.set(split.person, person);
      }
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

  const people: PersonPeriodTotal[] = [];
  for (const person of byPerson.values()) {
    person.net = snapZero(person.lentOut - person.borrowed);
    person.entries.sort((a, b) => b.date.localeCompare(a.date));
    people.push(person);
  }

  // Biggest outstanding first — that is the row you act on when clearing.
  // Gross breaks ties so an even-but-busy person outranks an idle one, and the
  // name breaks the rest so the order does not shuffle between renders.
  people.sort(
    (a, b) =>
      Math.abs(b.net) - Math.abs(a.net) ||
      b.lentOut + b.borrowed - (a.lentOut + a.borrowed) ||
      a.person.localeCompare(b.person, "th")
  );

  return {
    total: snapZero(total),
    lentOut: snapZero(lentOut),
    borrowed: snapZero(borrowed),
    myShare: snapZero(total - lentOut),
    people,
  };
}
