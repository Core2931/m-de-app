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
  selectMyShareForDate,
  selectMyShareForMonth,
  selectWeek,
} from "@/store/expenseStore";
import { useSettlementStore } from "@/store/settlementStore";
import { buildPersonBalances, summarizeBalances } from "@/lib/balances";
import { formatCurrency, todayISO, currentMonthISO } from "@/lib/formatters";

const TODAY_CAP = 4;

export default function DashboardPage() {
  const router = useRouter();
  const { expenses, isLoaded, isLoading, error, load } = useExpenseStore();
  const {
    settlements,
    isLoaded: settlementsLoaded,
    load: loadSettlements,
  } = useSettlementStore();

  useEffect(() => {
    if (!isLoaded) load();
  }, [isLoaded, load]);

  useEffect(() => {
    if (!settlementsLoaded) loadSettlements();
  }, [settlementsLoaded, loadSettlements]);

  const today = todayISO();
  const month = currentMonthISO();
  const todayTotal = selectTotalForDate(expenses, today);
  const monthTotal = selectTotalForMonth(expenses, month);
  const week = selectWeek(expenses);
  const todayMyShare = selectMyShareForDate(expenses, today);
  const monthMyShare = selectMyShareForMonth(expenses, month);
  const totals = summarizeBalances(buildPersonBalances(expenses, settlements));
  const hasOutstanding = totals.reserved > 0 || totals.receivable > 0;

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
          <p className="text-[26px] font-bold text-expense">{formatCurrency(todayTotal)}</p>
          {todayMyShare !== todayTotal && (
            <p className="mt-1 text-[12px] text-sub">ของฉัน {formatCurrency(todayMyShare)}</p>
          )}
        </Card>
        <Card className="rounded-[20px] p-[18px_20px]">
          <p className="mb-2 text-[13px] font-medium text-sub">เดือนนี้</p>
          <p className="text-[26px] font-bold text-expense">{formatCurrency(monthTotal)}</p>
          {monthMyShare !== monthTotal && (
            <p className="mt-1 text-[12px] text-sub">ของฉัน {formatCurrency(monthMyShare)}</p>
          )}
        </Card>
      </div>

      {hasOutstanding && (
        <Link href="/people" className="mb-4 block transition-transform active:scale-[0.98]">
          <Card className="rounded-[22px] p-[18px_22px]">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[13px] font-medium text-sub">ค้างอยู่</p>
              <span className="text-[13px] font-semibold text-accent">ดูทั้งหมด →</span>
            </div>
            <div className="flex gap-6">
              <div>
                <p className="text-[12px] text-sub">ต้องกันไว้</p>
                <p className="text-[20px] font-bold text-expense">
                  {formatCurrency(totals.reserved)}
                </p>
              </div>
              <div>
                <p className="text-[12px] text-sub">จะได้คืน</p>
                <p className="text-[20px] font-bold text-accent">
                  {formatCurrency(totals.receivable)}
                </p>
              </div>
            </div>
          </Card>
        </Link>
      )}

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
            <span className="text-base font-semibold text-expense">{formatCurrency(item.amount)}</span>
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
