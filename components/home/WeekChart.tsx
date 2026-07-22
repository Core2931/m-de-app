import { formatCompact } from "@/lib/formatters";

interface WeekDay {
  label: string;
  total: number;
  isToday: boolean;
}

interface WeekChartProps {
  days: WeekDay[];
}

const CHART_H = 76;
const AMOUNT_H = 14;

export default function WeekChart({ days }: WeekChartProps) {
  const max = Math.max(1, ...days.map((d) => d.total));

  return (
    <div className="mt-2 flex items-end gap-[10px]">
      {days.map((day, i) => {
        // Non-zero days scale against the week's max; zero days show a stub.
        const h = day.total > 0 ? Math.max(6, (day.total / max) * CHART_H) : 4;
        return (
          <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
            {/* Fixed-height row, separate from the bar track below, so the
                amount never overlaps the bar even when it's at max height. */}
            <div className="flex items-end justify-center" style={{ height: AMOUNT_H }}>
              {day.total > 0 && (
                <span className="text-[9px] font-medium leading-none text-sub tabular-nums">
                  {formatCompact(day.total)}
                </span>
              )}
            </div>
            <div className="flex w-full items-end" style={{ height: CHART_H }}>
              <div
                className="w-full rounded-[6px]"
                style={{
                  height: h,
                  background: day.isToday ? "var(--accent)" : "var(--accent2)",
                  opacity: day.total > 0 ? 1 : 0.35,
                }}
              />
            </div>
            <span className="text-[10.5px] font-medium text-sub">{day.label}</span>
          </div>
        );
      })}
    </div>
  );
}
