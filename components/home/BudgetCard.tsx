"use client";

import { useState } from "react";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { formatCurrency } from "@/lib/formatters";
import type { BudgetProgress } from "@/lib/budgets";

interface BudgetCardProps {
  progress: BudgetProgress | null;
  /** The raw month total, shown only when it differs from myShare. */
  monthTotal: number;
  /** The month is the caller's business — it closes over it here. */
  onSave: (amount: number | null) => Promise<void>;
}

export default function BudgetCard({ progress, monthTotal, onSave }: BudgetCardProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function startEditing() {
    setDraft(progress ? String(progress.budget) : "");
    setError(null);
    setEditing(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const trimmed = draft.trim();
    // An empty field clears the budget; anything else has to be a real number.
    const amount = trimmed === "" ? null : Number(trimmed);
    if (amount !== null && (!Number.isFinite(amount) || amount <= 0)) {
      setError("จำนวนเงินไม่ถูกต้อง");
      return;
    }
    setSaving(true);
    try {
      await onSave(amount);
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "บันทึกไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  if (editing) {
    return (
      <Card className="mb-4 rounded-[22px] p-[18px_20px]">
        <form onSubmit={handleSave} className="flex flex-col gap-3">
          <Input
            label="งบเดือนนี้"
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            placeholder="เว้นว่างเพื่อยกเลิกงบ"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            autoFocus
          />
          {error && <p className="text-[13px] text-expense">{error}</p>}
          <div className="flex gap-3">
            <Button type="submit" disabled={saving} className="flex-1 py-2.5 text-[14px]">
              {saving ? "กำลังบันทึก..." : "บันทึก"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled={saving}
              onClick={() => setEditing(false)}
              className="py-2.5 text-[14px]"
            >
              ยกเลิก
            </Button>
          </div>
        </form>
      </Card>
    );
  }

  if (!progress) {
    return (
      <Card className="mb-4 rounded-[22px] p-[14px_20px]">
        <button
          type="button"
          onClick={startEditing}
          className="w-full text-left text-[14px] font-medium text-sub transition-transform active:scale-[0.98]"
        >
          ตั้งงบเดือนนี้ →
        </button>
      </Card>
    );
  }

  const barColor = progress.over ? "var(--expense)" : "var(--accent)";

  return (
    <Card className="mb-4 rounded-[22px] p-[18px_20px]">
      <button type="button" onClick={startEditing} className="w-full text-left">
        <div className="mb-2 flex items-baseline justify-between">
          <span className="text-[13px] font-medium text-sub">งบเดือนนี้</span>
          <span className="text-[13px] text-sub tabular-nums">
            {Math.round(progress.pct)}% ของ {formatCurrency(progress.budget)}
          </span>
        </div>

        {/* Width is data, so it is an inline style — Tailwind cannot generate a
            runtime w-[…] class. Clamped here while pct above stays honest. */}
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-border">
          <div
            className="h-full rounded-full"
            style={{ width: `${Math.min(100, progress.pct)}%`, background: barColor }}
          />
        </div>

        <div className="mt-2 flex items-baseline justify-between">
          <span className="text-[20px] font-bold tabular-nums text-text">
            {formatCurrency(progress.spent)}
          </span>
          <span
            className={
              progress.over
                ? "text-[13px] font-semibold text-expense"
                : "text-[13px] font-semibold text-accent"
            }
          >
            {progress.over
              ? `เกิน ${formatCurrency(-progress.remaining)}`
              : `เหลือ ${formatCurrency(progress.remaining)}`}
          </span>
        </div>

        {/* myShare is what the budget measures — money fronted for other people
            is coming back. Cash actually out the door still matters, so it
            shows when the two differ, same as the today/month cards. */}
        {Math.round(monthTotal * 100) !== Math.round(progress.spent * 100) && (
          <p className="mt-1 text-[12px] text-sub">
            จ่ายจริงเดือนนี้ {formatCurrency(monthTotal)}
          </p>
        )}
      </button>
    </Card>
  );
}
