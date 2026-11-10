"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import DateField from "@/components/ui/DateField";
import Screen from "@/components/layout/Screen";
import CategoryFilter from "@/components/expenses/CategoryFilter";
import CycleButtons from "@/components/expenses/CycleButtons";
import ExpenseRow from "@/components/expenses/ExpenseRow";
import PeriodSummary from "@/components/expenses/PeriodSummary";
import { useExpenseStore, selectDailyTotals } from "@/store/expenseStore";
import { useBudgetStore } from "@/store/budgetStore";
import { useSettlementStore } from "@/store/settlementStore";
import { cn } from "@/lib/utils";
import { formatCurrency, formatDate, formatDateShort, todayISO } from "@/lib/formatters";
import { cycleFor } from "@/lib/payCycle";
import { isISODate } from "@/lib/isoDays";
import { summarizeExpense } from "@/lib/splits";
import { summarizePeriod } from "@/lib/periodSplits";
import { buildScopeLabel } from "@/lib/scopeLabel";
import { matchesQuery, parseQuery } from "@/lib/search";
import { categoryTrends } from "@/lib/categoryTrend";
import { dayPaceMap } from "@/lib/dayPace";
import { outstandingByExpense } from "@/lib/outstanding";
import { type Category } from "@/lib/categories";

// Same colours as today's number on Home and the calendar: one meaning everywhere.
const LEVEL_TEXT = ["text-sub", "text-pace-1", "text-pace-2", "text-danger"] as const;

type SortMode = "date" | "amount";

const CHIP =
  "hit-area rounded-full border px-3 py-1.5 text-[13px] font-medium transition-transform active:scale-95";

export default function ExpensesPage() {
  const { expenses, isLoaded, isLoading, error, load } = useExpenseStore();
  const { budgets, isLoaded: budgetsLoaded, load: loadBudgets } = useBudgetStore();
  const {
    settlements,
    isLoaded: settlementsLoaded,
    load: loadSettlements,
  } = useSettlementStore();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [query, setQuery] = useState("");
  const [onlyOutstanding, setOnlyOutstanding] = useState(false);
  const [sort, setSort] = useState<SortMode>("date");
  // Every keystroke re-runs summarizePeriod over the survivors, which parses
  // each remark with three regexes. Deferring keeps the field itself typing at
  // full speed while the list catches up.
  const deferredQuery = useDeferredValue(query);

  // Opens on the current salary cycle instead of the whole sheet. Seeded from
  // an effect rather than useState's initializer because this route is
  // statically prerendered: reading "now" during render would bake the
  // build-time cycle into the HTML and mismatch the visitor's on hydration.
  // Running client-only costs nothing visually — the store is still empty on
  // first paint, so the list never flashes unfiltered. Empty deps on purpose:
  // this seeds once, and clearing the field afterwards must stay cleared.
  //
  // A "?date=YYYY-MM-DD" (the home calendar links here) narrows it to that one
  // day instead. Read from window, not useSearchParams, which would need a
  // Suspense boundary around a page that is deliberately static.
  useEffect(() => {
    const date = new URLSearchParams(window.location.search).get("date");
    if (date && isISODate(date)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFrom(date);
      setTo(date);
      return;
    }
    setFrom(cycleFor(todayISO()).start);
  }, []);

  // Always loads every expense, never just the visible range: /people derives
  // balances and Home derives the calendar from this same store, and whoever
  // mounts first wins the `!isLoaded` race. Narrowing the fetch here would
  // silently reduce those screens to one month of history.
  useEffect(() => {
    if (!isLoaded) load();
  }, [isLoaded, load]);

  // Budgets colour the day headings and settlements mark what is still open;
  // both are optional, so the list renders without them and fills in later.
  useEffect(() => {
    if (!budgetsLoaded) loadBudgets();
  }, [budgetsLoaded, loadBudgets]);

  useEffect(() => {
    if (!settlementsLoaded) loadSettlements();
  }, [settlementsLoaded, loadSettlements]);

  const terms = useMemo(() => parseQuery(deferredQuery), [deferredQuery]);

  const outstanding = useMemo(
    () => (settlementsLoaded ? outstandingByExpense(expenses, settlements) : new Map()),
    [expenses, settlements, settlementsLoaded]
  );

  const matching = useMemo(() => {
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

  const outstandingCount = useMemo(
    () => matching.filter((e) => outstanding.has(e.id)).length,
    [matching, outstanding]
  );

  const filtered = useMemo(
    () => (onlyOutstanding ? matching.filter((e) => outstanding.has(e.id)) : matching),
    [matching, onlyOutstanding, outstanding]
  );

  const dailyTotals = useMemo(() => selectDailyTotals(filtered), [filtered]);
  const byAmount = useMemo(
    () => (sort === "amount" ? [...filtered].sort((a, b) => b.amount - a.amount) : []),
    [filtered, sort]
  );
  const period = useMemo(() => summarizePeriod(filtered), [filtered]);
  const scopeLabel = useMemo(
    () => buildScopeLabel({ from, to, categories, query: deferredQuery }),
    [from, to, categories, deferredQuery]
  );

  // A day is judged against its cycle's budget using EVERYTHING spent that
  // day. With a filter on, the heading shows only part of the day, so a colour
  // earned by the whole day would sit next to the wrong number: no colour then.
  const judgeDays =
    budgetsLoaded && categories.length === 0 && !deferredQuery.trim() && !onlyOutstanding;
  const paceByDay = useMemo(
    () =>
      judgeDays
        ? dayPaceMap({ expenses, budgets, dates: dailyTotals.map((d) => d.date) })
        : null,
    [judgeDays, expenses, budgets, dailyTotals]
  );

  // Needs the cycle's own range and no text search: a search narrows the
  // current figures but not the earlier cycle's, which would compare unlike.
  const trends = useMemo(() => {
    if (!isLoaded || deferredQuery.trim() || onlyOutstanding) return null;
    return categoryTrends({
      expenses,
      from,
      to,
      today: todayISO(),
      current: new Map(period.byCategory.map((c) => [c.category, c.total])),
    });
  }, [isLoaded, expenses, from, to, period, deferredQuery, onlyOutstanding]);

  return (
    <Screen>
      <h1 className="mb-5 text-[26px] font-bold leading-tight text-text">รายการจ่าย</h1>

      <div className="mb-2 grid grid-cols-2 gap-3">
        <DateField label="จากวันที่" value={from} onChange={setFrom} filled align="left" />
        <DateField label="ถึงวันที่" value={to} onChange={setTo} filled align="right" />
      </div>

      <div className="mb-3">
        <CycleButtons
          from={from}
          onPick={(nextFrom, nextTo) => {
            setFrom(nextFrom);
            setTo(nextTo);
          }}
        />
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

      <div className="mb-3">
        <CategoryFilter selected={categories} onChange={setCategories} />
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        {/* Hidden while nothing is open, unless it is on: a filter that is on
            and has nothing to show must still be possible to turn off. */}
        {outstandingCount > 0 || onlyOutstanding ? (
          <button
            type="button"
            onClick={() => setOnlyOutstanding((v) => !v)}
            aria-pressed={onlyOutstanding}
            className={cn(
              CHIP,
              onlyOutstanding
                ? "border-accent bg-accent-soft text-accent"
                : "border-border bg-card text-sub"
            )}
          >
            ค้างอยู่ {outstandingCount}
          </button>
        ) : (
          <span />
        )}

        <div
          role="group"
          aria-label="เรียงรายการ"
          className="flex overflow-hidden rounded-full border border-border bg-card text-[13px] font-medium"
        >
          {(
            [
              ["date", "ตามวัน"],
              ["amount", "ยอดมาก"],
            ] as const
          ).map(([mode, label]) => (
            <button
              key={mode}
              type="button"
              onClick={() => setSort(mode)}
              aria-pressed={sort === mode}
              className={cn(
                "px-3 py-1.5",
                sort === mode ? "bg-accent-soft font-semibold text-accent" : "text-sub"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Gated on isLoaded, not just on filtered.length — before load() resolves
          the store is empty, and a ฿0 summary reads as a real answer. */}
      {isLoaded && filtered.length > 0 && (
        <PeriodSummary
          summary={period}
          scopeLabel={scopeLabel}
          count={filtered.length}
          trends={trends}
        />
      )}

      {isLoading && <p className="text-sm text-sub">กำลังโหลด...</p>}
      {error && <p className="text-sm text-danger">{error}</p>}
      {!isLoading && !error && filtered.length === 0 && (
        <p className="text-center text-sm text-sub">ไม่มีรายการ</p>
      )}

      {sort === "amount" ? (
        filtered.length > 0 && (
          <Card className="rounded-[20px] px-5 py-1">
            {byAmount.map((item) => (
              <ExpenseRow
                key={item.id}
                expense={item}
                outstanding={outstanding.get(item.id)}
                note={formatDateShort(item.date)}
              />
            ))}
          </Card>
        )
      ) : (
        <div className="flex flex-col gap-4">
          {dailyTotals.map((day) => {
            const mine = day.items.reduce((sum, item) => sum + summarizeExpense(item).myShare, 0);
            const pace = paceByDay?.get(day.date);
            const level = pace?.level ?? 0;
            const overBy =
              pace && pace.allowance !== null && level > 0 ? pace.spent - pace.allowance : 0;
            const differs = Math.round((mine - day.total) * 100) !== 0;
            return (
              <div key={day.date}>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[13px] font-medium text-sub">{formatDate(day.date)}</span>
                  <span
                    className={cn("text-[13px] font-semibold tabular-nums", LEVEL_TEXT[level])}
                  >
                    {/* Words as well as colour, so the level is not carried by
                        hue alone. */}
                    {overBy > 0 && <>เกิน {formatCurrency(overBy)} · </>}
                    {differs && (
                      <span className="font-medium text-sub">
                        {formatCurrency(day.total)} · ของฉัน{" "}
                      </span>
                    )}
                    {formatCurrency(mine)}
                  </span>
                </div>
                <Card className="rounded-[20px] px-5 py-1">
                  {day.items.map((item) => (
                    <ExpenseRow key={item.id} expense={item} outstanding={outstanding.get(item.id)} />
                  ))}
                </Card>
              </div>
            );
          })}
        </div>
      )}
    </Screen>
  );
}
