"use client";

import { useState } from "react";
import Card from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import { formatCurrency, formatDateShort } from "@/lib/formatters";
import { CATEGORY_COLOR_VAR, CATEGORY_LABEL } from "@/lib/categories";
import type { CategoryTrend } from "@/lib/categoryTrend";
import type {
  CategoryTotal,
  PeriodSummary as PeriodSummaryData,
  PersonPeriodTotal,
} from "@/types";

function Row({
  label,
  value,
  tone = "text",
  strong,
}: {
  label: string;
  value: number;
  tone?: "text" | "accent" | "expense" | "sub";
  strong?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between py-1">
      <span className="text-[13px] font-medium text-sub">{label}</span>
      <span
        className={cn(
          "tabular-nums",
          strong ? "text-[18px] font-bold" : "text-[15px] font-semibold",
          tone === "accent" && "text-accent",
          tone === "expense" && "text-expense",
          tone === "sub" && "text-sub",
          tone === "text" && "text-text"
        )}
      >
        {formatCurrency(value)}
      </span>
    </div>
  );
}

// Below this a change is noise, not news.
const TREND_MIN_PCT = 10;

function TrendNote({ trend, total }: { trend: CategoryTrend; total: number }) {
  if (trend.pct === null) {
    return total > 0 ? <span className="text-[12px] text-sub">ใหม่</span> : null;
  }
  if (Math.abs(trend.pct) < TREND_MIN_PCT) return null;
  const up = trend.pct > 0;
  return (
    <span
      className={cn("text-[12px] font-medium tabular-nums", up ? "text-expense" : "text-accent")}
    >
      {up ? "↑" : "↓"}
      {Math.round(Math.abs(trend.pct))}%
    </span>
  );
}

function CategoryRow({
  entry,
  total,
  trend,
}: {
  entry: CategoryTotal;
  total: number;
  trend?: CategoryTrend;
}) {
  // Guard the divide: an all-zero slice would otherwise put "NaN%" in the DOM.
  const pct = total > 0 ? (entry.total / total) * 100 : 0;
  const color = CATEGORY_COLOR_VAR[entry.category];

  return (
    <div className="py-1.5">
      <div className="flex items-baseline gap-2">
        <span
          className="h-2.5 w-2.5 shrink-0 translate-y-px rounded-full"
          style={{ background: color }}
        />
        <span className="flex-1 truncate text-[14px] text-text">
          {CATEGORY_LABEL[entry.category]}
        </span>
        {trend && <TrendNote trend={trend} total={entry.total} />}
        <span className="text-[14px] font-semibold tabular-nums text-text">
          {formatCurrency(entry.total)}
        </span>
      </div>
      {/* Width is data, so it lives in an inline style — Tailwind's scanner
          cannot generate a w-[…] class that only exists at runtime, and cn()
          has no tailwind-merge to resolve a conflict anyway. Same approach as
          WeekChart's bars. */}
      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-border">
        <div
          className="h-full rounded-full"
          style={{ width: `${Math.min(100, pct)}%`, background: color }}
        />
      </div>
      {entry.myShare !== entry.total && (
        <p className="mt-1 text-[12px] text-sub">ของฉัน {formatCurrency(entry.myShare)}</p>
      )}
    </div>
  );
}

function PersonRow({ person }: { person: PersonPeriodTotal }) {
  const [expanded, setExpanded] = useState(false);
  const theyOweMe = person.net > 0;
  const even = person.net === 0;
  // Only worth spelling out the two directions when both actually happened —
  // otherwise the net figure already says everything.
  const mixed = person.lentOut > 0 && person.borrowed > 0;

  return (
    <div className="border-t border-border py-2.5 first:border-t-0">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="flex w-full items-center gap-2 text-left"
      >
        <span className="flex-1 truncate text-[15px] font-medium text-text">{person.person}</span>
        <span
          className={cn(
            "text-[15px] font-semibold tabular-nums",
            even ? "text-sub" : theyOweMe ? "text-accent" : "text-expense"
          )}
        >
          {even ? "" : theyOweMe ? "+" : "-"}
          {formatCurrency(Math.abs(person.net))}
        </span>
        <span className={cn("text-[11px] text-sub transition-transform", expanded && "rotate-180")}>
          ▾
        </span>
      </button>

      {mixed && (
        <p className="mt-0.5 text-[12px] text-sub">
          ออกให้ {formatCurrency(person.lentOut)} · เขาออกให้ {formatCurrency(person.borrowed)}
        </p>
      )}

      {expanded && (
        <ul className="mt-2 flex flex-col gap-1.5 pl-1">
          {person.entries.map((entry, i) => (
            <li key={`${entry.expenseId}-${i}`} className="flex items-center gap-2 text-[13px]">
              <span className="shrink-0 text-sub">{formatDateShort(entry.date)}</span>
              <span className="flex-1 truncate text-text/80">
                {entry.split.label || entry.item}
              </span>
              <span
                className={cn(
                  "tabular-nums",
                  entry.split.direction === "owed_to_me" ? "text-accent" : "text-expense"
                )}
              >
                {formatCurrency(entry.split.amount)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

interface PeriodSummaryProps {
  summary: PeriodSummaryData;
  /** What the numbers cover, e.g. "ช่วงที่เลือก · อาหาร". Keeps a filtered
   *  total from being misread as the all-time one. */
  scopeLabel: string;
  /** How many expenses these figures cover. */
  count: number;
  /** Each category against the cycle before, or null when the range is not a cycle. */
  trends: Map<string, CategoryTrend> | null;
}

export default function PeriodSummary({ summary, scopeLabel, count, trends }: PeriodSummaryProps) {
  const hasSplits = summary.people.length > 0;
  // Closed by default: the list is what this screen is for, and the full
  // breakdown is two taps' worth of reading that used to sit on top of it.
  const [open, setOpen] = useState(false);

  return (
    <Card className="mb-4 rounded-[22px] p-[16px_20px]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full text-left"
      >
        <div className="flex items-baseline justify-between">
          <p className="text-[12px] font-medium text-sub">{scopeLabel}</p>
          <span
            className={cn("text-[11px] text-sub transition-transform", open && "rotate-180")}
            aria-hidden="true"
          >
            ▾
          </span>
        </div>
        <p className="mt-1 text-[13px] text-sub">
          <span className="text-[18px] font-bold tabular-nums text-text">
            {formatCurrency(summary.total)}
          </span>
          {summary.lentOut > 0 && <> · ของฉัน {formatCurrency(summary.myShare)}</>}
          {" · "}
          {count} รายการ
        </p>
      </button>

      {open && <div className="mt-2 border-t border-border pt-2">{detail()}</div>}
    </Card>
  );

  function detail() {
    return (
      <>
      {summary.lentOut > 0 && <Row label="ออกให้คนอื่น" value={summary.lentOut} tone="accent" />}
      {summary.borrowed > 0 && (
        <Row label="คนอื่นออกให้เรา" value={summary.borrowed} tone="expense" />
      )}
      {summary.lentOut > 0 && (
        <div className="mt-1 border-t border-border pt-1">
          <Row label="ของฉันจริงๆ" value={summary.myShare} />
        </div>
      )}

      {summary.byCategory.length > 1 && (
        <div className="mt-3 border-t border-border pt-2">
          <p className="mb-1 text-[12px] font-medium text-sub">
            แยกตามหมวด{trends ? " · เทียบรอบก่อน (ช่วงวันเดียวกัน)" : ""}
          </p>
          {summary.byCategory.map((entry) => (
            <CategoryRow
              key={entry.category}
              entry={entry}
              total={summary.total}
              trend={trends?.get(entry.category)}
            />
          ))}
        </div>
      )}

      {hasSplits && (
        <div className="mt-3 border-t border-border pt-2">
          <p className="mb-1 text-[12px] font-medium text-sub">
            ยอดต่อคนในช่วงนี้ (ยังไม่หักที่เคลียร์ไปแล้ว)
          </p>
          {summary.people.map((person) => (
            <PersonRow key={person.person} person={person} />
          ))}
        </div>
      )}
      </>
    );
  }
}
