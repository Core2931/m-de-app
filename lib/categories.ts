export type Category = "food" | "transport" | "life" | "other";

export const CATEGORIES: Category[] = ["food", "transport", "life", "other"];

export const DEFAULT_CATEGORY: Category = "food";

// Single Thai-character initials used inside the category avatars.
export const CATEGORY_INIT: Record<Category, string> = {
  food: "อาหา",
  transport: "เดินท",
  life: "ไลฟ์ส",
  other: "อื่นๆ"
};

export const CATEGORY_LABEL: Record<Category, string> = {
  food: "อาหาร",
  transport: "เดินทาง",
  life: "ไลฟ์สไตล์",
  other: "อื่นๆ",
};

// CSS var names so avatars re-resolve their color when the theme flips.
export const CATEGORY_COLOR_VAR: Record<Category, string> = {
  food: "var(--food)",
  transport: "var(--transport)",
  life: "var(--life)",
  other: "var(--other)",
};

export function isCategory(value: unknown): value is Category {
  return value === "food" || value === "transport" || value === "life" || value === "other";
}

export function toCategory(value: unknown): Category {
  return isCategory(value) ? value : DEFAULT_CATEGORY;
}
