"use client";

import { useEffect, useState } from "react";
import ThemeToggle from "@/components/ui/ThemeToggle";

interface TopBarProps {
  onLogout?: () => void;
}

export default function TopBar({ onLogout }: TopBarProps) {
  const [time, setTime] = useState("");

  // Live clock — decorative, rendered client-side to avoid hydration mismatch.
  useEffect(() => {
    const tick = () =>
      setTime(
        new Date().toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })
      );
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex items-center justify-between px-[26px] pt-[26px] pb-[6px]">
      <span className="text-sub text-sm font-semibold tabular-nums">{time}</span>
      <div className="flex items-center gap-4">
        {onLogout && (
          <button onClick={onLogout} className="text-sub text-[13px] font-medium">
            ออกจากระบบ
          </button>
        )}
        <ThemeToggle />
      </div>
    </div>
  );
}
