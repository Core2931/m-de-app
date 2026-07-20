export function formatCurrency(amount: number, currency = "THB"): string {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(isoDate: string): string {
  return new Intl.DateTimeFormat("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(isoDate));
}

export function formatDateShort(isoDate: string): string {
  return new Intl.DateTimeFormat("th-TH", {
    day: "numeric",
    month: "short",
  }).format(new Date(isoDate));
}

// Uses local date parts (not toISOString, which is UTC) so "today" matches
// the user's calendar day in Thailand rather than shifting at UTC midnight.
export function todayISO(): string {
  return toISODate(new Date());
}

export function currentMonthISO(): string {
  return todayISO().slice(0, 7); // YYYY-MM
}

function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export const WEEK_LABELS = ["จ", "อ", "พ", "พฤ", "ศ", "ส", "อา"];

// The 7 ISO dates for the current week, Monday → Sunday.
export function currentWeekDates(): string[] {
  const now = new Date();
  const dow = now.getDay(); // 0=Sun … 6=Sat
  const mondayOffset = dow === 0 ? -6 : 1 - dow;
  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return toISODate(d);
  });
}
