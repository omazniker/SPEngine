/**
 * Zentrale Formatierungs-Utilities. Siehe AGENTS.md §"Zentrale Utilities":
 * - Keine lokalen `new Intl.NumberFormat(...)`-Kopien in Komponenten
 * - Keine `.toISOString().slice(0, 16)`-Inline-Konvertierungen
 *
 * Default-Locale: `de-DE` (siehe Code-Konventionen: Sprache Deutsch).
 */

const DEFAULT_LOCALE = "de-DE";
const DEFAULT_CURRENCY = "EUR";

export function formatCurrency(
  value: number,
  currency: string = DEFAULT_CURRENCY,
  locale: string = DEFAULT_LOCALE,
): string {
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(value);
}

export function formatNumber(
  value: number,
  options: Intl.NumberFormatOptions = {},
  locale: string = DEFAULT_LOCALE,
): string {
  return new Intl.NumberFormat(locale, options).format(value);
}

export function formatPercent(
  value: number,
  fractionDigits = 1,
  locale: string = DEFAULT_LOCALE,
): string {
  return new Intl.NumberFormat(locale, {
    style: "percent",
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}

export function formatDate(value: Date | string, locale: string = DEFAULT_LOCALE): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(date);
}

export function formatDateTime(value: Date | string, locale: string = DEFAULT_LOCALE): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

/**
 * Liefert einen String im Format `YYYY-MM-DDTHH:mm`, kompatibel mit
 * `<input type="datetime-local">`. Nutzt die Browser-Lokalzeit, NICHT UTC.
 */
export function formatDateTimeLocal(value: Date | string): string {
  const date = typeof value === "string" ? new Date(value) : value;
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}

/**
 * Kompaktes Kurzformat ("2 Mio. €"). Nützlich in Dashboards.
 */
export function formatCurrencyCompact(
  value: number,
  currency: string = DEFAULT_CURRENCY,
  locale: string = DEFAULT_LOCALE,
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}
