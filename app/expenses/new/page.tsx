"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import DateField from "@/components/ui/DateField";
import CategoryPicker from "@/components/ui/CategoryPicker";
import Screen from "@/components/layout/Screen";
import { useExpenseStore } from "@/store/expenseStore";
import { todayISO } from "@/lib/formatters";
import { DEFAULT_CATEGORY, type Category } from "@/lib/categories";

export default function NewExpensePage() {
  const router = useRouter();
  const add = useExpenseStore((s) => s.add);
  const [date, setDate] = useState(todayISO());
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<Category>(DEFAULT_CATEGORY);
  const [item, setItem] = useState("");
  const [remark, setRemark] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
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
      await add({ date, item: item.trim(), amount: amountNum, remark: remark.trim(), category });
      router.push("/");
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
          <DateField label="วันที่" value={date} onChange={setDate} required />
          <Input
            label="จำนวนเงิน"
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            placeholder="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            autoFocus
            required
          />
          <div className="flex flex-col gap-2">
            <span className="text-[13px] font-medium text-sub">หมวดหมู่</span>
            <CategoryPicker value={category} onChange={setCategory} />
          </div>
          <Input
            label="รายการ"
            value={item}
            onChange={(e) => setItem(e.target.value)}
            placeholder="เช่น ข้าวเที่ยง"
            required
          />
          <Input label="หมายเหตุ" value={remark} onChange={(e) => setRemark(e.target.value)} placeholder="(ถ้ามี)" />
          {error && <p className="text-sm text-accent">{error}</p>}
          <Button type="submit" disabled={saving} className="mt-1.5 w-full">
            {saving ? "กำลังบันทึก..." : "บันทึก"}
          </Button>
        </form>
      </Card>
    </Screen>
  );
}
