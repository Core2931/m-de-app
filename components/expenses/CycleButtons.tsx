"use client";

import { todayISO } from "@/lib/formatters";
import { cycleFor, previousCycleFrom } from "@/lib/payCycle";

interface CycleButtonsProps {
  /** Whatever is in the "จากวันที่" field right now — may be empty. */
  from: string;
  onPick: (from: string, to: string) => void;
}

const CHIP =
  "rounded-full border border-border bg-card px-3 py-1 text-[12px] font-medium text-text/80 transition-transform active:scale-95";

/**
 * Shortcuts for the date range: step back a salary cycle at a time, or jump
 * to the current one. They only fill in the two date fields — typing a date
 * by hand still works exactly as before.
 */
export default function CycleButtons({ from, onPick }: CycleButtonsProps) {
  function showPrevious() {
    // Steps back from the cycle on screen, so pressing again keeps going.
    const cycle = previousCycleFrom(from, todayISO());
    onPick(cycle.start, cycle.end);
  }

  function showCurrent() {
    // Open-ended, the same as the screen's starting state: a cycle that is
    // still running has no reason to hide what is entered later today.
    onPick(cycleFor(todayISO()).start, "");
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      <button type="button" onClick={showPrevious} className={CHIP}>
        ‹ รอบก่อน
      </button>
      <button type="button" onClick={showCurrent} className={CHIP}>
        รอบนี้
      </button>
    </div>
  );
}
