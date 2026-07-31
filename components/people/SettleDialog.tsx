"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import DateField from "@/components/ui/DateField";
import { formatCurrency, todayISO } from "@/lib/formatters";
import { useSettlementStore } from "@/store/settlementStore";
import type { PersonBalance } from "@/types";

interface SettleDialogProps {
  target: PersonBalance;
  onClose: () => void;
}

export default function SettleDialog({ target, onClose }: SettleDialogProps) {
  const add = useSettlementStore((s) => s.add);
  const outstanding = Math.abs(target.balance);
  const direction = target.balance > 0 ? "received" : "paid";

  const [amount, setAmount] = useState(String(outstanding));
  const [date, setDate] = useState(todayISO());
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const amountNum = Number(amount);
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      setError("จำนวนเงินไม่ถูกต้อง");
      return;
    }
    if (amountNum > outstanding + 0.005) {
      setError(`เกินยอดค้าง (${formatCurrency(outstanding)})`);
      return;
    }
    setSaving(true);
    try {
      await add({ date, person: target.person, amount: amountNum, direction, note: note.trim() });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "บันทึกไม่สำเร็จ");
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 px-5 pb-5"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-[22px] bg-card p-[22px] shadow-card"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-1 text-[20px] font-bold text-text">
          {direction === "received" ? `รับคืนจาก${target.person}` : `จ่ายคืน${target.person}`}
        </h2>
        <p className="mb-4 text-[13px] text-sub">ยอดค้าง {formatCurrency(outstanding)}</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label="จำนวนเงิน"
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            autoFocus
            required
          />
          <DateField label="วันที่" value={date} onChange={setDate} required />
          <Input
            label="หมายเหตุ"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="(ถ้ามี)"
          />
          {error && <p className="text-sm text-expense">{error}</p>}
          <div className="mt-1.5 flex gap-3">
            <Button type="submit" disabled={saving} className="flex-1">
              {saving ? "กำลังบันทึก..." : "เคลียร์"}
            </Button>
            <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
              ยกเลิก
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
