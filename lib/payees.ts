import type { Category } from "@/lib/categories";
import { editDistance } from "@/lib/utils";
import type { Expense } from "@/types";

// Below this a "name" is OCR debris, and one edit would match anything.
const MIN_LENGTH = 3;
// Share of the longer name that may differ. Wide enough for the OCR slips we
// have seen (a dropped tone mark is already normalized away; a misread branch
// code costs an edit or two), narrow enough that two shops stay two shops.
const TOLERANCE = 0.2;

export interface PayeeSuggestion {
  item: string;
  category: Category;
}

/**
 * Reduces a shop name to the letters OCR gets right most of the time. What it
 * drops is exactly what it gets wrong: marks above and below the line
 * ("คาเฟ่" read as "คาเฟ"), digits ("P3821" read as "23821"), spacing and
 * punctuation.
 */
export function normalizePayee(name: string): string {
  return name
    .toLowerCase()
    .replace(/[ัิ-ฺ็-๎]/g, "")
    .replace(/[^a-zก-ะาำเ-ๆ]/g, "");
}

function isNewer(a: Expense, b: Expense): boolean {
  return a.date !== b.date ? a.date > b.date : a.createdAt > b.createdAt;
}

/**
 * What this shop was filed as last time, or null when we cannot tell.
 *
 * Derived from the expenses themselves rather than a stored mapping, so there
 * is nothing to keep in sync: correcting the latest expense of a shop corrects
 * the next suggestion.
 */
export function suggestFromPayee(payee: string, expenses: Expense[]): PayeeSuggestion | null {
  const target = normalizePayee(payee);
  if (target.length < MIN_LENGTH) return null;

  // Latest expense per shop, keyed on the normalized name.
  const latest = new Map<string, Expense>();
  for (const expense of expenses) {
    if (!expense.payee) continue;
    const key = normalizePayee(expense.payee);
    if (key.length < MIN_LENGTH) continue;
    const current = latest.get(key);
    if (!current || isNewer(expense, current)) latest.set(key, expense);
  }

  let best: Expense | null = null;
  let bestDistance = Infinity;
  let tied = false;

  for (const [key, expense] of latest) {
    const allowed = Math.max(1, Math.floor(Math.max(key.length, target.length) * TOLERANCE));
    const distance = editDistance(target, key, allowed);
    if (distance > allowed) continue;

    if (distance < bestDistance) {
      best = expense;
      bestDistance = distance;
      tied = false;
    } else if (distance === bestDistance) {
      tied = true;
    }
  }

  // Two equally-near shops means we do not know which one this is; a wrong
  // prefill is worse than an empty field.
  if (!best || tied) return null;
  return { item: best.item, category: best.category };
}
