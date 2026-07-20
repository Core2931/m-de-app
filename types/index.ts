export interface Expense {
  id: string;
  date: string; // YYYY-MM-DD
  item: string;
  amount: number;
  remark: string;
  createdAt: string; // ISO timestamp
}

export type NewExpense = Omit<Expense, "id" | "createdAt">;

export interface DailyTotal {
  date: string;
  total: number;
  items: Expense[];
}
