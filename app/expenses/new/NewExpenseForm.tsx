"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import DateField from "@/components/ui/DateField";
import CategoryPicker from "@/components/ui/CategoryPicker";
import SplitPreview from "@/components/ui/SplitPreview";
import PersonChips from "@/components/expenses/PersonChips";
import { useExpenseStore } from "@/store/expenseStore";
import { formatCurrency, formatDateShort, todayISO } from "@/lib/formatters";
import { buildKnownPeople } from "@/lib/people";
import { DEFAULT_CATEGORY, type Category } from "@/lib/categories";

const RECENT_CAP = 3;

interface SavedNotice {
  item: string;
  amount: number;
}

export default function NewExpenseForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sourceId = searchParams.get("from");

  const { expenses, isLoaded, add, load } = useExpenseStore();
  const [date, setDate] = useState(todayISO());
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<Category>(DEFAULT_CATEGORY);
  const [item, setItem] = useState("");
  const [remark, setRemark] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<SavedNotice | null>(null);
  const [saving, setSaving] = useState(false);
  const [prefilledFrom, setPrefilledFrom] = useState<string | null>(null);
  const amountRef = useRef<HTMLInputElement>(null);
  const remarkRef = useRef<HTMLInputElement>(null);

  // This form needs the store for two things now: the "เพิ่มล่าสุด" list, and
  // resolving ?from=<id> on a cold open.
  useEffect(() => {
    if (!isLoaded) load();
  }, [isLoaded, load]);

  const source = sourceId ? expenses.find((e) => e.id === sourceId) : undefined;
  // Waiting means: a source was asked for, it has not been found, and the
  // store has not finished loading — so it may still turn up.
  const waitingForSource = Boolean(sourceId) && !source && !isLoaded;
  const sourceMissing = Boolean(sourceId) && !source && isLoaded;

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

  /** The success banner must not outlive the entry it describes — left up
   *  while the next expense is being typed, it reads as confirmation of THAT
   *  one. Every field change clears it. */
  function edit<T>(setter: (value: T) => void) {
    return (value: T) => {
      setSaved(null);
      setter(value);
    };
  }

  function insertPerson(text: string, caret: number) {
    edit(setRemark)(text);
    // After the state commit, put the cursor between the brackets so the
    // amount can be typed straight away.
    requestAnimationFrame(() => {
      remarkRef.current?.focus();
      remarkRef.current?.setSelectionRange(caret, caret);
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
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
    setSaving(true);
    try {
      const trimmedItem = item.trim();
      await add({ date, item: trimmedItem, amount: amountNum, remark: remark.trim(), category });
      setSaved({ item: trimmedItem, amount: amountNum });
      // Date and category survive on purpose: entering several rows for the
      // same day, and usually the same kind, is the reason to stay here.
      setAmount("");
      setItem("");
      setRemark("");
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
  if (waitingForSource) {
    return (
      <Card className="rounded-[22px] p-[22px]">
        <p className="text-sm text-sub">กำลังโหลด...</p>
      </Card>
    );
  }

  return (
    <>
      <Card className="rounded-[22px] p-[22px]">
        {sourceMissing && (
          <p className="mb-3 text-[13px] text-sub">
            ไม่พบรายการต้นทาง — กรอกใหม่ได้ตามปกติ
          </p>
        )}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
          <div className="flex flex-col gap-2">
            <Input
              ref={remarkRef}
              label="หมายเหตุ"
              value={remark}
              onChange={(e) => edit(setRemark)(e.target.value)}
              placeholder="(ถ้ามี) เช่น ขนม: [50] ค่าอาหาร"
            />
            <PersonChips known={knownPeople} remark={remark} onInsert={insertPerson} />
            <SplitPreview remark={remark} knownPeople={knownPeople} />
          </div>
          {error && <p className="text-sm text-accent">{error}</p>}
          {saved && (
            <p className="text-sm text-accent">
              ✓ บันทึกแล้ว · {saved.item} {formatCurrency(saved.amount)}
            </p>
          )}
          <Button type="submit" disabled={saving} className="mt-1.5 w-full">
            {saving ? "กำลังบันทึก..." : "บันทึก"}
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
