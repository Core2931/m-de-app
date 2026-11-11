import Link from "next/link";
import Avatar from "@/components/ui/Avatar";
import { formatCurrency } from "@/lib/formatters";
import type { OutstandingKind } from "@/lib/outstanding";
import { summarizeExpense } from "@/lib/splits";
import type { Expense } from "@/types";

interface ExpenseRowProps {
  expense: Expense;
  /** Money still open on this expense, if any. */
  outstanding?: OutstandingKind;
  /** A line under the name, e.g. the date when rows are not grouped by day. */
  note?: string;
}

export default function ExpenseRow({ expense, outstanding, note }: ExpenseRowProps) {
  const summary = summarizeExpense(expense);
  const hasSplit = summary.splits.length > 0;

  return (
    <Link
      href={`/expenses/${expense.id}`}
      className="flex items-center gap-3 py-3 transition-transform active:scale-[0.98]"
    >
      <Avatar category={expense.category} size={34} />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className="truncate text-[15px] font-medium text-text">{expense.item}</span>
          {outstanding && (
            <span
              role="img"
              aria-label={outstanding === "owed" ? "ยังมีคนค้างเรา" : "เรายังค้างเขา"}
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ background: outstanding === "owed" ? "var(--accent)" : "var(--expense)" }}
            />
          )}
        </span>
        {note && <span className="block text-[12px] text-sub">{note}</span>}
      </span>
      {summary.invalid && <span className="text-[13px] text-expense">⚠</span>}
      {hasSplit && (
        <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-medium text-accent">
          ของฉัน {formatCurrency(summary.myShare)}
        </span>
      )}
      <span className="text-[15px] font-semibold text-text">
        {formatCurrency(expense.amount)}
      </span>
    </Link>
  );
}
