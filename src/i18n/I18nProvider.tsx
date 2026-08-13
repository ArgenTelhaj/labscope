import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { formatDate, formatDateShort, formatTimestamp } from './dates'
import { DEFAULT_LOCALE, isLocale, type Locale } from './locale'
import {
  I18nContext,
  LOCALE_STORAGE_KEY,
  translate,
  type I18n,
  type Translate,
} from './index'

/**
 * The language the app speaks, chosen once and remembered.
 *
 * The choice is an interface preference, not health data, so `localStorage` is
 * the right home for it (vision §11 — nothing stored here identifies a person
 * or a result).
 */
export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>(readStoredLocale)

  useEffect(() => {
    document.documentElement.lang = locale
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, locale)
    } catch {
      // A browser refusing storage should not cost the reader their language.
    }
  }, [locale])

  const t = useCallback<Translate>((key, vars) => translate(key, locale, vars), [locale])

  const value = useMemo<I18n>(
    () => ({
      locale,
      setLocale,
      t,
      d: (iso: string) => formatDate(iso, locale),
      dShort: (iso: string) => formatDateShort(iso, locale),
      dStamp: (iso: string) => formatTimestamp(iso, locale),
    }),
    [locale, t],
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

/** A stored choice wins; failing that, whatever the device asks for. */
function readStoredLocale(): Locale {
  try {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY)
    if (isLocale(stored)) return stored
  } catch {
    // Storage can be denied outright; the default is a fine place to land.
  }
  for (const tag of navigator.languages ?? [navigator.language]) {
    const base = tag.toLowerCase().split('-')[0]
    if (isLocale(base)) return base
  }
  return DEFAULT_LOCALE
}
