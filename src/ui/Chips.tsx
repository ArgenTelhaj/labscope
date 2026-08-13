import type { Observation } from '../domain/types'
import { statusOf } from '../domain/value'
import { INTERPRETATION_KEY, STATUS_SHORT_KEY, useI18n } from '../i18n'
import { IconAlert } from './icons'

/**
 * Status is never colour alone: every chip carries a word, and an icon where it
 * signals attention (vision §9, principle 1).
 */
export function StatusChip({ observation }: { observation: Observation }) {
  const { t } = useI18n()
  const status = statusOf(observation)
  const modifier =
    status === 'critical'
      ? ' chip--critical'
      : status === 'outside'
        ? ' chip--outside'
        : status === 'within'
          ? ' chip--within'
          : ''

  const title =
    observation.interpretation !== null
      ? t(INTERPRETATION_KEY[observation.interpretation])
      : undefined

  return (
    <span className={`chip${modifier}`} title={title}>
      {(status === 'outside' || status === 'critical') && (
        <span className="chip__icon" style={{ display: 'inline-flex' }}>
          <IconAlert />
        </span>
      )}
      {t(STATUS_SHORT_KEY[status])}
    </span>
  )
}

/** Where this data point came from — surfaced, not buried (vision §9, 6). */
export function ProvenanceChip({
  lab,
  entryMode,
}: {
  lab: string | null
  entryMode?: Observation['entryMode']
}) {
  const { t } = useI18n()
  return (
    <span className="chip">
      {lab ?? t('chip.lab-missing')}
      {entryMode === 'manual' ? ` · ${t('chip.typed-in')}` : ''}
    </span>
  )
}

/** Shown only where confidence is low enough to deserve a second look. */
export function ConfidenceChip({ confidence }: { confidence: number }) {
  const { t } = useI18n()
  if (confidence >= 0.75) return null
  return (
    <span className="chip chip--attention">
      <span className="chip__icon" style={{ display: 'inline-flex' }}>
        <IconAlert />
      </span>
      {t('chip.check-this')}
    </span>
  )
}
