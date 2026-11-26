import { cn } from "@/lib/utils";
import { CATEGORY_COLOR_VAR, type Category } from "@/lib/categories";

interface CategoryDotProps {
  category: Category;
  className?: string;
}

/** Decorative: whoever shows it also writes the category name. */
export default function CategoryDot({ category, className }: CategoryDotProps) {
  return (
    <span
      aria-hidden="true"
      className={cn("h-2.5 w-2.5 shrink-0 rounded-full", className)}
      style={{ background: CATEGORY_COLOR_VAR[category] }}
    />
  );
}
