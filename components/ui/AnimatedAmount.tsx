"use client";

import { useEffect, useRef, useState } from "react";
import { countUpValue } from "@/lib/countUp";
import { formatCurrency } from "@/lib/formatters";

const DURATION_MS = 600;

interface AnimatedAmountProps {
  value: number;
}

/**
 * A baht amount that counts up to its value: from zero when it first appears,
 * and from wherever it stands when the value changes later.
 *
 * Starting at zero also matches what the prerendered page shows before the
 * expenses load, so the first frame is the same on server and client.
 */
export default function AnimatedAmount({ value }: AnimatedAmountProps) {
  const [shown, setShown] = useState(0);
  // Where the figure currently stands, so a value that changes mid-count
  // carries on from there instead of jumping back.
  const shownRef = useRef(0);

  useEffect(() => {
    const from = shownRef.current;
    if (from === value) return;

    // Asked for less motion: land on the value in one frame.
    const duration = window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? 0
      : DURATION_MS;
    const startedAt = performance.now();
    let frame = requestAnimationFrame(function tick(now) {
      const progress = duration === 0 ? 1 : (now - startedAt) / duration;
      const next = countUpValue(from, value, progress);
      shownRef.current = next;
      setShown(next);
      if (progress < 1) frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
  }, [value]);

  return <span className="tabular-nums">{formatCurrency(shown)}</span>;
}
