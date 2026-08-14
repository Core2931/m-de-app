import { create } from "zustand";
import type { Budget } from "@/types";

interface BudgetState {
  budgets: Budget[];
  isLoaded: boolean;
  isLoading: boolean;
  error: string | null;
  load: () => Promise<void>;
  /** amount null clears the month's budget. */
  save: (month: string, amount: number | null) => Promise<void>;
}

// Mirrors settlementStore exactly: load writes error into the store, save
// throws so the calling card can show it inline. Not optimistic — matching the
// other two stores is worth more than a snappier budget edit.
export const useBudgetStore = create<BudgetState>((set, get) => ({
  budgets: [],
  isLoaded: false,
  isLoading: false,
  error: null,

  load: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch("/api/budgets");
      if (!res.ok) throw new Error("โหลดข้อมูลไม่สำเร็จ");
      const data = await res.json();
      set({ budgets: data.budgets, isLoaded: true, isLoading: false });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "เกิดข้อผิดพลาด", isLoading: false });
    }
  },

  save: async (month, amount) => {
    const res = await fetch("/api/budgets", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ month, amount }),
    });
    if (!res.ok) {
      // Reads the server message so the missing-tab 503 reaches the user
      // instead of a generic failure they cannot act on.
      const data = await res.json().catch(() => null);
      throw new Error(data?.error ?? "บันทึกไม่สำเร็จ");
    }
    const data = await res.json();
    const saved: Budget = data.budget;
    const others = get().budgets.filter((b) => b.month !== saved.month);
    set({ budgets: [...others, saved] });
  },
}));
