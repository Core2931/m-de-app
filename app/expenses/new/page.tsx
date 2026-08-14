"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import DateField from "@/components/ui/DateField";
import CategoryPicker from "@/components/ui/CategoryPicker";
import SplitPreview from "@/components/ui/SplitPreview";
import Screen from "@/components/layout/Screen";
import { useExpenseStore } from "@/store/expenseStore";
import { formatCurrency, formatDateShort, todayISO } from "@/lib/formatters";
import { DEFAULT_CATEGORY, type Category } from "@/lib/categories";

const RECENT_CAP = 3;

interface SavedNotice {
  item: string;
  amount: number;
}

export default function NewExpensePage() {
  const { expenses, isLoaded, add, load } = useExpenseStore();
  const [date, setDate] = useState(todayISO());
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<Category>(DEFAULT_CATEGORY);
  const [item, setItem] = useState("");
  const [remark, setRemark] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<SavedNotice | null>(null);
  const [saving, setSaving] = useState(false);
  const amountRef = useRef<HTMLInputElement>(null);

  // This page never loaded the store before, because it only ever wrote to it
  // and then navigated away. Now that it stays put it needs the data to show
  // what has already been entered today.
  useEffect(() => {
    if (!isLoaded) load();
  }, [isLoaded, load]);

  // Gated on isLoaded, not isLoading: before the effect above resolves the
  // store is empty, and an empty list here reads as "nothing saved today" —
  // the exact lie this app has had to fix three times elsewhere.
  const recent = useMemo(() => {
    if (!isLoaded) return [];
    return expenses
      .filter((e) => e.date === date)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, RECENT_CAP);
  }, [expenses, date, isLoaded]);

  /** The success banner must not outlive the entry it describes — left up
   *  while the next expense is being typed, it reads as confirmation of THAT
   *  one. Every field change clears it. */
  function edit<T>(setter: (value: T) => void) {
    return (value: T) => {
      setSaved(null);
      setter(value);
    };
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
      amountRef.current?.focus();
    } catch (err) {
      setError(err instanceof Error ? err.message : "บันทึกไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen>
      <h1 className="mb-5 text-[26px] font-bold leading-tight text-text">เพิ่มรายจ่าย</h1>

      <Card className="rounded-[22px] p-[22px]">
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
              label="หมายเหตุ"
              value={remark}
              onChange={(e) => edit(setRemark)(e.target.value)}
              placeholder="(ถ้ามี) เช่น ขนม: [50] ค่าอาหาร"
            />
            <SplitPreview remark={remark} />
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
    </Screen>
  );
}
