"use client";

import { useState } from "react";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { formatCurrency, formatDateShort } from "@/lib/formatters";
import type { BudgetProgress } from "@/lib/budgets";
import type { BudgetForecast } from "@/lib/forecast";
import { remainingLevel, type TodayPace } from "@/lib/pace";
import type { CashPosition } from "@/lib/cash";

// Same colours as the calendar cells: one meaning everywhere.
const LEVEL_TEXT = ["text-text", "text-pace-1", "text-pace-2", "text-danger"] as const;
// What is left starts green, not white: plenty left is good news.
const REMAINING_TEXT = ["text-accent", "text-pace-1", "text-pace-2", "text-danger"] as const;

interface HomeHeroProps {
  progress: BudgetProgress | null;
  /** Every baht that went out the door this cycle, before splits. Shown only while no budget is set. */
  cycleTotal: number;
  todayTotal: number;
  /** What today really cost us; the colour is judged on this. */
  todayMyShare: number;
  pace: TodayPace | null;
  /** Spent per elapsed day, or null before anything is spent. */
  average: number | null;
  forecast: BudgetForecast | null;
  /** The account-side view, or null while settlements have not loaded. */
  cash: CashPosition | null;
  daysLeft: number;
  cycleStart: string;
  cycleEnd: string;
  /** The cycle's budget month is the caller's business: it closes over it here. */
  onSave: (amount: number | null) => Promise<void>;
}

export default function HomeHero({
  progress,
  cycleTotal,
  todayTotal,
  todayMyShare,
  pace,
  average,
  forecast,
  cash,
  daysLeft,
  cycleStart,
  cycleEnd,
  onSave,
}: HomeHeroProps) {
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
            label="งบรอบนี้"
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            placeholder="เว้นว่างเพื่อยกเลิกงบ"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            autoFocus
          />
          {error && <p className="text-[13px] text-danger">{error}</p>}
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

  const todayLevel = pace?.level ?? 0;
  const myShareDiffers = Math.round(todayMyShare * 100) !== Math.round(todayTotal * 100);

  // Under today's number: how far over, else whose money it is when it differs.
  const todayNote =
    todayLevel > 0 && pace
      ? {
          text: `เกิน ${formatCurrency(pace.overBy)}`,
          className: `font-medium ${LEVEL_TEXT[todayLevel]}`,
        }
      : myShareDiffers
        ? { text: `ของฉัน ${formatCurrency(todayMyShare)}`, className: "text-sub" }
        : null;

  const stats = (
    <div
      className={`mt-4 grid gap-3 border-t border-border pt-4 ${
        progress ? "grid-cols-3" : "grid-cols-2"
      }`}
    >
      <Stat
        label="วันนี้"
        value={formatCurrency(todayTotal)}
        valueClassName={LEVEL_TEXT[todayLevel]}
        note={todayNote}
      />
      {pace && <Stat label="ใช้ได้วันละ" value={formatCurrency(pace.allowance)} />}
      <Stat
        label="เฉลี่ยจริง"
        value={average === null ? "–" : formatCurrency(Math.round(average))}
      />
    </div>
  );

  if (!progress) {
    return (
      <Card className="mb-4 rounded-[22px] p-[20px_22px]">
        <div className="flex items-baseline justify-between">
          <span className="text-[13px] font-medium text-sub">รอบนี้</span>
          <span className="text-[13px] text-sub">อีก {daysLeft} วันเงินออก</span>
        </div>
        <p className="mt-1 text-[34px] font-bold leading-tight tabular-nums text-text">
          {formatCurrency(cycleTotal)}
        </p>
        <p className="text-[12px] text-sub">
          {formatDateShort(cycleStart)} – {formatDateShort(cycleEnd)}
        </p>
        {stats}
        <button
          type="button"
          onClick={startEditing}
          className="mt-4 w-full text-left text-[14px] font-medium text-link transition-transform active:scale-[0.98]"
        >
          ตั้งงบรอบนี้ →
        </button>
      </Card>
    );
  }

  const fillPct = Math.min(100, progress.pct);
  // The ramp is sized to the whole track, not to the fill, so the colour at the
  // tip says how far through the budget you are: blue early, yellow near the
  // limit. Over budget drops the ramp for the danger colour.
  const barStyle: React.CSSProperties = progress.over
    ? { width: "100%", background: "var(--danger)" }
    : {
        width: `${fillPct}%`,
        backgroundImage:
          "linear-gradient(90deg, var(--ramp-from), var(--ramp-mid), var(--ramp-to))",
        backgroundSize: fillPct > 0 ? `${10000 / fillPct}% 100%` : "100% 100%",
      };

  return (
    <Card className="mb-4 rounded-[22px] p-[20px_22px]">
      {/* Only the budget part opens the editor; the figures below are not
          buttons, so a tap there does nothing surprising. */}
      <button
        type="button"
        onClick={startEditing}
        aria-label="แก้งบรอบนี้"
        className="w-full text-left"
      >
        <div className="flex items-baseline justify-between">
          <span className="text-[13px] font-medium text-sub">
            {progress.over ? "เกินงบรอบนี้" : "เหลือรอบนี้"}
          </span>
          <span className="text-[13px] text-sub">อีก {daysLeft} วันเงินออก</span>
        </div>
        <p
          className={`mt-1 text-[34px] font-bold leading-tight tabular-nums ${
            REMAINING_TEXT[remainingLevel(progress)]
          }`}
        >
          {formatCurrency(progress.over ? -progress.remaining : progress.remaining)}
        </p>
        {/* Money fronted for others is not back yet, so the account holds less
            (or, when we owe someone, more) than the budget says. Said right
            under the number it corrects, and only when the two differ. */}
        {cash && Math.round(cash.gap) !== 0 && (
          <div className="mt-1">
            <p className="text-[14px] font-medium text-text">
              ในบัญชีเหลือราว {formatCurrency(cash.cashRemaining)}
            </p>
            <p className="text-[12px] text-sub">
              จ่ายจริง {formatCurrency(cash.cashOut)} ·{" "}
              {cash.gap > 0
                ? `รอได้คืน ${formatCurrency(cash.gap)}`
                : `ต้องจ่ายคืน ${formatCurrency(-cash.gap)}`}
            </p>
          </div>
        )}

        {/* Width is data, so it is an inline style: Tailwind cannot generate a
            runtime w-[...] class. Clamped here while pct below stays honest. */}
        <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-border">
          <div className="h-full rounded-full" style={barStyle} />
        </div>
        <div className="mt-2 flex items-baseline justify-between text-[13px] text-sub tabular-nums">
          <span>ใช้ไป {formatCurrency(progress.spent)}</span>
          <span>
            {Math.round(progress.pct)}% ของ {formatCurrency(progress.budget)}
          </span>
        </div>
      </button>

      {stats}

      {forecast && (
        <p
          className={`mt-4 text-[12px] ${
            forecast.kind === "short" ? "font-medium text-pace-2" : "text-sub"
          }`}
        >
          {forecast.kind === "short"
            ? `ที่ความเร็วนี้ เงินหมดวันที่ ${formatDateShort(forecast.runOutDate)} (ก่อนเงินออก ${forecast.daysShort} วัน)`
            : `ที่ความเร็วนี้ ถึงเงินออกเหลือราว ${formatCurrency(Math.round(forecast.left))}`}
        </p>
      )}

      <p className="mt-1 text-[12px] text-sub">
        รอบ {formatDateShort(cycleStart)} – {formatDateShort(cycleEnd)}
      </p>
    </Card>
  );
}

function Stat({
  label,
  value,
  valueClassName = "text-text",
  note,
}: {
  label: string;
  value: string;
  valueClassName?: string;
  note?: { text: string; className: string } | null;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[12px] text-sub">{label}</p>
      <p className={`mt-0.5 text-[18px] font-bold tabular-nums ${valueClassName}`}>{value}</p>
      {note && <p className={`mt-0.5 text-[12px] ${note.className}`}>{note.text}</p>}
    </div>
  );
}
