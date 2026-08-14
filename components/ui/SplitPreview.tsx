"use client";

import { parseRemark } from "@/lib/splits";
import { formatCurrency } from "@/lib/formatters";
import { isKnownPerson, nearestPerson, type KnownPerson } from "@/lib/people";
import { PLACEHOLDER_PERSON, hasPlaceholderPerson } from "@/lib/evenSplit";

interface SplitPreviewProps {
  remark: string;
  /**
   * Everyone who has appeared in a split before. Defaults to empty, which
   * disables the unknown-name warning entirely — the right failure mode, since
   * an unloaded store would otherwise make every name look brand new.
   *
   * Passed down by the pages; this component stays store-free like the rest of
   * components/ui.
   */
  knownPeople?: KnownPerson[];
}

export default function SplitPreview({ remark, knownPeople = [] }: SplitPreviewProps) {
  const { splits, invalid } = parseRemark(remark);
  if (splits.length === 0 && !invalid) return null;

  const needsNames = hasPlaceholderPerson(remark);
  const canWarn = knownPeople.length > 0;
  const unknownNames = canWarn
    ? [
        ...new Set(
          splits
            .map((s) => s.person)
            // The "?" placeholder gets its own, louder message below — calling
            // it a new person would be nonsense.
            .filter((p) => p !== PLACEHOLDER_PERSON && !isKnownPerson(p, knownPeople))
        ),
      ]
    : [];

  return (
    <div className="flex flex-col gap-2">
      {splits.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {splits.map((split, i) => {
            const isPlaceholder = split.person === PLACEHOLDER_PERSON;
            const isNew =
              isPlaceholder || (canWarn && !isKnownPerson(split.person, knownPeople));
            const tone = split.direction === "owed_to_me" ? "accent" : "expense";
            return (
              <span
                key={`${split.person}-${i}`}
                className={
                  (isNew ? "border-dashed " : "") +
                  (tone === "accent"
                    ? "rounded-full border border-accent px-2.5 py-1 text-[12px] font-medium text-accent"
                    : "rounded-full border border-expense px-2.5 py-1 text-[12px] font-medium text-expense")
                }
              >
                {split.direction === "owed_to_me"
                  ? `${split.person} ติดเรา ${formatCurrency(split.amount)}`
                  : `เราติด${split.person} ${formatCurrency(split.amount)}`}
                {isNew && " ?"}
              </span>
            );
          })}
        </div>
      )}

      {needsNames && (
        <p className="text-[12px] text-expense">
          แทน <span className="font-medium">?</span> ด้วยชื่อคนที่หารด้วยก่อนบันทึก
        </p>
      )}

      {/* Informational only. Never rewrite the remark from this — ป้อม and
          ต้อม are two real people, and auto-correcting one into the other
          moves real money onto the wrong balance. */}
      {unknownNames.map((name) => {
        const suggestion = nearestPerson(name, knownPeople);
        return (
          <p key={name} className="text-[12px] text-sub">
            ชื่อใหม่: <span className="font-medium text-text">{name}</span>
            {suggestion && (
              <>
                {" "}
                — หมายถึง <span className="font-medium text-text">{suggestion}</span> หรือเปล่า?
              </>
            )}
          </p>
        );
      })}

      {invalid && (
        <p className="text-[12px] text-expense">
          ⚠ อ่าน format ไม่ออก — ใช้แบบ <span className="font-medium">ขนม: [50] ค่าอาหาร</span>{" "}
          (ถ้าเขาออกให้เรา ใส่ <span className="font-medium">ขนมจ่าย:</span>) คั่นหลายคนด้วย ;
        </p>
      )}
    </div>
  );
}
