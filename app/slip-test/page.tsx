"use client";

// TRIAL PAGE (spike/slip-ocr-preview). Reads slips and shows what came out —
// nothing is saved to the sheet and nothing is uploaded. Reachable by URL
// only; there is deliberately no link to it from the app.

import { useState } from "react";
import Card from "@/components/ui/Card";
import Screen from "@/components/layout/Screen";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { loadSlipReader, readSlip, type SlipResult } from "@/lib/slipOcr";

interface Row {
  name: string;
  result?: SlipResult;
  error?: string;
}

const seconds = (ms: number) => (ms / 1000).toFixed(1);

export default function SlipTestPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [loadMs, setLoadMs] = useState<number | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleFiles(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    // Reset so picking the same slips again still fires onChange.
    event.target.value = "";
    if (files.length === 0) return;

    setBusy(true);
    setRows([]);
    setLoadError(null);

    try {
      setStatus("กำลังโหลดตัวอ่าน (ครั้งแรกจะนานหน่อย)...");
      const started = performance.now();
      await loadSlipReader();
      setLoadMs(Math.round(performance.now() - started));
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : String(err));
      setStatus(null);
      setBusy(false);
      return;
    }

    for (const [index, file] of files.entries()) {
      setStatus(`กำลังอ่านใบที่ ${index + 1} จาก ${files.length}...`);
      let row: Row;
      try {
        row = { name: file.name, result: await readSlip(file) };
      } catch (err) {
        row = { name: file.name, error: err instanceof Error ? err.message : String(err) };
      }
      setRows((current) => [...current, row]);
    }

    setStatus(null);
    setBusy(false);
  }

  const totalMs = rows.reduce((sum, row) => sum + (row.result?.ms ?? 0), 0);

  return (
    <Screen>
      <h1 className="mb-2 text-[26px] font-bold leading-tight text-text">ทดลองอ่านสลิป</h1>
      <p className="mb-5 text-[13px] text-sub">
        หน้าทดลอง — ไม่บันทึกลง Sheet และรูปไม่ถูกส่งออกจากเครื่อง
      </p>

      <Card className="rounded-[22px] p-[22px]">
        <label className="flex flex-col gap-2">
          <span className="text-[13px] font-medium text-sub">เลือกรูปสลิป (หลายใบได้)</span>
          <input
            type="file"
            accept="image/*"
            multiple
            disabled={busy}
            onChange={handleFiles}
            className="text-[14px] text-text"
          />
        </label>
        {status && <p className="mt-3 text-sm text-sub">{status}</p>}
        {loadError && (
          <p className="mt-3 text-sm text-accent">
            โหลดตัวอ่านไม่สำเร็จ — เน็ตอาจบล็อกเว็บที่ฝากไฟล์ตัวอ่าน ({loadError})
          </p>
        )}
        {loadMs !== null && (
          <p className="mt-3 text-[13px] text-sub">
            โหลดตัวอ่าน {seconds(loadMs)} วิ
            {rows.length > 0 && ` · อ่าน ${rows.length} ใบ รวม ${seconds(totalMs)} วิ`}
          </p>
        )}
      </Card>

      {rows.map((row, index) => (
        <Card key={index} className="mt-4 rounded-[22px] p-[20px_22px]">
          <p className="mb-2 truncate text-[13px] font-medium text-sub">
            {row.name}
            {row.result && ` · ${seconds(row.result.ms)} วิ`}
          </p>
          {row.error && <p className="text-sm text-accent">อ่านไม่สำเร็จ: {row.error}</p>}
          {row.result && (
            <>
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[15px]">
                <dt className="text-sub">ยอด</dt>
                <dd className="font-semibold tabular-nums text-expense">
                  {row.result.read.amount !== null
                    ? formatCurrency(row.result.read.amount)
                    : "อ่านไม่ได้"}
                </dd>
                <dt className="text-sub">วันที่</dt>
                <dd className="text-text">
                  {row.result.read.date ? formatDate(row.result.read.date) : "อ่านไม่ได้"}
                  {row.result.read.time && ` ${row.result.read.time} น.`}
                </dd>
                <dt className="text-sub">ร้าน</dt>
                <dd className="text-text">{row.result.read.payee ?? "อ่านไม่ได้"}</dd>
              </dl>
              <details className="mt-3 text-[12px] text-sub">
                <summary>ข้อความดิบที่อ่านได้</summary>
                <p className="mt-2 font-medium">ขาวดำ</p>
                <pre className="whitespace-pre-wrap break-words">{row.result.blackWhiteText}</pre>
                <p className="mt-2 font-medium">ภาพเดิม</p>
                <pre className="whitespace-pre-wrap break-words">{row.result.rawText}</pre>
              </details>
            </>
          )}
        </Card>
      ))}
    </Screen>
  );
}
