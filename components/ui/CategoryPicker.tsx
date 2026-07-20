"use client";

import { cn } from "@/lib/utils";
import {
  CATEGORIES,
  CATEGORY_COLOR_VAR,
  CATEGORY_INIT,
  CATEGORY_LABEL,
  type Category,
} from "@/lib/categories";

interface CategoryPickerProps {
  value: Category;
  onChange: (category: Category) => void;
}

export default function CategoryPicker({ value, onChange }: CategoryPickerProps) {
  return (
    <div className="flex gap-[10px]">
      {CATEGORIES.map((cat) => {
        const selected = cat === value;
        return (
          <button
            key={cat}
            type="button"
            onClick={() => onChange(cat)}
            aria-label={CATEGORY_LABEL[cat]}
            aria-pressed={selected}
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-full text-[15px] font-semibold text-text transition-transform active:scale-95",
              selected && "ring-2 ring-accent ring-offset-2 ring-offset-card"
            )}
            style={{ background: CATEGORY_COLOR_VAR[cat] }}
          >
            {CATEGORY_INIT[cat]}
          </button>
        );
      })}
    </div>
  );
}
