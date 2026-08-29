// Shared URL <-> Date conversion for the calendar page and its header —
// kept separate from src/lib/dates.ts, which holds general date math, not
// URL-formatting concerns specific to this one page.

export function parseDateParam(value: string | undefined): Date {
  if (!value) return new Date();
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

export function toDateParam(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
