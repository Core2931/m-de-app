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

export function todayISO(): string {
  return new Date().toISOString().split("T")[0];
}

export function currentMonthISO(): string {
  return new Date().toISOString().slice(0, 7); // YYYY-MM
}
