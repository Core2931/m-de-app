"use client";

import { cn } from "@/lib/utils";
import { CHIP_OFF, CHIP_ON } from "@/lib/chipStyles";
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
              active ? CHIP_ON : CHIP_OFF
            )}
          >
            {PAY_FILTER_LABEL[filter]}
          </button>
        );
      })}
    </div>
  );
}
