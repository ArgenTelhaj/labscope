import { LABELS, textFor } from './labels'
import { DEFAULT_LOCALE, type Locale } from './locale'

/**
 * Dates, spelled out rather than delegated to `Intl`.
 *
 * The format stays day-first with a named month in every language, because the
 * one thing a date on a lab result must never be is ambiguous: `03/04` is two
 * different collection dates depending on where the reader learned to read
 * dates. Month names are listed per locale so the wording is ours and does not
 * shift with whatever ICU data the browser happens to ship.
 */

const MONTHS: Record<Locale, readonly string[]> = {
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  sq: ['jan', 'shk', 'mar', 'pri', 'maj', 'qer', 'korr', 'gush', 'sht', 'tet', 'nën', 'dhj'],
}

function notSet(locale: Locale): string {
  const text = textFor(LABELS['common.date-not-set'], locale)
  return typeof text === 'string' ? text : text.other
}

/** `13 Aug 2026` / `13 gush 2026`. */
export function formatDate(iso: string, locale: Locale = DEFAULT_LOCALE): string {
  if (!iso) return notSet(locale)
  const date = new Date(`${iso}T00:00:00`)
  if (Number.isNaN(date.getTime())) return iso
  return `${date.getDate()} ${MONTHS[locale][date.getMonth()]} ${date.getFullYear()}`
}

/** `13 Aug` — for chart axes, where the year is carried by the surrounding text. */
export function formatDateShort(iso: string, locale: Locale = DEFAULT_LOCALE): string {
  const date = new Date(`${iso}T00:00:00`)
  if (Number.isNaN(date.getTime())) return iso
  return `${date.getDate()} ${MONTHS[locale][date.getMonth()]}`
}

/**
 * The moment a record was committed — a full ISO timestamp, unlike a collection
 * date, which is a calendar day the report printed.
 */
export function formatTimestamp(iso: string, locale: Locale = DEFAULT_LOCALE): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return `${date.getDate()} ${MONTHS[locale][date.getMonth()]} ${date.getFullYear()}`
}
