"use client";

import { cn } from "@/lib/utils";
import { CARD_PAYS, PAY_LABEL, PAY_METHODS, isCardPay, pickerValue } from "@/lib/payMethods";
import type { PayMethod } from "@/types";

interface PayPickerProps {
  /** Null selects nothing: a row saved before payment was recorded. */
  value: PayMethod | null;
  onChange: (pay: PayMethod) => void;
  hint?: string;
}

// The other ways come first: they are used more often than the card.
const GROUPS = [
  {
    caption: "แบบอื่น",
    pays: PAY_METHODS.filter((p) => !isCardPay(p)),
    grow: "flex-[2_1_auto]",
  },
  { caption: "บัตรเครดิต", pays: CARD_PAYS, grow: "flex-[3_1_auto]" },
];

export default function PayPicker({ value, onChange, hint }: PayPickerProps) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-[13px] font-medium text-sub">จ่ายด้วย</span>
      <div role="radiogroup" aria-label="จ่ายด้วย" className="flex gap-1.5">
        {GROUPS.map((group) => (
          <div key={group.caption} className={cn("flex min-w-0 flex-col gap-1", group.grow)}>
            <span className="text-[11px] text-sub">{group.caption}</span>
            <div className="flex gap-0.5 rounded-xl border border-track-edge bg-track p-[3px]">
              {group.pays.map((pay) => {
                const selected = pay === pickerValue(value);
                return (
                  <button
                    key={pay}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    // "ต้องโอน" alone does not say it is about the card.
                    aria-label={`${group.caption} ${PAY_LABEL[pay]}`}
                    onClick={() => onChange(pay)}
                    className={cn(
                      "min-h-11 flex-auto whitespace-nowrap rounded-[9px] px-[3px] text-[12.5px]",
                      selected
                        ? "bg-action font-semibold text-action-text"
                        : "text-sub"
                    )}
                  >
                    {PAY_LABEL[pay]}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      {hint && <p className="text-[12px] text-sub">{hint}</p>}
    </div>
  );
}
