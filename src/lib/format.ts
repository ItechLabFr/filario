export function grams(value: number | null | undefined) {
  if (value == null) return "—";
  if (value >= 1000) return `${(value / 1000).toLocaleString("fr-FR", { maximumFractionDigits: 2 })} kg`;
  return `${value.toLocaleString("fr-FR")} g`;
}

export function money(cents: number | null | undefined, currency = "EUR") {
  if (cents == null) return "—";
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency
  }).format(cents / 100);
}

export function dateTime(value: Date | string | null | undefined) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

export function percent(part: number, total: number) {
  if (!total) return 0;
  return Math.max(0, Math.min(100, Math.round((part / total) * 100)));
}
