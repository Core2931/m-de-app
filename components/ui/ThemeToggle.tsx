"use client";

import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [dark, setDark] = useState(false);

  // Sync initial state from the class the inline layout script already applied.
  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {
      /* ignore storage failures (private mode, etc.) */
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      role="switch"
      aria-checked={dark}
      aria-label="สลับโหมดสว่าง/มืด"
      className="relative h-[26px] w-12 shrink-0 rounded-[13px] bg-accent-soft"
    >
      <span
        className="absolute top-[2px] left-[2px] h-[22px] w-[22px] rounded-full bg-accent transition-transform duration-200"
        style={{ transform: dark ? "translateX(22px)" : "translateX(0)" }}
      />
    </button>
  );
}
