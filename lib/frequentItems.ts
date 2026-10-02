import type { Category } from "@/lib/categories";
import type { Expense } from "@/types";

// Long enough to catch a weekly habit a few times over, short enough that
// something given up two months ago stops taking a chip.
const WINDOW_DAYS = 60;
// Saved once is a one-off, not a habit.
const MIN_COUNT = 2;

export interface FrequentItem {
  item: string; // trimmed
  category: Category;
  amount: number; // from the most recent entry
  count: number; // entries inside the window
  lastDate: string; // most recent expense date
}

function windowStart(today: string): string {
  // Parsed and printed as UTC so the arithmetic cannot drift across a
  // local-timezone midnight — `today` is already a calendar date.
  const d = new Date(today + "T00:00:00.000Z");
  d.setUTCDate(d.getUTCDate() - WINDOW_DAYS);
  return d.toISOString().slice(0, 10);
}

function isNewer(a: Expense, b: Expense): boolean {
  return a.date !== b.date ? a.date > b.date : a.createdAt > b.createdAt;
}

/**
 * Items saved repeatedly in the last WINDOW_DAYS, most-used first — the
 * source for the quick-add chips on the new-expense form.
 *
 * Grouped on the exact (trimmed) item name. No fuzzy matching: "กาแฟ" and
 * "กาแฟเย็น" are different purchases, and merging them would prefill the
 * wrong amount.
 */
export function buildFrequentItems(expenses: Expense[], today: string): FrequentItem[] {
  const from = windowStart(today);
  const groups = new Map<string, Expense[]>();

  for (const expense of expenses) {
    if (expense.date < from) continue;
    const name = expense.item.trim();
    if (!name) continue;
    const group = groups.get(name);
    if (group) group.push(expense);
    else groups.set(name, [expense]);
  }

  const items: FrequentItem[] = [];
  for (const [name, group] of groups) {
    if (group.length < MIN_COUNT) continue;

    const latest = group.reduce((a, b) => (isNewer(b, a) ? b : a));

    // Most-picked category rather than the latest one, so a single mis-tap
    // does not drag the chip with it. The latest entry breaks a tie.
    const picks = new Map<Category, number>();
    for (const e of group) picks.set(e.category, (picks.get(e.category) ?? 0) + 1);
    let category = latest.category;
    for (const [candidate, n] of picks) {
      if (n > (picks.get(category) ?? 0)) category = candidate;
    }

    items.push({
      item: name,
      category,
      amount: latest.amount,
      count: group.length,
      lastDate: latest.date,
    });
  }

  return items.sort(
    (a, b) =>
      b.count - a.count ||
      b.lastDate.localeCompare(a.lastDate) ||
      a.item.localeCompare(b.item, "th")
  );
}
