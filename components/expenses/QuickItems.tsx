"use client";

import { formatCurrency } from "@/lib/formatters";
import type { FrequentItem } from "@/lib/frequentItems";

const CHIP_CAP = 6;

interface QuickItemsProps {
  items: FrequentItem[];
  onPick: (item: FrequentItem) => void;
}

/**
 * One-tap prefill for the things that get typed again every day. The chip
 * shows the amount it will fill in, so a stale price is visible before the
 * tap rather than after the save.
 */
export default function QuickItems({ items, onPick }: QuickItemsProps) {
  if (items.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-[12px] text-sub">รายการประจำ:</span>
      {items.slice(0, CHIP_CAP).map((entry) => (
        <button
          key={entry.item}
          type="button"
          onClick={() => onPick(entry)}
          className="rounded-full border border-border bg-card px-2.5 py-1 text-[12px] font-medium text-text/80 transition-transform active:scale-95"
        >
          {entry.item}
          <span className="ml-1 text-sub">{formatCurrency(entry.amount)}</span>
        </button>
      ))}
    </div>
  );
}
