import { create } from "zustand";
import type { DailyTotal, Expense, NewExpense, PayChange } from "@/types";
import { WEEK_LABELS, currentWeekDates, todayISO } from "@/lib/formatters";
import { summarizeExpense } from "@/lib/splits";
import { applyPayChanges } from "@/lib/payMethods";

interface ExpenseState {
  expenses: Expense[];
  isLoaded: boolean;
  isLoading: boolean;
  error: string | null;
  load: (from?: string, to?: string) => Promise<void>;
  add: (input: NewExpense) => Promise<void>;
  update: (id: string, input: NewExpense) => Promise<void>;
  remove: (id: string) => Promise<void>;
  /** Marks card amounts as transferred, or puts them back. All or nothing. */
  setPay: (changes: PayChange[]) => Promise<void>;
}

export const useExpenseStore = create<ExpenseState>((set, get) => ({
  expenses: [],
  isLoaded: false,
  isLoading: false,
  error: null,

  load: async (from, to) => {
    set({ isLoading: true, error: null });
    try {
      const params = new URLSearchParams();
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      const res = await fetch(`/api/expenses?${params.toString()}`);
      if (!res.ok) throw new Error("โหลดข้อมูลไม่สำเร็จ");
      const data = await res.json();
      set({ expenses: data.expenses, isLoaded: true, isLoading: false });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "เกิดข้อผิดพลาด", isLoading: false });
    }
  },

  add: async (input) => {
    const res = await fetch("/api/expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!res.ok) throw new Error("บันทึกไม่สำเร็จ");
    const data = await res.json();
    set({ expenses: [...get().expenses, data.expense] });
  },

  update: async (id, input) => {
    const res = await fetch(`/api/expenses/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!res.ok) throw new Error("แก้ไขไม่สำเร็จ");
    const data = await res.json();
    set({ expenses: get().expenses.map((e) => (e.id === id ? data.expense : e)) });
  },

  remove: async (id) => {
    const res = await fetch(`/api/expenses/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("ลบไม่สำเร็จ");
    set({ expenses: get().expenses.filter((e) => e.id !== id) });
  },

  setPay: async (changes) => {
    const failed = "บันทึกไม่สำเร็จ";
    let res: Response;
    try {
      res = await fetch("/api/expenses/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ changes }),
      });
    } catch {
      // A dropped connection carries the browser's own English message.
      throw new Error(failed);
    }
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      throw new Error(typeof data?.error === "string" ? data.error : failed);
    }
    set({ expenses: applyPayChanges(get().expenses, changes) });
  },
}));

export function selectDailyTotals(expenses: Expense[]): DailyTotal[] {
  const map = new Map<string, Expense[]>();
  for (const expense of expenses) {
    const list = map.get(expense.date) ?? [];
    list.push(expense);
    map.set(expense.date, list);
  }
  return Array.from(map.entries())
    .map(([date, items]) => ({
      date,
      items: [...items].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      total: items.reduce((sum, e) => sum + e.amount, 0),
    }))
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function selectTotalForDate(expenses: Expense[], dateISO: string): number {
  return expenses.filter((e) => e.date === dateISO).reduce((sum, e) => sum + e.amount, 0);
}

export interface WeekDay {
  label: string;
  total: number;
  isToday: boolean;
}

export function selectWeek(expenses: Expense[]): WeekDay[] {
  const dates = currentWeekDates();
  const today = todayISO();
  return dates.map((date, i) => ({
    label: WEEK_LABELS[i],
    total: selectTotalForDate(expenses, date),
    isToday: date === today,
  }));
}

export function selectMyShareForDate(expenses: Expense[], dateISO: string): number {
  return expenses
    .filter((e) => e.date === dateISO)
    .reduce((sum, e) => sum + summarizeExpense(e).myShare, 0);
}
