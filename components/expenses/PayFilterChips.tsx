"use client";

import { cn } from "@/lib/utils";
import { PAY_FILTERS, PAY_FILTER_LABEL, type PayFilter } from "@/lib/payMethods";

interface PayFilterChipsProps {
  value: PayFilter;
  onChange: (next: PayFilter) => void;
}

export default function PayFilterChips({ value, onChange }: PayFilterChipsProps) {
  return (
    <div role="group" aria-label="กรองตามวิธีจ่าย" className="flex flex-wrap items-center gap-2">
      {PAY_FILTERS.map((filter) => {
        const active = filter === value;
        return (
          <button
            key={filter}
            type="button"
            onClick={() => onChange(filter)}
            aria-pressed={active}
            className={cn(
              "hit-area rounded-full border px-3 py-1.5 text-[13px] font-medium transition-transform active:scale-95",
              active
                ? "border-accent bg-accent-soft text-accent"
                : "border-border bg-card text-sub"
            )}
          >
            {PAY_FILTER_LABEL[filter]}
          </button>
        );
      })}
    </div>
  );
}
