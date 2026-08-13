/**
 * The set of languages the interface speaks. Kept in a module of its own, with
 * no imports, so both the label catalogue and the date formatter can depend on
 * it without depending on each other.
 *
 * Adding a language is three steps: a code here, a translation key on `Label`
 * in `labels.ts`, and month names in `dates.ts`.
 */

export type Locale = 'en' | 'sq'

export const LOCALES: ReadonlyArray<{ code: Locale; name: string; short: string }> = [
  { code: 'en', name: 'English', short: 'EN' },
  { code: 'sq', name: 'Shqip', short: 'SQ' },
]

/** The locale the main value of every label is written in. */
export const DEFAULT_LOCALE = 'en' satisfies Locale

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && LOCALES.some((l) => l.code === value)
}
