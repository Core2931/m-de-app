import type { NewExpense, NewSettlement, PayChange, PayState } from "@/types";
import { toCategory } from "@/lib/categories";
import { normalizePerson } from "@/lib/splits";
import { hasPlaceholderPerson } from "@/lib/evenSplit";
import { MONTH_RE } from "@/lib/budgets";
import { isISODate } from "@/lib/isoDays";
import { isCardPay, isPaidPay, isPayMethod } from "@/lib/payMethods";

const MAX_PAYEE_LENGTH = 100;
// Far more than a month of card swipes; stops one request rewriting the sheet.
const MAX_PAY_CHANGES = 500;

/**
 * Null means the pair is unusable. An unrecognised `pay` is not: it reads as
 * "not sent", which keeps whatever the row already holds.
 */
function parsePayState(pay: unknown, paidAt: unknown): PayState | null {
  if (!isPayMethod(pay)) return {};
  if (!isPaidPay(pay)) return { pay };
  if (typeof paidAt !== "string" || !isISODate(paidAt)) return null;
  return { pay, paidAt };
}

export function validateExpenseInput(body: unknown): NewExpense | null {
  if (typeof body !== "object" || body === null) return null;
  const { date, item, amount, remark, category, payee, pay, paidAt } = body as Record<
    string,
    unknown
  >;

  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  if (typeof item !== "string" || item.trim() === "") return null;
  if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0) return null;
  // The forms already block this, but a "?" reaching the sheet would become a
  // permanent phantom person in the /people balances. Making it an invariant
  // here means a stale tab or a direct POST cannot get past it either.
  if (typeof remark === "string" && hasPlaceholderPerson(remark)) return null;

  const payState = parsePayState(pay, paidAt);
  if (!payState) return null;

  // Payee is OCR output, so it gets cleaned rather than rejected: a slip with
  // a garbled shop name is still a real expense. The leading-character strip
  // matters because rows are written USER_ENTERED — "=..." would be a formula.
  const cleanPayee =
    typeof payee === "string"
      ? payee.replace(/^[=+\-@\s]+/, "").trim().slice(0, MAX_PAYEE_LENGTH)
      : "";

  return {
    date,
    item: item.trim(),
    amount,
    remark: typeof remark === "string" ? remark.trim() : "",
    // Unknown/legacy payloads fall back to the default category.
    category: toCategory(category),
    // Key left off entirely when absent, so hand-typed rows stay payee-less.
    ...(cleanPayee ? { payee: cleanPayee } : {}),
    ...payState,
  };
}

/**
 * The body of a batch status change. All or nothing: a batch that is partly
 * wrong would leave the card total showing a mix nobody asked for.
 */
export function validatePayChanges(body: unknown): PayChange[] | null {
  if (typeof body !== "object" || body === null) return null;
  const { changes } = body as Record<string, unknown>;
  if (!Array.isArray(changes) || changes.length === 0 || changes.length > MAX_PAY_CHANGES) {
    return null;
  }

  const result: PayChange[] = [];
  const seen = new Set<string>();
  for (const change of changes) {
    if (typeof change !== "object" || change === null) return null;
    const { id, pay, paidAt } = change as Record<string, unknown>;
    if (typeof id !== "string" || id === "" || seen.has(id)) return null;
    const state = parsePayState(pay, paidAt);
    if (!state?.pay || !isCardPay(state.pay)) return null;
    seen.add(id);
    result.push({ id, ...state, pay: state.pay });
  }
  return result;
}

export interface BudgetInput {
  month: string;
  /** null clears the budget for that month. */
  amount: number | null;
}

export function validateBudgetInput(body: unknown): BudgetInput | null {
  if (typeof body !== "object" || body === null) return null;
  const { month, amount } = body as Record<string, unknown>;

  if (typeof month !== "string" || !MONTH_RE.test(month)) return null;
  // Explicit null is how the UI clears a budget — distinct from a bad value.
  if (amount === null) return { month, amount: null };
  if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0) return null;
  // Nothing sensible is this large, and it would break the progress bar layout.
  if (amount > 1e9) return null;

  return { month, amount: Math.round(amount * 100) / 100 };
}

export function validateSettlementInput(body: unknown): NewSettlement | null {
  if (typeof body !== "object" || body === null) return null;
  const { date, person, amount, direction, note } = body as Record<string, unknown>;

  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  if (typeof person !== "string") return null;
  const normalized = normalizePerson(person);
  if (normalized === "") return null;
  if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0) return null;
  if (direction !== "received" && direction !== "paid") return null;

  return {
    date,
    person: normalized,
    amount,
    direction,
    note: typeof note === "string" ? note.trim() : "",
  };
}
