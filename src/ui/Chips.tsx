import type { Observation } from '../domain/types'
import { INTERPRETATION_LABEL, STATUS_SHORT, statusOf } from '../domain/value'
import { IconAlert } from './icons'

/**
 * Status is never colour alone: every chip carries a word, and an icon where it
 * signals attention (vision §9, principle 1).
 */
export function StatusChip({ observation }: { observation: Observation }) {
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
      ? INTERPRETATION_LABEL[observation.interpretation]
      : undefined

  return (
    <span className={`chip${modifier}`} title={title}>
      {(status === 'outside' || status === 'critical') && (
        <span className="chip__icon" style={{ display: 'inline-flex' }}>
          <IconAlert />
        </span>
      )}
      {STATUS_SHORT[status]}
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
  const label = lab ?? 'Lab not recorded'
  return (
    <span className="chip">
      {label}
      {entryMode === 'manual' ? ' · typed in' : ''}
    </span>
  )
}

/** Shown only where confidence is low enough to deserve a second look. */
export function ConfidenceChip({ confidence }: { confidence: number }) {
  if (confidence >= 0.75) return null
  return (
    <span className="chip chip--attention">
      <span className="chip__icon" style={{ display: 'inline-flex' }}>
        <IconAlert />
      </span>
      Check this
    </span>
  )
}
