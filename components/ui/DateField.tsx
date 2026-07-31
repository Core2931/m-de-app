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

function toISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

const TH_MONTHS = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
];
const TH_DOW = ["จ", "อ", "พ", "พฤ", "ศ", "ส", "อา"]; // Monday-first

function Chevron({ dir }: { dir: "left" | "right" }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={dir === "left" ? "M15 18l-6-6 6-6" : "M9 18l6-6-6-6"} />
    </svg>
  );
}

interface CalendarProps {
  value: string; // ISO or ""
  onSelect: (iso: string) => void;
}

function Calendar({ value, onSelect }: CalendarProps) {
  const selected = value && dmyToISO(isoToDMY(value)) ? value : "";
  const initial = selected ? new Date(`${selected}T00:00:00`) : new Date();
  const [view, setView] = useState(new Date(initial.getFullYear(), initial.getMonth(), 1));
  const todayISOStr = toISO(new Date());

  const year = view.getFullYear();
  const month = view.getMonth();
  const firstDow = (new Date(year, month, 1).getDay() + 6) % 7; // 0 = Monday
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // 42 cells (6 weeks) keeps the popover height stable across months.
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  function shift(delta: number) {
    setView(new Date(year, month + delta, 1));
  }

  return (
    <div className="w-[min(288px,calc(100vw-2.5rem))] rounded-2xl border border-border bg-card p-3 shadow-card">
      <div className="mb-2 flex items-center justify-between">
        <button type="button" onClick={() => shift(-1)} aria-label="เดือนก่อนหน้า" className="flex h-8 w-8 items-center justify-center rounded-lg text-sub transition-colors hover:bg-accent-soft hover:text-accent">
          <Chevron dir="left" />
        </button>
        <span className="text-sm font-semibold text-text">
          {TH_MONTHS[month]} {year}
        </span>
        <button type="button" onClick={() => shift(1)} aria-label="เดือนถัดไป" className="flex h-8 w-8 items-center justify-center rounded-lg text-sub transition-colors hover:bg-accent-soft hover:text-accent">
          <Chevron dir="right" />
        </button>
      </div>

      <div className="mb-1 grid grid-cols-7 gap-0.5">
        {TH_DOW.map((d) => (
          <div key={d} className="py-1 text-center text-[11px] font-medium text-sub">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((d, i) => {
          if (d === null) return <div key={i} />;
          const iso = toISO(new Date(year, month, d));
          const isSelected = iso === selected;
          const isToday = iso === todayISOStr;
          return (
            <button
              key={i}
              type="button"
              onClick={() => onSelect(iso)}
              className={cn(
                "flex h-9 items-center justify-center rounded-lg text-[13px] tabular-nums transition-colors",
                isSelected
                  ? "bg-accent font-semibold text-accent-text"
                  : "text-text hover:bg-accent-soft hover:text-accent",
                !isSelected && isToday && "font-bold text-accent"
              )}
            >
              {d}
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface DateFieldProps {
  value: string; // ISO YYYY-MM-DD (or "")
  onChange: (iso: string) => void;
  label?: string;
  filled?: boolean;
  required?: boolean;
  id?: string;
  /** Which edge the calendar popover anchors to, so it stays on-screen in
   *  narrow columns (e.g. use "right" for the right filter input). */
  align?: "left" | "right";
}

export default function DateField({
  value,
  onChange,
  label,
  filled,
  required,
  id,
  align = "left",
}: DateFieldProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [text, setText] = useState(() => isoToDMY(value));
  const [open, setOpen] = useState(false);

  // Resync display when the ISO value changes from outside (e.g. edit form load),
  // but don't clobber what the user is mid-typing.
  useEffect(() => {
    if (dmyToISO(text) !== value) setText(isoToDMY(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  // Close the popover on outside click or Escape.
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

  function handleText(v: string) {
    setText(v);
    const iso = dmyToISO(v);
    if (iso) onChange(iso);
    else if (v.trim() === "") onChange("");
  }

  function handleSelect(iso: string) {
    onChange(iso);
    setText(isoToDMY(iso));
    setOpen(false);
  }

  return (
    <div className="flex flex-col gap-2" ref={wrapRef}>
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
          onClick={() => setOpen((o) => !o)}
          aria-label="เลือกวันที่จากปฏิทิน"
          aria-expanded={open}
          className={cn(
            "absolute inset-y-0 right-0 flex w-10 items-center justify-center transition-colors",
            open ? "text-accent" : "text-sub"
          )}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <path d="M16 2v4M8 2v4M3 10h18" />
          </svg>
        </button>

        {open && (
          <div className={cn("absolute top-full z-50 mt-2", align === "right" ? "right-0" : "left-0")}>
            <Calendar value={value} onSelect={handleSelect} />
          </div>
        )}
      </div>
    </div>
  );
}
