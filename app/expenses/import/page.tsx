"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Screen from "@/components/layout/Screen";
import SlipRow from "@/components/expenses/SlipRow";
import { useExpenseStore } from "@/store/expenseStore";
import { todayISO } from "@/lib/formatters";
import { loadSlipReader, readSlip } from "@/lib/slipOcr";
import type { SlipRead } from "@/lib/slipParse";
import {
  buildSlipRow,
  findDuplicateIds,
  isRowReady,
  saveRows,
  type SlipRow as SlipRowData,
} from "@/lib/slipImport";

export default function ImportSlipsPage() {
  const { expenses, isLoaded, error: storeError, add, load } = useExpenseStore();
  const [rows, setRows] = useState<SlipRowData[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedCount, setSavedCount] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  // The store drives both the shop suggestions and the "อาจซ้ำ" check, so
  // slips are not accepted until it has loaded.
  useEffect(() => {
    if (!isLoaded) load();
  }, [isLoaded, load]);

  const duplicates = useMemo(() => findDuplicateIds(rows, expenses), [rows, expenses]);
  const notReady = rows.filter((row) => !isRowReady(row)).length;

  async function handleFiles(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    // Reset so picking the same slips again still fires onChange.
    event.target.value = "";
    if (files.length === 0) return;

    setBusy(true);
    setError(null);
    setSavedCount(null);

    try {
      setStatus("กำลังโหลดตัวอ่าน (ครั้งแรกจะนานหน่อย)...");
      await loadSlipReader();
    } catch {
      setError("โหลดตัวอ่านไม่สำเร็จ — เลือกรูปอีกครั้งเพื่อลองใหม่");
      setStatus(null);
      setBusy(false);
      return;
    }

    for (const [index, file] of files.entries()) {
      setStatus(`กำลังอ่านใบที่ ${index + 1} จาก ${files.length}...`);
      let read: SlipRead | null = null;
      try {
        read = (await readSlip(file)).read;
      } catch {
        // An undecodable file (HEIC, not an image) still becomes a row — an
        // empty one the user can fill in or remove — and the rest carry on.
      }
      const row = buildSlipRow(crypto.randomUUID(), file.name, read, expenses, todayISO());
      setRows((current) => [...current, row]);
    }

    setStatus(null);
    setBusy(false);
  }

  function updateRow(id: string, patch: Partial<SlipRowData>) {
    // The saved notice describes the previous batch; editing means a new one.
    setSavedCount(null);
    setRows((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }

  function removeRow(id: string) {
    setRows((current) => current.filter((row) => row.id !== id));
  }

  async function handleSave() {
    setBusy(true);
    setError(null);
    setSavedCount(null);

    const outcome = await saveRows(rows, add);
    const left = rows.length - outcome.savedIds.length;
    // Saved rows leave the list whether or not the batch finished, so a
    // second press can never file them again.
    setRows((current) => current.filter((row) => !outcome.savedIds.includes(row.id)));
    if (outcome.savedIds.length > 0) setSavedCount(outcome.savedIds.length);
    if (outcome.error) {
      setError(`${outcome.error} — เหลือ ${left} แถวยังไม่ได้บันทึก กดบันทึกอีกครั้งได้`);
    }
    setBusy(false);
  }

  return (
    <Screen>
      <h1 className="mb-2 text-[26px] font-bold leading-tight text-text">เพิ่มจากสลิป</h1>
      <p className="mb-5 text-[13px] text-sub">
        รูปถูกอ่านในเครื่องนี้ ไม่ถูกส่งออกและไม่ถูกเก็บ ·{" "}
        <Link href="/expenses/new" className="font-semibold text-accent">
          กรอกเอง
        </Link>
      </p>

      <Card className="rounded-[22px] p-[22px]">
        <label className="flex flex-col gap-2">
          <span className="text-[13px] font-medium text-sub">เลือกรูปสลิป (หลายใบได้)</span>
          <input
            type="file"
            accept="image/*"
            multiple
            disabled={busy || !isLoaded}
            onChange={handleFiles}
            className="text-[14px] text-text"
          />
        </label>
        {!isLoaded && !storeError && <p className="mt-3 text-sm text-sub">กำลังโหลดข้อมูล...</p>}
        {storeError && <p className="mt-3 text-sm text-accent">{storeError}</p>}
        {status && <p className="mt-3 text-sm text-sub">{status}</p>}
        {error && <p className="mt-3 text-sm text-accent">{error}</p>}
        {savedCount !== null && (
          <p className="mt-3 text-sm text-accent">✓ บันทึกแล้ว {savedCount} รายการ</p>
        )}
      </Card>

      {rows.map((row) => (
        <SlipRow
          key={row.id}
          row={row}
          duplicate={duplicates.has(row.id)}
          onChange={(patch) => updateRow(row.id, patch)}
          onRemove={() => removeRow(row.id)}
        />
      ))}

      {rows.length > 0 && (
        <div className="mt-5 flex flex-col gap-2">
          {notReady > 0 && (
            <p className="text-sm text-expense">แก้ {notReady} แถวก่อนบันทึก (กรอบสีส้ม)</p>
          )}
          <Button
            type="button"
            onClick={handleSave}
            disabled={busy || notReady > 0}
            className="w-full"
          >
            {busy ? "กำลังบันทึก..." : `บันทึกทั้งหมด (${rows.length})`}
          </Button>
        </div>
      )}
    </Screen>
  );
}
