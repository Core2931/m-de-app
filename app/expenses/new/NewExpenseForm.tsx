"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import DateField from "@/components/ui/DateField";
import CategoryPicker from "@/components/ui/CategoryPicker";
import SplitPreview from "@/components/ui/SplitPreview";
import PayPicker from "@/components/ui/PayPicker";
import PersonChips, { type RemarkSelection } from "@/components/expenses/PersonChips";
import QuickItems from "@/components/expenses/QuickItems";
import { useExpenseStore } from "@/store/expenseStore";
import { formatCurrency, formatDateShort, todayISO } from "@/lib/formatters";
import { buildFrequentItems, type FrequentItem } from "@/lib/frequentItems";
import { buildKnownPeople } from "@/lib/people";
import { hasPlaceholderPerson } from "@/lib/evenSplit";
import { DEFAULT_CATEGORY, type Category } from "@/lib/categories";
import { DEFAULT_PAY, rememberedPay } from "@/lib/payMemory";
import { choosePay, isPaidPay } from "@/lib/payMethods";
import { canSave, historyState, shownPay, sourceState } from "@/lib/saveGate";
import type { PayMethod } from "@/types";

const RECENT_CAP = 3;

interface SavedNotice {
  item: string;
  amount: number;
}

export default function NewExpenseForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sourceId = searchParams.get("from");

  const { expenses, isLoaded, error: loadError, add, load } = useExpenseStore();
  const [date, setDate] = useState(todayISO());
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<Category>(DEFAULT_CATEGORY);
  const [item, setItem] = useState("");
  const [remark, setRemark] = useState("");
  // Only a tap is stored. Until then the choice follows the item name, derived
  // during render so it cannot drift from what is typed.
  const [pickedPay, setPickedPay] = useState<PayMethod | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<SavedNotice | null>(null);
  const [saving, setSaving] = useState(false);
  const [prefilledFrom, setPrefilledFrom] = useState<string | null>(null);
  const amountRef = useRef<HTMLInputElement>(null);
  const remarkRef = useRef<HTMLInputElement>(null);

  // This form needs the store for three things now: the "เพิ่มล่าสุด" list,
  // the "รายการประจำ" chips, and resolving ?from=<id> on a cold open.
  useEffect(() => {
    if (!isLoaded) load();
  }, [isLoaded, load]);

  const source = sourceId ? expenses.find((e) => e.id === sourceId) : undefined;
  // Seeded during render rather than from an effect, matching the edit page —
  // two nearly identical forms that seed differently is how the next bug gets
  // written. Keyed on the source id so a second ?from= would re-seed, and so
  // the reset after a save (which clears prefilledFrom via the URL) sticks.
  if (source && prefilledFrom !== source.id) {
    setPrefilledFrom(source.id);
    setAmount(String(source.amount));
    setCategory(source.category);
    setItem(source.item);
    setRemark(source.remark);
    setPickedPay(null);
    // Date is deliberately NOT copied — a duplicate is today's expense.
    setDate(todayISO());
  }

  const recent = useMemo(() => {
    // Gated on isLoaded, not isLoading: before load() resolves the store is
    // empty, and an empty list here reads as "nothing saved that day".
    if (!isLoaded) return [];
    return expenses
      .filter((e) => e.date === date)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, RECENT_CAP);
  }, [expenses, date, isLoaded]);

  // Only warn about unfamiliar names once the store has actually loaded.
  // Before that the list is empty and every name looks new — the empty
  // default in SplitPreview degrades to "no warnings", which is correct.
  const knownPeople = useMemo(
    () => (isLoaded ? buildKnownPeople(expenses) : []),
    [expenses, isLoaded]
  );

  // Same isLoaded gate as above: an empty store has no habits to offer yet.
  const frequentItems = useMemo(
    () => (isLoaded ? buildFrequentItems(expenses, todayISO()) : []),
    [expenses, isLoaded]
  );

  const history = historyState({ isLoaded, error: loadError });
  const copy = sourceState(Boolean(sourceId), Boolean(source), history);
  const pay = shownPay(history, pickedPay, expenses, item);
  const savable = canSave(history, pickedPay);
  // The default is also what a new name gets, so only another value shows that
  // something was remembered.
  const payHint =
    pickedPay === null && pay !== null && pay !== DEFAULT_PAY
      ? `เลือกให้ตามครั้งก่อนของ “${item.trim()}”`
      : undefined;

  /** The success banner must not outlive the entry it describes — left up
   *  while the next expense is being typed, it reads as confirmation of THAT
   *  one. Every field change clears it. */
  function edit<T>(setter: (value: T) => void) {
    return (value: T) => {
      setSaved(null);
      setter(value);
    };
  }

  function insertIntoRemark(text: string, selection: RemarkSelection) {
    edit(setRemark)(text);
    // After the state commit, select what needs filling in — the empty
    // brackets for a name chip, the "?" for an even split.
    requestAnimationFrame(() => {
      remarkRef.current?.focus();
      remarkRef.current?.setSelectionRange(selection.start, selection.end);
    });
  }

  function applyQuickItem(entry: FrequentItem) {
    setSaved(null);
    setPickedPay(null);
    setItem(entry.item);
    setCategory(entry.category);
    setAmount(String(entry.amount));
    // Remark is deliberately NOT filled: it carries the split, and yesterday's
    // split landing silently on today's row puts money on the wrong person.
    // The amount is the one thing that changes day to day, so leave it
    // selected — typing replaces it, saving as-is keeps it. select() rather
    // than setSelectionRange, which type="number" inputs do not support.
    requestAnimationFrame(() => {
      amountRef.current?.focus();
      amountRef.current?.select();
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // The button is disabled in these cases; this covers any other way in.
    if (!savable || pay === null) return;
    setError(null);
    setSaved(null);
    const amountNum = Number(amount);
    if (!item.trim()) {
      setError("กรอกรายการ");
      return;
    }
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      setError("จำนวนเงินไม่ถูกต้อง");
      return;
    }
    if (hasPlaceholderPerson(remark)) {
      setError("ใส่ชื่อคนที่หารด้วยก่อนบันทึก");
      return;
    }
    setSaving(true);
    try {
      const trimmedItem = item.trim();
      // Resolved at save time, not at tap time: the name can change after the
      // tap, and it decides whether "โอนแล้ว" belongs to a month-end item.
      const storedPay = choosePay(pay, rememberedPay(expenses, trimmedItem));
      await add({
        date,
        item: trimmedItem,
        amount: amountNum,
        remark: remark.trim(),
        category,
        pay: storedPay,
        ...(isPaidPay(storedPay) ? { paidAt: todayISO() } : {}),
      });
      setSaved({ item: trimmedItem, amount: amountNum });
      // Date and category survive on purpose: entering several rows for the
      // same day, and usually the same kind, is the reason to stay here.
      setAmount("");
      setItem("");
      setRemark("");
      setPickedPay(null);
      if (sourceId) {
        // Drop ?from= so a refresh does not re-prefill and quietly file a
        // third copy. prefilledFrom deliberately KEEPS the source id:
        // router.replace does not land until a later render, so clearing it
        // here would let the seed block below fire once more on the very next
        // render and repopulate the fields we just emptied.
        router.replace("/expenses/new");
      }
      amountRef.current?.focus();
    } catch (err) {
      setError(err instanceof Error ? err.message : "บันทึกไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  // Never render an empty form that is about to be overwritten: if the user
  // starts typing into it, the prefill lands on top and eats what they wrote.
  if (copy === "waiting") {
    return (
      <Card className="rounded-[22px] p-[22px]">
        <p className="text-sm text-sub">กำลังโหลด...</p>
      </Card>
    );
  }

  // The same reason covers a failed load: a retry that succeeds would prefill
  // over anything typed meanwhile, so no form is offered under this address.
  if (copy === "failed") {
    return (
      <Card className="rounded-[22px] p-[22px]">
        <p role="alert" className="text-sm text-danger">
          โหลดรายการต้นทางไม่สำเร็จ
        </p>
        <div className="mt-4 flex gap-3">
          <Button type="button" onClick={() => load()} className="flex-1">
            โหลดใหม่
          </Button>
          <Button type="button" variant="ghost" onClick={() => router.replace("/expenses/new")}>
            กรอกเอง
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card className="rounded-[22px] p-[22px]">
        {copy === "missing" && (
          <p className="mb-3 text-[13px] text-sub">
            ไม่พบรายการต้นทาง — กรอกใหม่ได้ตามปกติ
          </p>
        )}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <QuickItems items={frequentItems} onPick={applyQuickItem} />
          <DateField label="วันที่" value={date} onChange={edit(setDate)} required />
          <Input
            ref={amountRef}
            label="จำนวนเงิน"
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            placeholder="0"
            value={amount}
            onChange={(e) => edit(setAmount)(e.target.value)}
            autoFocus
            required
          />
          <div className="flex flex-col gap-2">
            <span className="text-[13px] font-medium text-sub">หมวดหมู่</span>
            <CategoryPicker value={category} onChange={edit(setCategory)} />
          </div>
          <Input
            label="รายการ"
            value={item}
            onChange={(e) => edit(setItem)(e.target.value)}
            placeholder="เช่น ข้าวเที่ยง"
            required
          />
          <PayPicker value={pay} onChange={edit(setPickedPay)} hint={payHint} />
          <div className="flex flex-col gap-2">
            <Input
              ref={remarkRef}
              label="หมายเหตุ"
              value={remark}
              onChange={(e) => edit(setRemark)(e.target.value)}
              placeholder="(ถ้ามี) เช่น ขนม: [50] ค่าอาหาร"
            />
            <PersonChips
              known={knownPeople}
              remark={remark}
              amount={amount}
              onInsert={insertIntoRemark}
            />
            <SplitPreview remark={remark} knownPeople={knownPeople} />
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
          {saved && (
            <p className="text-sm text-accent">
              ✓ บันทึกแล้ว · {saved.item} {formatCurrency(saved.amount)}
            </p>
          )}
          {history === "failed" && (
            <div role="alert" className="flex items-center justify-between gap-3">
              <p className="text-sm text-danger">
                โหลดรายการเก่าไม่สำเร็จ เลือก “จ่ายด้วย” เองก่อนบันทึก
              </p>
              <Button
                type="button"
                variant="ghost"
                onClick={() => load()}
                className="min-h-11 shrink-0 py-2.5 text-[14px]"
              >
                โหลดใหม่
              </Button>
            </div>
          )}
          <Button type="submit" disabled={saving || !savable} className="mt-1.5 w-full">
            {saving ? "กำลังบันทึก..." : history === "loading" ? "กำลังโหลด..." : "บันทึก"}
          </Button>
        </form>
      </Card>

      {recent.length > 0 && (
        <Card className="mt-4 rounded-[22px] p-[20px_22px]">
          {/* Names the selected date rather than saying "วันนี้" — the date
              field is editable, so the list is not always today's. */}
          <p className="mb-2 text-[13px] font-medium text-sub">
            เพิ่มล่าสุด · {formatDateShort(date)}
          </p>
          {recent.map((entry) => (
            <div key={entry.id} className="flex items-center gap-2 py-1.5 text-[14px]">
              <span className="flex-1 truncate text-text">{entry.item}</span>
              <span className="font-semibold tabular-nums text-expense">
                {formatCurrency(entry.amount)}
              </span>
            </div>
          ))}
        </Card>
      )}
    </>
  );
}
