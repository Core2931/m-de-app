"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Card from "@/components/ui/Card";
import Avatar from "@/components/ui/Avatar";
import DateField from "@/components/ui/DateField";
import Screen from "@/components/layout/Screen";
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
    <Screen>
      <h1 className="mb-5 text-[26px] font-bold leading-tight text-text">รายการรายจ่าย</h1>

      <div className="mb-4 grid grid-cols-2 gap-3">
        <DateField label="จากวันที่" value={from} onChange={setFrom} filled />
        <DateField label="ถึงวันที่" value={to} onChange={setTo} filled />
      </div>

      {(from || to) && (
        <p className="mb-4 text-sm text-sub">
          รวมช่วงที่เลือก:{" "}
          <span className="font-semibold text-text">{formatCurrency(rangeTotal)}</span>
        </p>
      )}

      {isLoading && <p className="text-sm text-sub">กำลังโหลด...</p>}
      {error && <p className="text-sm text-accent">{error}</p>}
      {!isLoading && !error && dailyTotals.length === 0 && (
        <p className="text-center text-sm text-sub">ไม่มีรายการ</p>
      )}

      <div className="flex flex-col gap-4">
        {dailyTotals.map((day) => (
          <div key={day.date}>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[13px] font-medium text-sub">{formatDate(day.date)}</span>
              <span className="text-[13px] font-semibold text-sub">
                {formatCurrency(day.total)}
              </span>
            </div>
            <Card className="rounded-[20px] px-5 py-1">
              {day.items.map((item) => (
                <Link
                  key={item.id}
                  href={`/expenses/${item.id}`}
                  className="flex items-center gap-3 py-3 transition-transform active:scale-[0.98]"
                >
                  <Avatar category={item.category} size={34} />
                  <span className="flex-1 truncate text-[15px] font-medium text-text">
                    {item.item}
                  </span>
                  <span className="text-[15px] font-semibold text-expense">
                    {formatCurrency(item.amount)}
                  </span>
                </Link>
              ))}
            </Card>
          </div>
        ))}
      </div>
    </Screen>
  );
}
