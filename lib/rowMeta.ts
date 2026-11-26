import { CATEGORY_LABEL, type Category } from "@/lib/categories";
import { payTag } from "@/lib/payMethods";
import type { PayMethod } from "@/types";

/**
 * The line under an expense name. The category is always spelled out: its dot
 * is only a colour, which on its own does not name anything.
 */
export function rowMeta(
  expense: { category: Category; pay?: PayMethod },
  note?: string
): string {
  return [note, CATEGORY_LABEL[expense.category], expense.pay && payTag(expense.pay)]
    .filter(Boolean)
    .join(" · ");
}
