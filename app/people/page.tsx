"use client";

import { useEffect, useMemo, useState } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Screen from "@/components/layout/Screen";
import PersonRow from "@/components/people/PersonRow";
import SettleDialog from "@/components/people/SettleDialog";
import { useExpenseStore } from "@/store/expenseStore";
import { useSettlementStore } from "@/store/settlementStore";
import { buildPersonBalances, summarizeBalances } from "@/lib/balances";
import { formatCurrency, formatDateShort } from "@/lib/formatters";
import type { PersonBalance } from "@/types";

export default function PeoplePage() {
  const {
    expenses,
    isLoaded: expensesLoaded,
    isLoading: expensesLoading,
    error: expensesError,
    load: loadExpenses,
  } = useExpenseStore();
  const {
    settlements,
    isLoaded: settlementsLoaded,
    isLoading: settlementsLoading,
    error: settlementsError,
    load: loadSettlements,
    remove: removeSettlement,
  } = useSettlementStore();
  const [target, setTarget] = useState<PersonBalance | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);

  useEffect(() => {
    if (!expensesLoaded) loadExpenses();
  }, [expensesLoaded, loadExpenses]);

  useEffect(() => {
    if (!settlementsLoaded) loadSettlements();
  }, [settlementsLoaded, loadSettlements]);

  // Drives the "กำลังโหลด..." text — true only while a fetch is actually in flight.
  const isLoading = expensesLoading || settlementsLoading;
  // Drives the empty-state guard below. `isLoaded` (not `isLoading`) is the
  // right gate: both flags start false and only flip true inside load(),
  // which runs from an effect that hasn't fired yet on first render (and never
  // fires during static prerendering of this route). Gating on `isLoading`
  // alone left that pre-effect window — and a failed load, which never sets
  // isLoaded — free to show "no debts" while the data simply isn't in yet.
  const bothLoaded = expensesLoaded && settlementsLoaded;

  const balances = useMemo(
    () => buildPersonBalances(expenses, settlements),
    [expenses, settlements]
  );
  const totals = useMemo(() => summarizeBalances(balances), [balances]);

  const recentSettlements = useMemo(
    () => [...settlements].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5),
    [settlements]
  );

  async function handleRemove(id: string) {
    if (removingId === id) return;
    setRemovingId(id);
    setRemoveError(null);
    try {
      await removeSettlement(id);
    } catch (err) {
      setRemoveError(err instanceof Error ? err.message : "ลบไม่สำเร็จ");
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <Screen>
      <h1 className="mb-5 text-[26px] font-bold leading-tight text-text">ค้างอยู่</h1>

      <div className="mb-4 grid grid-cols-2 gap-3">
        <Card className="rounded-[20px] p-[18px_20px]">
          <p className="mb-2 text-[13px] font-medium text-sub">ต้องกันไว้</p>
          <p className="text-[24px] font-bold text-expense">{formatCurrency(totals.reserved)}</p>
        </Card>
        <Card className="rounded-[20px] p-[18px_20px]">
          <p className="mb-2 text-[13px] font-medium text-sub">จะได้คืน</p>
          <p className="text-[24px] font-bold text-accent">{formatCurrency(totals.receivable)}</p>
        </Card>
      </div>

      {isLoading && <p className="text-sm text-sub">กำลังโหลด...</p>}
      {settlementsError && <p className="text-sm text-expense">{settlementsError}</p>}
      {expensesError && <p className="text-sm text-expense">{expensesError}</p>}

      {bothLoaded && balances.length === 0 ? (
        <p className="mt-6 text-center text-sm text-sub">ไม่มียอดค้างกับใคร</p>
      ) : (
        <Card className="mb-4 rounded-[22px] px-5 py-1">
          {balances.map((balance) => (
            <PersonRow key={balance.person} balance={balance} onSettle={setTarget} />
          ))}
        </Card>
      )}

      {recentSettlements.length > 0 && (
        <Card className="rounded-[22px] p-[20px_22px]">
          <p className="mb-3 text-[13px] font-medium text-sub">เคลียร์ล่าสุด</p>
          {removeError && <p className="mb-2 text-[13px] text-expense">{removeError}</p>}
          {recentSettlements.map((settlement) => (
            <div key={settlement.id} className="flex items-center gap-2 py-1.5 text-[13px]">
              <span className="text-sub">{formatDateShort(settlement.date)}</span>
              <span className="flex-1 truncate text-text/80">
                {settlement.direction === "received"
                  ? `รับคืนจาก${settlement.person}`
                  : `จ่ายคืน${settlement.person}`}
              </span>
              <span className="text-text">{formatCurrency(settlement.amount)}</span>
              <Button
                type="button"
                variant="ghost"
                className="px-2 py-1 text-[12px]"
                onClick={() => handleRemove(settlement.id)}
                disabled={removingId === settlement.id}
              >
                {removingId === settlement.id ? "กำลังลบ..." : "ยกเลิก"}
              </Button>
            </div>
          ))}
        </Card>
      )}

      {target && <SettleDialog target={target} onClose={() => setTarget(null)} />}
    </Screen>
  );
}
