"use client";

import { appendPersonBlock } from "@/lib/remarkEdit";
import type { KnownPerson } from "@/lib/people";

const CHIP_CAP = 6;

interface PersonChipsProps {
  known: KnownPerson[];
  remark: string;
  /** Receives the new remark text and where the caret should land. */
  onInsert: (text: string, caret: number) => void;
}

/**
 * Taps a known name into the remark instead of retyping it.
 *
 * A <datalist> cannot do this job: it matches against the input's whole value,
 * but the name here is a token in the middle of "ชื่อ: [50] label; ชื่อ2: [30]".
 * A chip row sidesteps caret tracking, popup positioning and the mobile
 * keyboard entirely, and it also teaches the ": [x]" syntax by producing it.
 */
export default function PersonChips({ known, remark, onInsert }: PersonChipsProps) {
  if (known.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-[12px] text-sub">เพิ่มคน:</span>
      {known.slice(0, CHIP_CAP).map((person) => (
        <button
          key={person.person}
          type="button"
          onClick={() => {
            const { text, caret } = appendPersonBlock(remark, person.person);
            onInsert(text, caret);
          }}
          className="rounded-full border border-border bg-card px-2.5 py-1 text-[12px] font-medium text-text/80 transition-transform active:scale-95"
        >
          {person.person}
        </button>
      ))}
    </div>
  );
}
