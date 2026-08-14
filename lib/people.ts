import { normalizePerson, parseRemark } from "@/lib/splits";
import type { Expense } from "@/types";

export interface KnownPerson {
  person: string; // already normalized
  count: number; // how many splits mention them
  lastDate: string; // most recent expense date they appear on
}

/**
 * Everyone who has ever appeared in a split, most-used first.
 *
 * Names go through normalizePerson, the same function parseRemark uses, so
 * "ขนมจ่าย" and "ขนม" collapse into the one person they actually are — the
 * จ่าย suffix only marks direction.
 */
export function buildKnownPeople(expenses: Expense[]): KnownPerson[] {
  const byName = new Map<string, KnownPerson>();

  for (const expense of expenses) {
    for (const split of parseRemark(expense.remark).splits) {
      const existing = byName.get(split.person);
      if (existing) {
        existing.count += 1;
        if (expense.date > existing.lastDate) existing.lastDate = expense.date;
      } else {
        byName.set(split.person, {
          person: split.person,
          count: 1,
          lastDate: expense.date,
        });
      }
    }
  }

  return [...byName.values()].sort(
    (a, b) =>
      b.count - a.count ||
      b.lastDate.localeCompare(a.lastDate) ||
      a.person.localeCompare(b.person, "th")
  );
}

export function isKnownPerson(name: string, known: KnownPerson[]): boolean {
  const normalized = normalizePerson(name);
  if (!normalized) return false;
  return known.some((k) => k.person === normalized);
}

/** Levenshtein distance, capped — we only ever care about "1 or 2 edits". */
function editDistance(a: string, b: string, cap: number): number {
  // Thai is entirely in the BMP, so UTF-16 units are code points here.
  // Combining vowels and tone marks count separately, which slightly inflates
  // distances between marked syllables — harmless for typo detection, and the
  // length guard in nearestPerson keeps it from firing on unrelated names.
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    let best = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      const value = Math.min(row[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
      row.push(value);
      if (value < best) best = value;
    }
    if (best > cap) return cap + 1; // cannot come back down
    prev = row;
  }
  return prev[b.length];
}

/**
 * The known name a typo most likely meant, or null when we cannot tell.
 *
 * Informational only — the caller must never rewrite the remark with this.
 * Real people have near-identical names (ป้อม / ต้อม), and silently correcting
 * one into the other moves real money onto the wrong person's balance.
 */
export function nearestPerson(name: string, known: KnownPerson[]): string | null {
  const target = normalizePerson(name);
  if (!target) return null;

  // Short names are mostly-distinct at one edit; longer ones can absorb two.
  const allowed = target.length <= 4 ? 1 : 2;

  let best: string | null = null;
  let bestDistance = Infinity;
  let tied = false;

  for (const candidate of known) {
    if (candidate.person === target) return null; // not a typo at all
    // A name seen exactly once has no authority — it is at least as likely to
    // be the typo itself, and suggesting it would launder a mistake into a
    // convention.
    if (candidate.count < 2) continue;
    if (Math.abs(candidate.person.length - target.length) > 1) continue;

    const distance = editDistance(target, candidate.person, allowed);
    if (distance > allowed) continue;

    if (distance < bestDistance) {
      bestDistance = distance;
      best = candidate.person;
      tied = false;
    } else if (distance === bestDistance) {
      tied = true;
    }
  }

  // Two equally-near candidates means we do not know which was meant.
  return tied ? null : best;
}
