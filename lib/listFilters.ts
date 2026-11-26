import type { Category } from "@/lib/categories";
import type { PayFilter } from "@/lib/payMethods";

/**
 * How many choices are narrowing the list from inside the folded filter panel,
 * so the button can say so while the panel is closed. The date range is left
 * out: it always has a value, and the cycle buttons change it from outside.
 */
export function hiddenFilterCount({
  categories,
  pay,
}: {
  categories: Category[];
  pay: PayFilter;
}): number {
  return categories.length + (pay === "all" ? 0 : 1);
}
