"use client";

import { useState } from "react";
import Card from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import { formatCurrency, formatDateShort } from "@/lib/formatters";
import type { PeriodSummary as PeriodSummaryData, PersonPeriodTotal } from "@/types";

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
}

export default function PeriodSummary({ summary, scopeLabel }: PeriodSummaryProps) {
  const hasSplits = summary.people.length > 0;

  return (
    <Card className="mb-4 rounded-[22px] p-[18px_20px]">
      <p className="mb-1 text-[12px] font-medium text-sub">{scopeLabel}</p>

      <Row label="รวมทั้งหมด" value={summary.total} strong />
      {summary.lentOut > 0 && <Row label="ออกให้คนอื่น" value={summary.lentOut} tone="accent" />}
      {summary.borrowed > 0 && (
        <Row label="คนอื่นออกให้เรา" value={summary.borrowed} tone="expense" />
      )}
      {summary.lentOut > 0 && (
        <div className="mt-1 border-t border-border pt-1">
          <Row label="ของฉันจริงๆ" value={summary.myShare} />
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
    </Card>
  );
}
