"use client";

import { appendPersonBlock } from "@/lib/remarkEdit";
import {
  buildEvenSplitRemark,
  firstPlaceholderRange,
  splitEvenly,
  MAX_WAYS,
} from "@/lib/evenSplit";
import { formatCurrency } from "@/lib/formatters";
import type { KnownPerson } from "@/lib/people";

const CHIP_CAP = 6;
const WAYS = [2, 3, 4];

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
 */
export default function PersonChips({ known, remark, amount, onInsert }: PersonChipsProps) {
  const parsedAmount = Number(amount);
  const previews = WAYS.map((ways) => ({
    ways,
    split: ways <= MAX_WAYS ? splitEvenly(parsedAmount, ways) : null,
  }));
  const canSplit = previews.some((p) => p.split !== null);

  if (known.length === 0 && !canSplit) return null;

  function insertPerson(person: string) {
    const { text, caret } = appendPersonBlock(remark, person);
    onInsert(text, { start: caret, end: caret });
  }

  function insertEvenSplit(ways: number) {
    const split = splitEvenly(parsedAmount, ways);
    if (!split) return;
    const text = buildEvenSplitRemark(remark, split);
    // Select the first "?" so the name can be typed straight over it.
    const range = firstPlaceholderRange(text);
    onInsert(text, range ?? { start: text.length, end: text.length });
  }

  return (
    <div className="flex flex-col gap-2">
      {canSplit && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[12px] text-sub">หารเท่ากัน:</span>
          {previews.map(({ ways, split }) => (
            <button
              key={ways}
              type="button"
              // Disabled rather than hidden so the row does not jump around
              // while the amount is being typed.
              disabled={!split}
              onClick={() => insertEvenSplit(ways)}
              className="rounded-full border border-border bg-card px-2.5 py-1 text-[12px] font-medium text-text/80 transition-transform active:scale-95 disabled:opacity-40"
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
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[12px] text-sub">เพิ่มคน:</span>
          {known.slice(0, CHIP_CAP).map((person) => (
            <button
              key={person.person}
              type="button"
              onClick={() => insertPerson(person.person)}
              className="rounded-full border border-border bg-card px-2.5 py-1 text-[12px] font-medium text-text/80 transition-transform active:scale-95"
            >
              {person.person}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
