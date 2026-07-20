"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import GlassCard from "@/components/ui/GlassCard";
import BottomNav from "@/components/layout/BottomNav";
import { useExpenseStore, selectTotalForDate, selectTotalForMonth } from "@/store/expenseStore";
import { formatCurrency, todayISO, currentMonthISO } from "@/lib/formatters";

export default function DashboardPage() {
  const router = useRouter();
  const { expenses, isLoaded, isLoading, error, load } = useExpenseStore();

  useEffect(() => {
    if (!isLoaded) load();
  }, [isLoaded, load]);

  const today = todayISO();
  const month = currentMonthISO();
  const todayTotal = selectTotalForDate(expenses, today);
  const monthTotal = selectTotalForMonth(expenses, month);
  const todayItems = expenses
    .filter((e) => e.date === today)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <main className="flex-1 flex flex-col p-4 pb-28 max-w-md mx-auto w-full gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-white text-xl font-semibold">รายจ่าย</h1>
        <button onClick={handleLogout} className="text-white/70 text-sm underline">
          ออกจากระบบ
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <GlassCard>
          <p className="text-white/60 text-xs mb-1">วันนี้</p>
          <p className="text-white text-2xl font-bold">{formatCurrency(todayTotal)}</p>
        </GlassCard>
        <GlassCard>
          <p className="text-white/60 text-xs mb-1">เดือนนี้</p>
          <p className="text-white text-2xl font-bold">{formatCurrency(monthTotal)}</p>
        </GlassCard>
      </div>

      <GlassCard className="flex-1">
        <p className="text-white/70 text-sm font-medium mb-3">รายการวันนี้</p>
        {isLoading && <p className="text-white/50 text-sm">กำลังโหลด...</p>}
        {error && <p className="text-red-200 text-sm">{error}</p>}
        {!isLoading && todayItems.length === 0 && (
          <p className="text-white/50 text-sm">ยังไม่มีรายการวันนี้</p>
        )}
        <ul className="flex flex-col gap-2">
          {todayItems.map((item) => (
            <li key={item.id} className="flex items-center justify-between text-white text-sm">
              <span>{item.item}</span>
              <span className="font-medium">{formatCurrency(item.amount)}</span>
            </li>
          ))}
        </ul>
      </GlassCard>

      <BottomNav />
    </main>
  );
}
