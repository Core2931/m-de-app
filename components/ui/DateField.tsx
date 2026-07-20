"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

// The app stores dates as ISO (YYYY-MM-DD); this field only changes the display
// to dd/mm/yyyy while keeping the ISO value flowing to the store/sheets.
function isoToDMY(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return "";
  return `${m[3]}/${m[2]}/${m[1]}`;
}

function dmyToISO(text: string): string | null {
  const m = text.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const day = Number(m[1]);
  const month = Number(m[2]);
  const year = Number(m[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const iso = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  // Reject impossible dates (e.g. 31/02) by round-tripping through Date.
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime()) || d.getDate() !== day) return null;
  return iso;
}

interface DateFieldProps {
  value: string; // ISO YYYY-MM-DD (or "")
  onChange: (iso: string) => void;
  label?: string;
  filled?: boolean;
  required?: boolean;
  id?: string;
}

export default function DateField({ value, onChange, label, filled, required, id }: DateFieldProps) {
  const nativeRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState(() => isoToDMY(value));

  // Resync display when the ISO value changes from outside (e.g. edit form load),
  // but don't clobber what the user is mid-typing.
  useEffect(() => {
    if (dmyToISO(text) !== value) setText(isoToDMY(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

  function handleText(v: string) {
    setText(v);
    const iso = dmyToISO(v);
    if (iso) onChange(iso);
    else if (v.trim() === "") onChange("");
  }

  function openPicker() {
    const el = nativeRef.current;
    if (!el) return;
    try {
      el.showPicker();
    } catch {
      el.focus();
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {label && (
        <label htmlFor={inputId} className="text-sub text-[13px] font-medium">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          id={inputId}
          type="text"
          inputMode="numeric"
          placeholder="dd/mm/yyyy"
          value={text}
          onChange={(e) => handleText(e.target.value)}
          required={required}
          className={cn(
            "w-full rounded-xl border border-border px-3 py-[11px] pr-10 text-[15px] text-text outline-none",
            "placeholder:text-sub focus:border-accent transition-colors",
            filled ? "bg-card" : "bg-transparent"
          )}
        />
        <button
          type="button"
          onClick={openPicker}
          aria-label="เลือกวันที่จากปฏิทิน"
          className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-sub"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <path d="M16 2v4M8 2v4M3 10h18" />
          </svg>
        </button>
        {/* Rendered (not display:none) so showPicker() is allowed, but visually hidden. */}
        <input
          ref={nativeRef}
          type="date"
          value={value}
          tabIndex={-1}
          aria-hidden="true"
          onChange={(e) => {
            onChange(e.target.value);
            setText(isoToDMY(e.target.value));
          }}
          className="pointer-events-none absolute right-2 bottom-0 h-px w-px opacity-0"
        />
      </div>
    </div>
  );
}
