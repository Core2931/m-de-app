import type { Expense } from "@/types";

// Zero-width space, written as an escape because the literal character is
// invisible in an editor and the next person would delete it by accident.
// Thai text pasted from the web or LINE routinely carries it as a soft word
// break, so a stored "ข้าว<ZWSP>เที่ยง" would never match a typed
// "ข้าวเที่ยง". Strip it from both sides rather than from the sheet.
const ZERO_WIDTH = /\u200B/g;

/**
 * NFC because the same Thai string can arrive in more than one encoding.
 *
 * Known limit, deliberately not solved: NFC does not reorder Thai vowels and
 * tone marks. สระ typed before วรรณยุกต์ and the reverse are distinct code
 * point sequences and will not match each other. A reorderer would have to
 * encode Thai orthography rules and gets it wrong more often than it helps.
 *
 * toLowerCase() takes no locale on purpose — Thai is caseless so it is a no-op
 * there, and passing one would expose Latin text to the Turkish dotless-i rule.
 */
export function normalizeSearchText(value: string): string {
  return (value ?? "")
    .normalize("NFC")
    .replace(ZERO_WIDTH, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** Whitespace-separated terms. An empty query yields [] — "match everything". */
export function parseQuery(query: string): string[] {
  const normalized = normalizeSearchText(query);
  if (!normalized) return [];
  return normalized.split(" ").filter(Boolean);
}

/**
 * AND across terms, substring within each.
 *
 * Substring rather than tokenized matching because Thai has no word
 * boundaries: a \b regex or a whitespace tokenizer would fail on most of this
 * corpus. Splitting the QUERY on spaces still gives Latin text the tokenized
 * feel — "ข้าว ขนม" means both appear, in any order — without hurting Thai.
 *
 * The haystack is the item plus the remark joined by a newline, which
 * normalizes to a space — and since terms are split ON spaces, no single term
 * can ever span that seam. The category label is deliberately excluded: typing
 * "อาหาร" returning every food row is surprising when the category chips sit
 * directly above the search box.
 */
export function matchesQuery(expense: Expense, terms: string[]): boolean {
  if (terms.length === 0) return true;
  const haystack = normalizeSearchText(`${expense.item}\n${expense.remark ?? ""}`);
  return terms.every((term) => haystack.includes(term));
}
