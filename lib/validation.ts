import type { NewExpense } from "@/types";
import { toCategory } from "@/lib/categories";

export function validateExpenseInput(body: unknown): NewExpense | null {
  if (typeof body !== "object" || body === null) return null;
  const { date, item, amount, remark, category } = body as Record<string, unknown>;

  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  if (typeof item !== "string" || item.trim() === "") return null;
  if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0) return null;

  return {
    date,
    item: item.trim(),
    amount,
    remark: typeof remark === "string" ? remark.trim() : "",
    // Unknown/legacy payloads fall back to the default category.
    category: toCategory(category),
  };
}
