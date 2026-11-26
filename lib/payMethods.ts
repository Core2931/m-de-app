import type { Expense, PayChange, PayMethod, PayState } from "@/types";

// The card buttons of the picker, in order. card_later_paid has no button of
// its own: it shows as "โอนแล้ว".
export const CARD_PAYS: PayMethod[] = ["card_due", "card_paid", "card_later"];

export const PAY_METHODS: PayMethod[] = [...CARD_PAYS, "card_later_paid", "cash", "bank"];

export const PAY_LABEL: Record<PayMethod, string> = {
  card_due: "ต้องโอน",
  card_later: "สิ้นเดือน",
  card_paid: "โอนแล้ว",
  card_later_paid: "โอนแล้ว",
  cash: "เงินสด",
  bank: "โอนจ่าย",
};

export function isPayMethod(value: unknown): value is PayMethod {
  return typeof value === "string" && (PAY_METHODS as string[]).includes(value);
}

/** True when the card amount has been moved, so it carries a paidAt. */
export function isPaidPay(pay: PayMethod | null | undefined): boolean {
  return pay === "card_paid" || pay === "card_later_paid";
}

export function isCardPay(pay: PayMethod | undefined): boolean {
  return pay !== undefined && (CARD_PAYS.includes(pay) || isPaidPay(pay));
}

/** Which picker button stands for a stored value. */
export function pickerValue(pay: PayMethod | null): PayMethod | null {
  return pay === "card_later_paid" ? "card_paid" : pay;
}

/** What a tap on the edit form stores, given what the row already holds. */
export function choosePay(picked: PayMethod, stored: PayMethod | undefined): PayMethod {
  const monthEnd = stored === "card_later" || stored === "card_later_paid";
  return picked === "card_paid" && monthEnd ? "card_later_paid" : picked;
}

export type PayFilter = "all" | "card" | "cash" | "bank";

export const PAY_FILTERS: PayFilter[] = ["all", "card", "cash", "bank"];

export const PAY_FILTER_LABEL: Record<PayFilter, string> = {
  all: "ทั้งหมด",
  card: "บัตรเครดิต",
  cash: "เงินสด",
  bank: "โอนจ่าย",
};

/** Rows with nothing recorded show only under "all". */
export function matchesPayFilter(pay: PayMethod | undefined, filter: PayFilter): boolean {
  if (filter === "all") return true;
  if (filter === "card") return isCardPay(pay);
  return pay === filter;
}

/** The label used outside the picker, where "ต้องโอน" alone would not say it
 *  is about the card. */
export function payTag(pay: PayMethod): string {
  return isCardPay(pay) ? `บัตร · ${PAY_LABEL[pay]}` : PAY_LABEL[pay];
}

/**
 * What an edit leaves in the pay columns. A request with no `pay` comes from a
 * tab opened before this feature, so it must not wipe what is stored. The date
 * a card amount was transferred belongs to that transfer, not to later edits.
 */
export function mergePay(input: PayState, stored: PayState): PayState {
  const source = input.pay === undefined ? stored : input;
  if (!source.pay) return {};
  if (!isPaidPay(source.pay)) return { pay: source.pay };
  const paidAt = (isPaidPay(stored.pay) ? stored.paidAt : undefined) ?? source.paidAt;
  return paidAt ? { pay: source.pay, paidAt } : { pay: source.pay };
}

/** The same change the server makes, applied to what is already in memory. */
export function applyPayChanges(expenses: Expense[], changes: PayChange[]): Expense[] {
  const byId = new Map(changes.map((change) => [change.id, change]));
  return expenses.map((expense) => {
    const change = byId.get(expense.id);
    if (!change) return expense;
    const next: Expense = { ...expense, pay: change.pay };
    if (isPaidPay(change.pay) && change.paidAt) next.paidAt = change.paidAt;
    else delete next.paidAt;
    return next;
  });
}
