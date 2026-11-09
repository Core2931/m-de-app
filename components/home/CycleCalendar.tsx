import Link from "next/link";
import { formatCompact, formatCurrency } from "@/lib/formatters";
import type { CalendarWeek } from "@/lib/cycleCalendar";
import type { PaceLevel } from "@/lib/pace";

const DAY_LABELS = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];

// Same colours as today's number on the home cards: one meaning everywhere.
const LEVEL_TEXT = ["text-text", "text-pace-1", "text-pace-2", "text-danger"] as const;
const LEVEL_VAR = [null, "--pace-1", "--pace-2", "--danger"] as const;

// A flat tint of the level colour, not a gradient.
function tint(level: PaceLevel): string | undefined {
  const name = LEVEL_VAR[level];
  return name ? `color-mix(in srgb, var(${name}) 16%, transparent)` : undefined;
}

// Whole baht, no symbol: the cells are about 40px wide.
function cellAmount(amount: number): string {
  const rounded = Math.round(amount);
  if (rounded <= 0) return "";
  return rounded < 10000 ? rounded.toLocaleString("en-US") : formatCompact(rounded);
}

interface CycleCalendarProps {
  weeks: CalendarWeek[];
}

export default function CycleCalendar({ weeks }: CycleCalendarProps) {
  const current = weeks.find((w) => w.isCurrent);

  return (
    <div role="group" aria-label="รายจ่ายรายวันในรอบนี้">
      <div className="grid grid-cols-[repeat(7,minmax(0,1fr))_1.3fr] gap-1">
        {DAY_LABELS.map((label) => (
          <span key={label} className="text-center text-[11px] font-medium text-sub">
            {label}
          </span>
        ))}
        <span className="text-center text-[11px] font-medium text-sub">รวม</span>

        {weeks.map((week, w) => (
          <Row key={w} week={week} />
        ))}
      </div>

      {current && current.cap !== null && (
        <p className={`mt-3 text-[12px] ${current.level > 0 ? LEVEL_TEXT[current.level] : "text-sub"}`}>
          สัปดาห์นี้ใช้ {formatCurrency(current.total)} จากแผน {formatCurrency(current.cap)}
        </p>
      )}
    </div>
  );
}

function Row({ week }: { week: CalendarWeek }) {
  return (
    <>
      {week.cells.map((cell, i) => {
        if (!cell) return <span key={i} aria-hidden="true" />;
        const amount = cellAmount(cell.spent);
        const label = `วันที่ ${cell.day}${amount ? ` ใช้ ${amount} บาท` : ""}`;
        const className = `flex h-[44px] flex-col items-center justify-center rounded-[8px] ${
          cell.isToday ? "ring-1 ring-inset ring-link" : ""
        }`;
        const body = (
          <>
            <span
              className={`text-[11px] leading-none ${
                cell.isToday ? "font-bold text-text" : "text-sub"
              }`}
            >
              {cell.day}
            </span>
            <span
              className={`mt-1 text-[11px] font-semibold leading-none tabular-nums ${
                LEVEL_TEXT[cell.level]
              }`}
            >
              {amount}
            </span>
          </>
        );
        // A day with spending opens that day's list; an empty one has nothing
        // to open, so it stays plain.
        return amount ? (
          <Link
            key={i}
            href={`/expenses?date=${cell.date}`}
            aria-label={label}
            className={`${className} transition-transform active:scale-95`}
            style={{ background: tint(cell.level) }}
          >
            {body}
          </Link>
        ) : (
          <div key={i} aria-label={label} className={className} style={{ background: tint(cell.level) }}>
            {body}
          </div>
        );
      })}
      <div className="flex h-[44px] items-center justify-center">
        <span
          className={`text-[11px] font-bold tabular-nums ${
            week.level > 0 ? LEVEL_TEXT[week.level] : "text-sub"
          }`}
        >
          {cellAmount(week.total)}
        </span>
      </div>
    </>
  );
}
