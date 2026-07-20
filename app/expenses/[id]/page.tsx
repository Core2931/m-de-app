"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import GlassCard from "@/components/ui/GlassCard";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import BottomNav from "@/components/layout/BottomNav";
import { useExpenseStore } from "@/store/expenseStore";

export default function EditExpensePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { expenses, isLoaded, load, update, remove } = useExpenseStore();

  useEffect(() => {
    if (!isLoaded) load();
  }, [isLoaded, load]);

  const expense = expenses.find((e) => e.id === params.id);

  const [date, setDate] = useState("");
  const [item, setItem] = useState("");
  const [amount, setAmount] = useState("");
  const [remark, setRemark] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [initializedId, setInitializedId] = useState<string | null>(null);
  const initialized = initializedId === expense?.id;

  // Adjust form state during render when a new expense loads, instead of
  // an effect, to avoid an extra cascading render (react-hooks/set-state-in-effect).
  if (expense && !initialized) {
    setInitializedId(expense.id);
    setDate(expense.date);
    setItem(expense.item);
    setAmount(String(expense.amount));
    setRemark(expense.remark);
  }

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
      await update(params.id, { date, item: item.trim(), amount: amountNum, remark: remark.trim() });
      router.push("/expenses");
    } catch (err) {
      setError(err instanceof Error ? err.message : "แก้ไขไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm("ลบรายการนี้?")) return;
    setSaving(true);
    try {
      await remove(params.id);
      router.push("/expenses");
    } catch (err) {
      setError(err instanceof Error ? err.message : "ลบไม่สำเร็จ");
      setSaving(false);
    }
  }

  if (isLoaded && !expense) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center p-4 gap-3">
        <p className="text-white">ไม่พบรายการ</p>
        <Button variant="ghost" onClick={() => router.push("/expenses")}>
          กลับไปหน้ารายการ
        </Button>
      </main>
    );
  }

  return (
    <main className="flex-1 flex flex-col p-4 pb-28 max-w-md mx-auto w-full gap-4">
      <h1 className="text-white text-xl font-semibold">แก้ไขรายจ่าย</h1>

      <GlassCard>
        {!initialized ? (
          <p className="text-white/50 text-sm">กำลังโหลด...</p>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input label="วันที่" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            <Input
              label="จำนวนเงิน"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
            <Input label="รายการ" value={item} onChange={(e) => setItem(e.target.value)} required />
            <Input label="หมายเหตุ" value={remark} onChange={(e) => setRemark(e.target.value)} />
            {error && <p className="text-red-200 text-sm">{error}</p>}
            <div className="flex gap-3">
              <Button type="submit" disabled={saving} className="flex-1 justify-center">
                {saving ? "กำลังบันทึก..." : "บันทึก"}
              </Button>
              <Button type="button" variant="danger" disabled={saving} onClick={handleDelete}>
                ลบ
              </Button>
            </div>
          </form>
        )}
      </GlassCard>

      <BottomNav />
    </main>
  );
}
