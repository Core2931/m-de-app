import { cn } from "@/lib/utils";
import { CATEGORY_COLOR_VAR, CATEGORY_INIT, type Category } from "@/lib/categories";

interface AvatarProps {
  category: Category;
  /** Diameter in px (38 on Home, 34 in the List). */
  size?: number;
  className?: string;
}

export default function Avatar({ category, size = 38, className }: AvatarProps) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full font-semibold text-text",
        className
      )}
      style={{
        width: size,
        height: size,
        background: CATEGORY_COLOR_VAR[category],
        fontSize: Math.round(size * 0.4),
      }}
    >
      {CATEGORY_INIT[category]}
    </div>
  );
}
