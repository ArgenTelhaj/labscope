import { LOCALES, useI18n } from '../i18n'

/**
 * The language switcher: a segmented pair while there are two languages, and
 * still readable as a row at three or four. Each option is written in its own
 * language — a reader looking for Albanian should not have to find it under an
 * English name.
 */
export function LanguagePicker() {
  const { locale, setLocale, t } = useI18n()

  return (
    <div className="langpick" role="group" aria-label={t('app.language.aria')}>
      {LOCALES.map((option) => (
        <button
          key={option.code}
          type="button"
          className="langpick__option"
          aria-pressed={option.code === locale}
          title={option.name}
          onClick={() => setLocale(option.code)}
        >
          {option.short}
        </button>
      ))}
    </div>
  )
}
