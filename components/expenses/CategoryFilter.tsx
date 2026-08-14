"use client";

import { cn } from "@/lib/utils";
import {
  CATEGORIES,
  CATEGORY_COLOR_VAR,
  CATEGORY_LABEL,
  type Category,
} from "@/lib/categories";

interface CategoryFilterProps {
  /** Empty means "no filter" — every category passes. */
  selected: Category[];
  onChange: (next: Category[]) => void;
}

export default function CategoryFilter({ selected, onChange }: CategoryFilterProps) {
  function toggle(category: Category) {
    onChange(
      selected.includes(category)
        ? selected.filter((c) => c !== category)
        : [...selected, category]
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {CATEGORIES.map((category) => {
        const active = selected.includes(category);
        return (
          <button
            key={category}
            type="button"
            onClick={() => toggle(category)}
            aria-pressed={active}
            className={cn(
              "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] font-medium transition-transform active:scale-95",
              active
                ? "border-accent bg-accent-soft text-accent"
                : "border-border bg-card text-sub"
            )}
          >
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ background: CATEGORY_COLOR_VAR[category] }}
            />
            {CATEGORY_LABEL[category]}
          </button>
        );
      })}

      {selected.length > 0 && (
        <button
          type="button"
          onClick={() => onChange([])}
          className="px-2 py-1.5 text-[13px] font-medium text-sub underline underline-offset-2 transition-transform active:scale-95"
        >
          ล้าง
        </button>
      )}
    </div>
  );
}
