import { formatDateShort } from "@/lib/formatters";
import { CATEGORY_LABEL, type Category } from "@/lib/categories";

export interface ScopeLabelInput {
  from: string; // ISO YYYY-MM-DD, or "" for open-ended
  to: string;
  categories: Category[]; // empty means no category filter
  query: string;
}

/**
 * Spells out what the summary numbers cover, so a filtered total can never be
 * misread as the all-time one.
 *
 * Takes an options object rather than positional arguments: it is already on
 * its fourth input, all of them strings or string-ish, which is exactly the
 * shape where two of them get swapped at a call site and nothing complains.
 */
export function buildScopeLabel({ from, to, categories, query }: ScopeLabelInput): string {
  const parts: string[] = [];

  if (from && to) parts.push(`${formatDateShort(from)} – ${formatDateShort(to)}`);
  else if (from) parts.push(`ตั้งแต่ ${formatDateShort(from)}`);
  else if (to) parts.push(`ถึง ${formatDateShort(to)}`);
  else parts.push("ทั้งหมด");

  if (categories.length > 0) parts.push(categories.map((c) => CATEGORY_LABEL[c]).join(", "));

  const trimmedQuery = query.trim();
  if (trimmedQuery) parts.push(`ค้นหา "${trimmedQuery}"`);

  return parts.join(" · ");
}
