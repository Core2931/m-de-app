"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import {
  markPaidChanges,
  restoreChanges,
  summarizeCardPending,
  type CardBucket,
} from "@/lib/cardPending";
import { formatCurrency, formatDateShort, todayISO } from "@/lib/formatters";
import type { Expense, PayChange } from "@/types";

const UNDO_MS = 8000;

type BucketKey = "due" | "later";

const BUCKETS: { key: BucketKey; title: string }[] = [
  { key: "due", title: "ต้องโอนเลย" },
  { key: "later", title: "รอโอนสิ้นเดือน" },
];

interface Undo {
  changes: PayChange[];
  total: number;
}

interface CardPendingProps {
  expenses: Expense[];
  onChange: (changes: PayChange[]) => Promise<void>;
  /** Called after a failure, when what is on screen may no longer be true. */
  onReload: () => void;
}

export default function CardPending({ expenses, onChange, onReload }: CardPendingProps) {
  const [open, setOpen] = useState<Record<BucketKey, boolean>>({ due: false, later: false });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [undo, setUndo] = useState<Undo | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  const pending = summarizeCardPending(expenses);
  const hasPending = pending.due.entries.length + pending.later.entries.length > 0;

  function startDismissTimer() {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setUndo(null);
      setError(null);
    }, UNDO_MS);
  }

  function fail(err: unknown) {
    setError(err instanceof Error ? err.message : "บันทึกไม่สำเร็จ");
    startDismissTimer();
    onReload();
  }

  async function markPaid(bucket: CardBucket) {
    // Taken first: once the change lands, the bucket no longer holds these.
    const next: Undo = { changes: restoreChanges(bucket), total: bucket.total };
    setBusy(true);
    setError(null);
    try {
      await onChange(markPaidChanges(bucket, todayISO()));
      setUndo(next);
      startDismissTimer();
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  }

  async function revert(target: Undo) {
    // The bar must not vanish while its own request is still running.
    clearTimeout(timer.current);
    setBusy(true);
    setError(null);
    try {
      await onChange(target.changes);
      setUndo(null);
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {hasPending && (
        <Card className="mb-4 rounded-[22px] p-[18px_22px]">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-[13px] font-medium text-sub">บัตรเครดิต · ยังไม่ได้โอน</p>
            <p className="text-[20px] font-bold tabular-nums text-text">
              {formatCurrency(pending.total)}
            </p>
          </div>

          {BUCKETS.map(({ key, title }) => {
            const bucket = pending[key];
            const empty = bucket.entries.length === 0;
            const expanded = open[key] && !empty;
            return (
              <div key={key} className="mt-3 border-t border-border pt-3">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setOpen((o) => ({ ...o, [key]: !o[key] }))}
                    aria-expanded={expanded}
                    disabled={empty}
                    className="min-h-12 min-w-0 flex-1 text-left"
                  >
                    <span className="block text-[18px] font-bold tabular-nums text-text">
                      {formatCurrency(bucket.total)}
                    </span>
                    <span className="block text-[12px] text-sub">
                      {title} · {bucket.entries.length} รายการ
                      {!empty && (expanded ? " ▴" : " ▾")}
                    </span>
                  </button>
                  <Button
                    type="button"
                    variant={key === "due" ? "primary" : "ghost"}
                    disabled={empty || busy}
                    onClick={() => markPaid(bucket)}
                    aria-label={`โอนแล้ว ${title} ${formatCurrency(bucket.total)}`}
                    className="min-h-11 shrink-0 py-2.5 text-[14px]"
                  >
                    โอนแล้ว
                  </Button>
                </div>

                {expanded &&
                  bucket.entries.map(({ expense, amount }) => (
                    <Link
                      key={expense.id}
                      href={`/expenses/${expense.id}`}
                      className="flex items-baseline gap-2.5 py-2 text-[14px]"
                    >
                      <span className="shrink-0 text-[12px] text-sub">
                        {formatDateShort(expense.date)}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-text">{expense.item}</span>
                      <span className="tabular-nums text-text">{formatCurrency(amount)}</span>
                    </Link>
                  ))}
              </div>
            );
          })}

          {error && !undo && <p className="mt-3 text-[13px] text-danger">{error}</p>}
        </Card>
      )}

      {/* Outside the card on purpose: paying the last amount hides the card,
          and the way back has to outlive it. */}
      {(undo || (error && !hasPending)) && (
        <div className="fixed inset-x-0 bottom-[92px] z-50">
          <div className="mx-auto w-full max-w-md px-5">
            <div
              role="status"
              className="flex items-center justify-between gap-3 rounded-[14px] border border-border bg-nav px-4 py-1 shadow-card"
            >
              <div className="min-w-0 py-2 text-[14px]">
                {undo && (
                  <p className="text-text">บันทึกว่าโอนแล้ว {formatCurrency(undo.total)}</p>
                )}
                {error && <p className="text-danger">{error}</p>}
              </div>
              {undo && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => revert(undo)}
                  className="min-h-11 shrink-0 text-[14px] font-bold text-link disabled:opacity-50"
                >
                  ยกเลิก
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
