"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import GlassCard from "@/components/ui/GlassCard";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import BottomNav from "@/components/layout/BottomNav";
import { useExpenseStore } from "@/store/expenseStore";
import { todayISO } from "@/lib/formatters";

export default function NewExpensePage() {
  const router = useRouter();
  const add = useExpenseStore((s) => s.add);
  const [date, setDate] = useState(todayISO());
  const [item, setItem] = useState("");
  const [amount, setAmount] = useState("");
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
      await add({ date, item: item.trim(), amount: amountNum, remark: remark.trim() });
      router.push("/expenses");
    } catch (err) {
      setError(err instanceof Error ? err.message : "บันทึกไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="flex-1 flex flex-col p-4 pb-28 max-w-md mx-auto w-full gap-4">
      <h1 className="text-white text-xl font-semibold">เพิ่มรายจ่าย</h1>

      <GlassCard>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input label="วันที่" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
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
          <Input
            label="รายการ"
            value={item}
            onChange={(e) => setItem(e.target.value)}
            placeholder="เช่น ข้าวเช้า"
            required
          />
          <Input label="หมายเหตุ" value={remark} onChange={(e) => setRemark(e.target.value)} placeholder="(ถ้ามี)" />
          {error && <p className="text-red-200 text-sm">{error}</p>}
          <Button type="submit" disabled={saving} className="w-full justify-center">
            {saving ? "กำลังบันทึก..." : "บันทึก"}
          </Button>
        </form>
      </GlassCard>

      <BottomNav />
    </main>
  );
}
