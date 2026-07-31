"use client";

import { parseRemark } from "@/lib/splits";
import { formatCurrency } from "@/lib/formatters";

interface SplitPreviewProps {
  remark: string;
}

export default function SplitPreview({ remark }: SplitPreviewProps) {
  const { splits, invalid } = parseRemark(remark);
  if (splits.length === 0 && !invalid) return null;

  return (
    <div className="flex flex-col gap-2">
      {splits.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {splits.map((split, i) => (
            <span
              key={`${split.person}-${i}`}
              className={
                split.direction === "owed_to_me"
                  ? "rounded-full border border-accent px-2.5 py-1 text-[12px] font-medium text-accent"
                  : "rounded-full border border-expense px-2.5 py-1 text-[12px] font-medium text-expense"
              }
            >
              {split.direction === "owed_to_me"
                ? `${split.person} ติดเรา ${formatCurrency(split.amount)}`
                : `เราติด${split.person} ${formatCurrency(split.amount)}`}
            </span>
          ))}
        </div>
      )}
      {invalid && (
        <p className="text-[12px] text-expense">
          ⚠ อ่าน format ไม่ออก — ใช้แบบ <span className="font-medium">ขนม: [50] ค่าอาหาร</span>{" "}
          (ถ้าเขาออกให้เรา ใส่ <span className="font-medium">ขนมจ่าย:</span>) คั่นหลายคนด้วย ;
        </p>
      )}
    </div>
  );
}
