import type { Expense, PayMethod } from "@/types";

const DEFAULT_PAY: PayMethod = "card_due";

/**
 * How this item was paid last time, matched on the exact trimmed name (the same
 * rule as the quick-add chips: no fuzzy matching).
 *
 * "Already transferred" is never carried forward: picking it automatically
 * would keep an unpaid swipe off the card total without anyone noticing.
 */
export function rememberedPay(expenses: Expense[], item: string): PayMethod {
  const name = item.trim();
  if (!name) return DEFAULT_PAY;

  let latest: Expense | undefined;
  for (const expense of expenses) {
    if (!expense.pay || expense.item.trim() !== name) continue;
    if (
      !latest ||
      expense.date > latest.date ||
      (expense.date === latest.date && expense.createdAt > latest.createdAt)
    ) {
      latest = expense;
    }
  }

  if (!latest?.pay || latest.pay === "card_paid") return DEFAULT_PAY;
  // A month-end item that has since been paid is still a month-end item.
  // Picking card_later keeps the new amount on the card total.
  return latest.pay === "card_later_paid" ? "card_later" : latest.pay;
}
