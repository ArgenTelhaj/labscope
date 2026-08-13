import { createContext, useContext } from 'react'
import { LABELS, textFor, type LabelKey } from './labels'
import type { Locale } from './locale'

/**
 * Reading a label. The provider that holds the chosen language lives in
 * `I18nProvider.tsx`, and the two components that render labels — `Marked` and
 * `LanguagePicker` — live in `src/ui`; this module stays component-free so it
 * can be imported from anywhere, including outside React.
 */

export { LABELS, textFor } from './labels'
export type { Label, LabelKey, LabelText } from './labels'
export { DEFAULT_LOCALE, isLocale, LOCALES } from './locale'
export type { Locale } from './locale'
export { INTERPRETATION_KEY, NOTICE_KEY, STATUS_LONG_KEY, STATUS_SHORT_KEY } from './labels'

export const LOCALE_STORAGE_KEY = 'labscope.locale.v1'

export type Vars = Record<string, string | number>
export type Translate = (key: LabelKey, vars?: Vars) => string

/** Resolves a label to a string in one locale. Pure — usable outside React. */
export function translate(key: LabelKey, locale: Locale, vars?: Vars): string {
  const text = textFor(LABELS[key], locale)
  const chosen = typeof text === 'string' ? text : Number(vars?.count) === 1 ? text.one : text.other
  return vars ? interpolate(chosen, vars) : chosen
}

function interpolate(text: string, vars: Vars): string {
  return text.replace(/\{(\w+)\}/g, (whole, name: string) =>
    name in vars ? String(vars[name]) : whole,
  )
}

export type I18n = {
  locale: Locale
  setLocale: (locale: Locale) => void
  /** Label → text. */
  t: Translate
  /** A collection date, in the active language. */
  d: (iso: string) => string
  /** The short form, for chart axes. */
  dShort: (iso: string) => string
  /** A stored ISO timestamp, in the active language. */
  dStamp: (iso: string) => string
}

export const I18nContext = createContext<I18n | null>(null)

export function useI18n(): I18n {
  const context = useContext(I18nContext)
  if (!context) throw new Error('useI18n must be used inside <I18nProvider>')
  return context
}
