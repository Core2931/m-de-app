"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import CategoryPicker from "@/components/ui/CategoryPicker";
import Screen from "@/components/layout/Screen";
import { useExpenseStore } from "@/store/expenseStore";
import { DEFAULT_CATEGORY, type Category } from "@/lib/categories";

export default function EditExpensePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { expenses, isLoaded, load, update, remove } = useExpenseStore();

  useEffect(() => {
    if (!isLoaded) load();
  }, [isLoaded, load]);

  const expense = expenses.find((e) => e.id === params.id);

  const [date, setDate] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<Category>(DEFAULT_CATEGORY);
  const [item, setItem] = useState("");
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
    setAmount(String(expense.amount));
    setCategory(expense.category);
    setItem(expense.item);
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
      await update(params.id, { date, item: item.trim(), amount: amountNum, remark: remark.trim(), category });
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
      <Screen>
        <div className="flex flex-col items-center gap-3 py-20">
          <p className="text-text">ไม่พบรายการ</p>
          <Button variant="ghost" onClick={() => router.push("/expenses")}>
            กลับไปหน้ารายการ
          </Button>
        </div>
      </Screen>
    );
  }

  return (
    <Screen>
      <h1 className="mb-5 text-[26px] font-bold leading-tight text-text">แก้ไขรายจ่าย</h1>

      <Card className="rounded-[22px] p-[22px]">
        {!initialized ? (
          <p className="text-sm text-sub">กำลังโหลด...</p>
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
            <div className="flex flex-col gap-2">
              <span className="text-[13px] font-medium text-sub">หมวดหมู่</span>
              <CategoryPicker value={category} onChange={setCategory} />
            </div>
            <Input label="รายการ" value={item} onChange={(e) => setItem(e.target.value)} required />
            <Input label="หมายเหตุ" value={remark} onChange={(e) => setRemark(e.target.value)} />
            {error && <p className="text-sm text-accent">{error}</p>}
            <div className="mt-1.5 flex gap-3">
              <Button type="submit" disabled={saving} className="flex-1">
                {saving ? "กำลังบันทึก..." : "บันทึก"}
              </Button>
              <Button type="button" variant="danger" disabled={saving} onClick={handleDelete}>
                ลบ
              </Button>
            </div>
          </form>
        )}
      </Card>
    </Screen>
  );
}
