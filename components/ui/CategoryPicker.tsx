"use client";

import { cn } from "@/lib/utils";
import CategoryDot from "@/components/ui/CategoryDot";
import { CHIP_OFF, CHIP_ON } from "@/lib/chipStyles";
import { CATEGORIES, CATEGORY_LABEL, type Category } from "@/lib/categories";

interface CategoryPickerProps {
  value: Category;
  onChange: (category: Category) => void;
}

export default function CategoryPicker({ value, onChange }: CategoryPickerProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {CATEGORIES.map((cat) => {
        const selected = cat === value;
        return (
          <button
            key={cat}
            type="button"
            onClick={() => onChange(cat)}
            aria-pressed={selected}
            className={cn(
              "flex h-11 items-center gap-[7px] rounded-full border px-[13px] text-[13px] transition-transform active:scale-95",
              selected ? `${CHIP_ON} font-semibold` : CHIP_OFF
            )}
          >
            <CategoryDot category={cat} />
            {CATEGORY_LABEL[cat]}
          </button>
        );
      })}
    </div>
  );
}
