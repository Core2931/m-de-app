export type Category = "food" | "transport" | "life" | "goods" | "other";

// Drives the picker and filter order, so "other" stays last.
export const CATEGORIES: Category[] = ["food", "transport", "life", "goods", "other"];

export const DEFAULT_CATEGORY: Category = "food";

// Single Thai-character initials used inside the category avatars.
export const CATEGORY_INIT: Record<Category, string> = {
  food: "อาหา",
  transport: "เดินท",
  life: "ไลฟ์ส",
  goods: "ของใช",
  other: "อื่นๆ"
};

export const CATEGORY_LABEL: Record<Category, string> = {
  food: "อาหาร",
  transport: "เดินทาง",
  life: "ไลฟ์สไตล์",
  goods: "ของใช้",
  other: "อื่นๆ",
};

// CSS var names so avatars re-resolve their color when the theme flips.
export const CATEGORY_COLOR_VAR: Record<Category, string> = {
  food: "var(--food)",
  transport: "var(--transport)",
  life: "var(--life)",
  goods: "var(--goods)",
  other: "var(--other)",
};

// Derived from CATEGORIES rather than a hand-written chain: a category added to
// the list but forgotten here would make every stored row of that kind fail the
// guard and silently come back as "food".
export function isCategory(value: unknown): value is Category {
  return typeof value === "string" && (CATEGORIES as string[]).includes(value);
}

export function toCategory(value: unknown): Category {
  return isCategory(value) ? value : DEFAULT_CATEGORY;
}
