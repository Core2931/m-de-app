"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Card from "@/components/ui/Card";
import Avatar from "@/components/ui/Avatar";
import Screen from "@/components/layout/Screen";
import WeekChart from "@/components/home/WeekChart";
import {
  useExpenseStore,
  selectTotalForDate,
  selectTotalForMonth,
  selectWeek,
} from "@/store/expenseStore";
import { formatCurrency, todayISO, currentMonthISO } from "@/lib/formatters";

const TODAY_CAP = 4;

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
  const week = selectWeek(expenses);

  const todayItems = expenses
    .filter((e) => e.date === today)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const visibleItems = todayItems.slice(0, TODAY_CAP);
  const moreCount = Math.max(0, todayItems.length - TODAY_CAP);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <Screen onLogout={handleLogout}>
      <h1 className="mb-5 text-[30px] font-bold leading-tight text-text">รายจ่าย</h1>

      <div className="mb-4 grid grid-cols-2 gap-3">
        <Card className="rounded-[20px] p-[18px_20px]">
          <p className="mb-2 text-[13px] font-medium text-sub">วันนี้</p>
          <p className="text-[26px] font-bold text-accent">{formatCurrency(todayTotal)}</p>
        </Card>
        <Card className="rounded-[20px] p-[18px_20px]">
          <p className="mb-2 text-[13px] font-medium text-sub">เดือนนี้</p>
          <p className="text-[26px] font-bold text-accent2">{formatCurrency(monthTotal)}</p>
        </Card>
      </div>

      <Card className="mb-4 rounded-[22px] p-[20px_22px]">
        <p className="mb-[14px] text-[13px] font-medium text-sub">สัปดาห์นี้</p>
        <WeekChart days={week} />
      </Card>

      <Card className="rounded-[22px] p-[20px_22px]">
        <p className="mb-3 text-[13px] font-medium text-sub">รายการวันนี้</p>

        {isLoading && <p className="text-sm text-sub">กำลังโหลด...</p>}
        {error && <p className="text-sm text-accent">{error}</p>}
        {!isLoading && !error && todayItems.length === 0 && (
          <p className="text-sm text-sub">ยังไม่มีรายการวันนี้</p>
        )}

        {visibleItems.map((item) => (
          <Link
            key={item.id}
            href={`/expenses/${item.id}`}
            className="flex items-center gap-3 py-[10px] transition-transform active:scale-[0.98]"
          >
            <Avatar category={item.category} size={38} />
            <span className="flex-1 truncate text-base font-medium text-text">{item.item}</span>
            <span className="text-base font-semibold text-text">{formatCurrency(item.amount)}</span>
          </Link>
        ))}

        {moreCount > 0 && (
          <Link
            href="/expenses"
            className="block pt-3 pb-0.5 text-center text-sm font-semibold text-accent"
          >
            ดูทั้งหมด ({moreCount} รายการเพิ่มเติม)
          </Link>
        )}
      </Card>
    </Screen>
  );
}
