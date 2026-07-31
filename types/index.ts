import type { Category } from "@/lib/categories";

export interface Expense {
  id: string;
  date: string; // YYYY-MM-DD
  item: string;
  amount: number;
  remark: string;
  category: Category;
  createdAt: string; // ISO timestamp
}

export type NewExpense = Omit<Expense, "id" | "createdAt">;

export interface DailyTotal {
  date: string;
  total: number;
  items: Expense[];
}

export type SplitDirection = "owed_to_me" | "i_owe";

export interface Split {
  person: string; // normalized
  amount: number;
  label: string;
  direction: SplitDirection;
}

export interface ParsedRemark {
  splits: Split[];
  freeText: string;
  invalid: boolean;
}

export interface ExpenseSplitSummary extends ParsedRemark {
  lentOut: number; // เราออกให้คนอื่น
  borrowed: number; // คนอื่นออกให้เรา
  myShare: number; // ค่าใช้จ่ายของฉันจริง = amount - lentOut
  cashOut: number; // เงินออกจากกระเป๋าจริง = amount - borrowed
  overAllocated: boolean; // lentOut + borrowed > amount
}
