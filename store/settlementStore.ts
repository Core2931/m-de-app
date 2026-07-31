import { create } from "zustand";
import type { NewSettlement, Settlement } from "@/types";

interface SettlementState {
  settlements: Settlement[];
  isLoaded: boolean;
  isLoading: boolean;
  error: string | null;
  load: () => Promise<void>;
  add: (input: NewSettlement) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

export const useSettlementStore = create<SettlementState>((set, get) => ({
  settlements: [],
  isLoaded: false,
  isLoading: false,
  error: null,

  load: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch("/api/settlements");
      if (!res.ok) throw new Error("โหลดข้อมูลไม่สำเร็จ");
      const data = await res.json();
      set({ settlements: data.settlements, isLoaded: true, isLoading: false });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "เกิดข้อผิดพลาด", isLoading: false });
    }
  },

  add: async (input) => {
    const res = await fetch("/api/settlements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      throw new Error(data?.error ?? "บันทึกไม่สำเร็จ");
    }
    const data = await res.json();
    set({ settlements: [...get().settlements, data.settlement] });
  },

  remove: async (id) => {
    const res = await fetch(`/api/settlements/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("ลบไม่สำเร็จ");
    set({ settlements: get().settlements.filter((s) => s.id !== id) });
  },
}));
