"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import GlassCard from "@/components/ui/GlassCard";
import Input from "@/components/ui/Input";
import BottomNav from "@/components/layout/BottomNav";
import { useExpenseStore, selectDailyTotals } from "@/store/expenseStore";
import { formatCurrency, formatDate } from "@/lib/formatters";

export default function ExpensesPage() {
  const { expenses, isLoaded, isLoading, error, load } = useExpenseStore();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  useEffect(() => {
    if (!isLoaded) load();
  }, [isLoaded, load]);

  const filtered = useMemo(() => {
    return expenses.filter((e) => {
      if (from && e.date < from) return false;
      if (to && e.date > to) return false;
      return true;
    });
  }, [expenses, from, to]);

  const dailyTotals = useMemo(() => selectDailyTotals(filtered), [filtered]);
  const rangeTotal = filtered.reduce((sum, e) => sum + e.amount, 0);

  return (
    <main className="flex-1 flex flex-col p-4 pb-28 max-w-md mx-auto w-full gap-4">
      <h1 className="text-white text-xl font-semibold">รายการรายจ่าย</h1>

      <GlassCard className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3">
          <Input label="จากวันที่" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          <Input label="ถึงวันที่" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        {(from || to) && (
          <p className="text-white/80 text-sm">
            รวมช่วงที่เลือก: <span className="font-semibold">{formatCurrency(rangeTotal)}</span>
          </p>
        )}
      </GlassCard>

      {isLoading && <p className="text-white/50 text-sm">กำลังโหลด...</p>}
      {error && <p className="text-red-200 text-sm">{error}</p>}
      {!isLoading && dailyTotals.length === 0 && (
        <p className="text-white/50 text-sm text-center">ไม่มีรายการ</p>
      )}

      <div className="flex flex-col gap-3">
        {dailyTotals.map((day) => (
          <GlassCard key={day.date}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-white font-medium text-sm">{formatDate(day.date)}</span>
              <span className="text-white/80 text-sm font-semibold">{formatCurrency(day.total)}</span>
            </div>
            <ul className="flex flex-col gap-1.5">
              {day.items.map((item) => (
                <li key={item.id}>
                  <Link
                    href={`/expenses/${item.id}`}
                    className="flex items-center justify-between text-white/90 text-sm hover:text-white"
                  >
                    <span>{item.item}</span>
                    <span>{formatCurrency(item.amount)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </GlassCard>
        ))}
      </div>

      <BottomNav />
    </main>
  );
}
