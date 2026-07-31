"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import { formatCurrency, formatDateShort } from "@/lib/formatters";
import type { PersonBalance } from "@/types";

interface PersonRowProps {
  balance: PersonBalance;
  onSettle: (balance: PersonBalance) => void;
}

export default function PersonRow({ balance, onSettle }: PersonRowProps) {
  const [expanded, setExpanded] = useState(false);
  const theyOweMe = balance.balance > 0;

  return (
    <div className="border-b border-border py-3 last:border-b-0">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex flex-1 items-center gap-2 text-left"
        >
          <span className="flex-1 truncate text-[15px] font-medium text-text">
            {balance.person}
          </span>
          <span
            className={
              theyOweMe
                ? "text-[15px] font-semibold text-accent"
                : "text-[15px] font-semibold text-expense"
            }
          >
            {theyOweMe ? "+" : "-"}
            {formatCurrency(Math.abs(balance.balance))}
          </span>
        </button>
        <Button
          type="button"
          variant="ghost"
          className="px-3 py-1.5 text-[13px]"
          onClick={() => onSettle(balance)}
        >
          เคลียร์
        </Button>
      </div>

      {expanded && (
        <ul className="mt-2 flex flex-col gap-1.5 pl-1">
          {balance.entries.map((entry, i) => (
            <li key={`${entry.expenseId}-${i}`} className="flex items-center gap-2 text-[13px]">
              <span className="text-sub">{formatDateShort(entry.date)}</span>
              <span className="flex-1 truncate text-text/80">
                {entry.split.label || entry.item}
              </span>
              <span className={entry.split.direction === "owed_to_me" ? "text-accent" : "text-expense"}>
                {formatCurrency(entry.split.amount)}
              </span>
            </li>
          ))}
          {balance.settledNet !== 0 && (
            <li className="text-[13px] text-sub">
              เคลียร์ไปแล้ว {formatCurrency(Math.abs(balance.settledNet))}
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
