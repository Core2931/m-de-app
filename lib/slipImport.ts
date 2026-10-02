import { DEFAULT_CATEGORY, type Category } from "@/lib/categories";
import { suggestFromPayee } from "@/lib/payees";
import type { SlipRead } from "@/lib/slipParse";
import type { Expense, NewExpense } from "@/types";

/** One slip on the review list. `amount` stays text because it is bound to an
 *  input the user may be halfway through editing. */
export interface SlipRow {
  id: string;
  fileName: string;
  date: string; // YYYY-MM-DD
  amount: string;
  item: string;
  category: Category;
  payee: string; // "" when the slip gave no shop name
  /** The slip's date could not be read, so today was filled in. */
  dateGuessed: boolean;
  /** The file could not be read at all; every field is the user's to fill. */
  readError: boolean;
}

export interface SaveOutcome {
  savedIds: string[];
  error: string | null;
}

/**
 * Turns what OCR found (or null when the file could not be read) into an
 * editable row, prefilled from how that shop was filed before.
 */
export function buildSlipRow(
  id: string,
  fileName: string,
  read: SlipRead | null,
  expenses: Expense[],
  today: string
): SlipRow {
  const payee = read?.payee ?? "";
  const suggestion = payee ? suggestFromPayee(payee, expenses) : null;
  return {
    id,
    fileName,
    date: read?.date ?? today,
    amount: read?.amount != null ? String(read.amount) : "",
    item: suggestion?.item ?? "",
    category: suggestion?.category ?? DEFAULT_CATEGORY,
    payee,
    // An unreadable file gets its own, louder label instead of this one.
    dateGuessed: read !== null && read.date === null,
    readError: read === null,
  };
}

function parseAmount(text: string): number | null {
  if (text.trim() === "") return null;
  const value = Number(text);
  return Number.isFinite(value) && value > 0 ? value : null;
}

/** Mirrors what validateExpenseInput will accept, so nothing reaches the API
 *  only to be rejected halfway through a batch. */
export function isRowReady(row: SlipRow): boolean {
  return (
    row.item.trim() !== "" &&
    parseAmount(row.amount) !== null &&
    /^\d{4}-\d{2}-\d{2}$/.test(row.date)
  );
}

/**
 * Rows that look like something already recorded: same date and amount as a
 * saved expense, or as another row in this batch (the same slip picked twice).
 * A warning, never a block — two ฿60 lunches on one day are real.
 */
export function findDuplicateIds(rows: SlipRow[], expenses: Expense[]): Set<string> {
  const keyOf = (date: string, amount: number) => `${date}|${amount}`;
  const recorded = new Set(expenses.map((e) => keyOf(e.date, e.amount)));

  const keyByRow = new Map<string, string>();
  const seen = new Map<string, number>();
  for (const row of rows) {
    const amount = parseAmount(row.amount);
    if (amount === null) continue;
    const key = keyOf(row.date, amount);
    keyByRow.set(row.id, key);
    seen.set(key, (seen.get(key) ?? 0) + 1);
  }

  const duplicates = new Set<string>();
  for (const [id, key] of keyByRow) {
    if (recorded.has(key) || (seen.get(key) ?? 0) > 1) duplicates.add(id);
  }
  return duplicates;
}

export function rowToNewExpense(row: SlipRow): NewExpense {
  const payee = row.payee.trim();
  return {
    date: row.date,
    item: row.item.trim(),
    amount: Number(row.amount),
    // Splits are not entered here; a row that needs one is edited afterwards.
    remark: "",
    category: row.category,
    ...(payee ? { payee } : {}),
  };
}

/**
 * Saves rows one after another and stops at the first failure.
 *
 * Sequential on purpose: overlapping appends to a sheet can land on the same
 * row. Reporting exactly which ids made it lets the caller drop those and
 * keep the rest, so pressing save again never files a row twice.
 */
export async function saveRows(
  rows: SlipRow[],
  add: (input: NewExpense) => Promise<void>
): Promise<SaveOutcome> {
  const savedIds: string[] = [];
  for (const row of rows) {
    try {
      await add(rowToNewExpense(row));
      savedIds.push(row.id);
    } catch (err) {
      return { savedIds, error: err instanceof Error ? err.message : "บันทึกไม่สำเร็จ" };
    }
  }
  return { savedIds, error: null };
}
