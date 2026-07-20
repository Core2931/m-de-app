interface WeekDay {
  label: string;
  total: number;
  isToday: boolean;
}

interface WeekChartProps {
  days: WeekDay[];
}

const CHART_H = 76;

export default function WeekChart({ days }: WeekChartProps) {
  const max = Math.max(1, ...days.map((d) => d.total));

  return (
    <div className="flex h-[76px] items-end gap-[10px]">
      {days.map((day, i) => {
        // Non-zero days scale against the week's max; zero days show a stub.
        const h = day.total > 0 ? Math.max(6, (day.total / max) * CHART_H) : 4;
        return (
          <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
            <div
              className="w-full rounded-[6px]"
              style={{
                height: h,
                background: day.isToday ? "var(--accent)" : "var(--accent2)",
                opacity: day.total > 0 ? 1 : 0.35,
              }}
            />
            <span className="text-[10.5px] font-medium text-sub">{day.label}</span>
          </div>
        );
      })}
    </div>
  );
}
