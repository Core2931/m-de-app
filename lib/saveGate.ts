import { rememberedPay } from "@/lib/payMemory";
import type { Expense, PayMethod } from "@/types";

/** Whether the past entries, which the pay choice is remembered from, are here. */
export type HistoryState = "ready" | "loading" | "failed";

export function historyState(store: { isLoaded: boolean; error: string | null }): HistoryState {
  if (store.isLoaded) return "ready";
  return store.error ? "failed" : "loading";
}

/**
 * Without the history every name looks new and would be saved as a bank
 * transfer, dropping a card swipe from the card total. So: wait while it loads,
 * and if it cannot load, accept only a choice that was tapped.
 */
export function canSave(history: HistoryState, pickedPay: PayMethod | null): boolean {
  if (history === "failed") return pickedPay !== null;
  return history === "ready";
}

/** What the picker shows. Null when there is nothing to base a choice on. */
export function shownPay(
  history: HistoryState,
  pickedPay: PayMethod | null,
  expenses: Expense[],
  item: string
): PayMethod | null {
  if (pickedPay) return pickedPay;
  return history === "failed" ? null : rememberedPay(expenses, item);
}
