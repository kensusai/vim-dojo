/**
 * LocalDate: a calendar day in the player's local timezone, as "YYYY-MM-DD".
 * Day boundaries are local midnight (R8); an activity belongs to the local
 * date of its completion instant (R12). Timezone moves are not compensated
 * (domain.md 例外ケース: デバイスのローカルタイムゾーンを常に正とする).
 */
declare const brand: unique symbol;
export type LocalDate = string & { readonly [brand]: "LocalDate" };

const LOCAL_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** Parse a stored/tested literal. @throws RangeError on malformed input. */
export function localDate(value: string): LocalDate {
  if (!LOCAL_DATE_PATTERN.test(value)) {
    throw new RangeError(`not a YYYY-MM-DD local date: ${value}`);
  }
  return value as LocalDate;
}

/** The local calendar day an instant belongs to (R12). */
export function localDateOf(instant: Date): LocalDate {
  const y = instant.getFullYear().toString().padStart(4, "0");
  const m = (instant.getMonth() + 1).toString().padStart(2, "0");
  const d = instant.getDate().toString().padStart(2, "0");
  return `${y}-${m}-${d}` as LocalDate;
}

/**
 * Whole days from `a` to `b` (positive when b is later). Anchoring both dates
 * to UTC noon makes the arithmetic immune to DST hour shifts.
 */
export function daysBetween(a: LocalDate, b: LocalDate): number {
  const toUtcNoon = (date: LocalDate) => Date.parse(`${date}T12:00:00Z`);
  return Math.round((toUtcNoon(b) - toUtcNoon(a)) / 86_400_000);
}
