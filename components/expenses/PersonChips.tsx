"use client";

import { useState } from "react";
import { appendPersonBlock } from "@/lib/remarkEdit";
import {
  buildEvenSplitRemark,
  buildPairSplitRemark,
  firstPlaceholderRange,
  splitEvenly,
  MAX_WAYS,
} from "@/lib/evenSplit";
import { formatCurrency } from "@/lib/formatters";
import type { KnownPerson } from "@/lib/people";

const CHIP_CAP = 6;
const PAIR_CAP = 3;
const WAYS = [2, 3, 4];

const CHIP =
  "hit-area rounded-full border border-border bg-card px-2.5 py-1.5 text-[12px] font-medium text-text/80 transition-transform active:scale-95";

export interface RemarkSelection {
  start: number;
  end: number;
}

interface PersonChipsProps {
  known: KnownPerson[];
  remark: string;
  /** The amount currently typed in the form, used to size an even split. */
  amount: string;
  /** Receives the new remark plus what the caller should select afterwards. */
  onInsert: (text: string, selection: RemarkSelection) => void;
}

/**
 * The two things that make a split tedious: typing a Thai name again, and
 * doing the division by hand.
 *
 * Names go in as chips rather than a <datalist>, which cannot work here — it
 * matches the input's whole value, but the name is a token in the middle of
 * "ชื่อ: [50] label; ชื่อ2: [30]". The chips also teach the syntax by
 * producing it.
 *
 * One toggle decides who paid, and every chip below follows it: "ขนม: []"
 * when we paid for them, "ขนมจ่าย: []" when they paid for us. The tones match
 * SplitPreview's pills (green = they owe us, orange = we owe them) so what the
 * toggle shows is what the preview will show.
 */
export default function PersonChips({ known, remark, amount, onInsert }: PersonChipsProps) {
  const [paidByThem, setPaidByThem] = useState(false);
  const parsedAmount = Number(amount);
  const pair = splitEvenly(parsedAmount, 2);
  const previews = WAYS.map((ways) => ({
    ways,
    split: ways <= MAX_WAYS ? splitEvenly(parsedAmount, ways) : null,
  }));
  const canSplit = previews.some((p) => p.split !== null);

  if (known.length === 0 && !canSplit) return null;

  function insertPerson(person: string) {
    const { text, caret } = appendPersonBlock(remark, person, { paidByThem });
    onInsert(text, { start: caret, end: caret });
  }

  function insertPair(person: string) {
    if (!pair) return;
    const text = buildPairSplitRemark(remark, pair, person, paidByThem);
    onInsert(text, { start: text.length, end: text.length });
  }

  function insertEvenSplit(ways: number) {
    const split = splitEvenly(parsedAmount, ways);
    if (!split) return;
    const text = buildEvenSplitRemark(remark, split, paidByThem);
    // Select the first "?" so the name can be typed straight over it.
    const range = firstPlaceholderRange(text);
    onInsert(text, range ?? { start: text.length, end: text.length });
  }

  const toggle = (active: boolean, tone: "accent" | "expense") =>
    "hit-area rounded-full border px-2.5 py-1.5 text-[12px] transition-transform active:scale-95 " +
    (active
      ? tone === "accent"
        ? "border-accent font-semibold text-accent"
        : "border-expense font-semibold text-expense"
      : "border-border bg-card font-medium text-sub");

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[12px] text-sub">ใครจ่าย:</span>
        <button
          type="button"
          aria-pressed={!paidByThem}
          onClick={() => setPaidByThem(false)}
          className={toggle(!paidByThem, "accent")}
        >
          ฉันออกให้
        </button>
        <button
          type="button"
          aria-pressed={paidByThem}
          onClick={() => setPaidByThem(true)}
          className={toggle(paidByThem, "expense")}
        >
          เขาจ่ายให้
        </button>
      </div>

      {canSplit && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[12px] text-sub">หารเท่ากัน:</span>
          {previews.map(({ ways, split }) => (
            <button
              key={ways}
              type="button"
              // Disabled rather than hidden so the row does not jump around
              // while the amount is being typed.
              disabled={!split}
              onClick={() => insertEvenSplit(ways)}
              className={`${CHIP} disabled:opacity-40`}
            >
              {ways} คน
              {split && (
                <span className="ml-1 text-sub">คนละ {formatCurrency(split.share)}</span>
              )}
            </button>
          ))}
        </div>
      )}

      {known.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[12px] text-sub">หาร 2 กับ:</span>
          {known.slice(0, PAIR_CAP).map((person) => (
            <button
              key={person.person}
              type="button"
              disabled={!pair}
              onClick={() => insertPair(person.person)}
              className={`${CHIP} disabled:opacity-40`}
            >
              {person.person}
            </button>
          ))}
        </div>
      )}

      {known.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[12px] text-sub">เพิ่มคน:</span>
          {known.slice(0, CHIP_CAP).map((person) => (
            <button
              key={person.person}
              type="button"
              onClick={() => insertPerson(person.person)}
              className={CHIP}
            >
              {person.person}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
