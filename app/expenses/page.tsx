"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Avatar from "@/components/ui/Avatar";
import DateField from "@/components/ui/DateField";
import Screen from "@/components/layout/Screen";
import CategoryFilter from "@/components/expenses/CategoryFilter";
import PeriodSummary from "@/components/expenses/PeriodSummary";
import { useExpenseStore, selectDailyTotals } from "@/store/expenseStore";
import { formatCurrency, formatDate, monthStartISO } from "@/lib/formatters";
import { summarizeExpense } from "@/lib/splits";
import { summarizePeriod } from "@/lib/periodSplits";
import { buildScopeLabel } from "@/lib/scopeLabel";
import { matchesQuery, parseQuery } from "@/lib/search";
import { type Category } from "@/lib/categories";

export default function ExpensesPage() {
  const { expenses, isLoaded, isLoading, error, load } = useExpenseStore();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [query, setQuery] = useState("");
  // Every keystroke re-runs summarizePeriod over the survivors, which parses
  // each remark with three regexes. Deferring keeps the field itself typing at
  // full speed while the list catches up.
  const deferredQuery = useDeferredValue(query);

  // Opens on the current month instead of the whole sheet. Seeded from an
  // effect rather than useState's initializer because this route is statically
  // prerendered: reading "now" during render would bake the build-time month
  // into the HTML and mismatch the visitor's month on hydration. Running
  // client-only costs nothing visually — the store is still empty on first
  // paint, so the list never flashes unfiltered. Empty deps on purpose: this
  // seeds once, and clearing the field afterwards must stay cleared.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFrom(monthStartISO());
  }, []);

  // Always loads every expense, never just the visible range: /people derives
  // balances and Home derives the week chart from this same store, and whoever
  // mounts first wins the `!isLoaded` race. Narrowing the fetch here would
  // silently reduce those screens to one month of history.
  useEffect(() => {
    if (!isLoaded) load();
  }, [isLoaded, load]);

  const terms = useMemo(() => parseQuery(deferredQuery), [deferredQuery]);

  const filtered = useMemo(() => {
    return expenses.filter((e) => {
      if (from && e.date < from) return false;
      if (to && e.date > to) return false;
      // Empty selection means "no category filter", not "match nothing".
      if (categories.length > 0 && !categories.includes(e.category)) return false;
      // Last on purpose: the cheap date and category rejects run first, so the
      // string work only touches rows that already survived them.
      if (!matchesQuery(e, terms)) return false;
      return true;
    });
  }, [expenses, from, to, categories, terms]);

  const dailyTotals = useMemo(() => selectDailyTotals(filtered), [filtered]);
  const period = useMemo(() => summarizePeriod(filtered), [filtered]);
  const scopeLabel = useMemo(
    () => buildScopeLabel({ from, to, categories, query: deferredQuery }),
    [from, to, categories, deferredQuery]
  );

  return (
    <Screen>
      <h1 className="mb-5 text-[26px] font-bold leading-tight text-text">รายการรายจ่าย</h1>

      <div className="mb-3 grid grid-cols-2 gap-3">
        <DateField label="จากวันที่" value={from} onChange={setFrom} filled align="left" />
        <DateField label="ถึงวันที่" value={to} onChange={setTo} filled align="right" />
      </div>

      <div className="mb-3">
        <Input
          type="search"
          filled
          placeholder="ค้นหารายการหรือหมายเหตุ"
          aria-label="ค้นหารายการ"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="mb-4">
        <CategoryFilter selected={categories} onChange={setCategories} />
      </div>

      {/* Gated on isLoaded, not just on filtered.length — before load() resolves
          the store is empty, and a ฿0 summary reads as a real answer. */}
      {isLoaded && filtered.length > 0 && (
        <PeriodSummary summary={period} scopeLabel={scopeLabel} />
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
              {day.items.map((item) => {
                const summary = summarizeExpense(item);
                const hasSplit = summary.splits.length > 0;
                return (
                  <Link
                    key={item.id}
                    href={`/expenses/${item.id}`}
                    className="flex items-center gap-3 py-3 transition-transform active:scale-[0.98]"
                  >
                    <Avatar category={item.category} size={34} />
                    <span className="flex-1 truncate text-[15px] font-medium text-text">
                      {item.item}
                    </span>
                    {summary.invalid && <span className="text-[13px] text-expense">⚠</span>}
                    {hasSplit && (
                      <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-medium text-accent">
                        ของฉัน {formatCurrency(summary.myShare)}
                      </span>
                    )}
                    <span className="text-[15px] font-semibold text-expense">
                      {formatCurrency(item.amount)}
                    </span>
                  </Link>
                );
              })}
            </Card>
          </div>
        ))}
      </div>
    </Screen>
  );
}
