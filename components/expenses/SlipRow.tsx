"use client";

import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import DateField from "@/components/ui/DateField";
import CategoryPicker from "@/components/ui/CategoryPicker";
import { cn } from "@/lib/utils";
import { isRowReady, type SlipRow as SlipRowData } from "@/lib/slipImport";

interface SlipRowProps {
  row: SlipRowData;
  /** Same date and amount as something already recorded or on this list. */
  duplicate: boolean;
  onChange: (patch: Partial<SlipRowData>) => void;
  onRemove: () => void;
}

const BADGE = "rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-medium text-accent";

/** One slip on the review list — every field the slip filled in can be
 *  corrected here before anything is written to the sheet. */
export default function SlipRow({ row, duplicate, onChange, onRemove }: SlipRowProps) {
  const ready = isRowReady(row);

  return (
    <Card
      className={cn(
        "mt-4 rounded-[22px] p-[20px_22px]",
        // The save button is blocked while any row looks like this, so the
        // row that is blocking it has to be findable at a glance.
        !ready && "ring-1 ring-expense"
      )}
    >
      <div className="mb-3 flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-medium text-sub">
            {row.payee || row.fileName}
          </p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {row.readError && <span className={BADGE}>อ่านไม่ได้ กรอกเอง</span>}
            {row.dateGuessed && <span className={BADGE}>ใช้วันนี้</span>}
            {duplicate && <span className={BADGE}>อาจซ้ำ</span>}
          </div>
        </div>
        <button
          type="button"
          onClick={onRemove}
          aria-label={`ลบแถว ${row.payee || row.fileName}`}
          className="shrink-0 rounded-lg px-2 py-1 text-[13px] text-sub transition-transform active:scale-95"
        >
          ลบ
        </button>
      </div>

      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3">
          <DateField
            id={`${row.id}-date`}
            label="วันที่"
            value={row.date}
            // Once the user picks a date it is no longer a guess.
            onChange={(date) => onChange({ date, dateGuessed: false })}
          />
          <Input
            id={`${row.id}-amount`}
            label="จำนวนเงิน"
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            placeholder="0"
            value={row.amount}
            onChange={(e) => onChange({ amount: e.target.value })}
          />
        </div>
        <Input
          id={`${row.id}-item`}
          label="รายการ"
          placeholder="เช่น ข้าวเที่ยง"
          value={row.item}
          onChange={(e) => onChange({ item: e.target.value })}
        />
        <div className="flex flex-col gap-2">
          <span className="text-[13px] font-medium text-sub">หมวดหมู่</span>
          <CategoryPicker value={row.category} onChange={(category) => onChange({ category })} />
        </div>
      </div>
    </Card>
  );
}
