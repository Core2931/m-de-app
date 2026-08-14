import type { NewExpense, NewSettlement } from "@/types";
import { toCategory } from "@/lib/categories";
import { normalizePerson } from "@/lib/splits";
import { hasPlaceholderPerson } from "@/lib/evenSplit";
import { MONTH_RE } from "@/lib/budgets";

export function validateExpenseInput(body: unknown): NewExpense | null {
  if (typeof body !== "object" || body === null) return null;
  const { date, item, amount, remark, category } = body as Record<string, unknown>;

  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  if (typeof item !== "string" || item.trim() === "") return null;
  if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0) return null;
  // The forms already block this, but a "?" reaching the sheet would become a
  // permanent phantom person in the /people balances. Making it an invariant
  // here means a stale tab or a direct POST cannot get past it either.
  if (typeof remark === "string" && hasPlaceholderPerson(remark)) return null;

  return {
    date,
    item: item.trim(),
    amount,
    remark: typeof remark === "string" ? remark.trim() : "",
    // Unknown/legacy payloads fall back to the default category.
    category: toCategory(category),
  };
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
