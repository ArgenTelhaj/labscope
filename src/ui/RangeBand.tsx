import type { Observation } from '../domain/types'
import { formatNumber, hasRange, statusOf } from '../domain/value'
import { useI18n, type Translate } from '../i18n'
import { clamp, domainFor } from './scale'

/**
 * The atom of the design system: where a value sits inside the range the
 * issuing lab printed. Position carries the meaning, so the reading survives
 * colour blindness, greyscale print and a squinting reader (vision §9).
 *
 * Never rendered when the report printed no range — there is no fallback table.
 */
export function RangeBand({ observation }: { observation: Observation }) {
  const { t } = useI18n()
  const { low, high } = observation.referenceRange
  if (!hasRange(observation.referenceRange) || observation.valueNum === null) return null

  const domain = domainFor(low, high, observation.valueNum)
  if (!domain) return null

  const scale = (v: number) => ((v - domain[0]) / (domain[1] - domain[0])) * 100
  const bandLeft = low !== null ? scale(low) : 0
  const bandRight = high !== null ? scale(high) : 100
  const marker = clamp(scale(observation.valueNum), 1, 99)
  const status = statusOf(observation)
  const censored = observation.comparator !== 'eq'

  const markerColor =
    status === 'critical'
      ? 'var(--status-critical)'
      : status === 'outside'
        ? 'var(--status-outside)'
        : 'var(--ink)'

  return (
    <div>
      <div
        style={{ position: 'relative', height: 18 }}
        role="img"
        aria-label={rangeAria(observation, t)}
      >
        {/* track */}
        <div
          style={{
            position: 'absolute',
            insetInline: 0,
            top: 6,
            height: 6,
            borderRadius: 3,
            background: 'var(--grid)',
          }}
        />
        {/* the lab's reported range */}
        <div
          style={{
            position: 'absolute',
            left: `${bandLeft}%`,
            width: `${Math.max(bandRight - bandLeft, 2)}%`,
            top: 6,
            height: 6,
            borderRadius: 3,
            background: 'var(--series-1-wash)',
            border: '1px solid color-mix(in srgb, var(--series-1) 35%, transparent)',
            boxSizing: 'border-box',
          }}
        />
        {/*
          The value — 2px surface ring keeps it legible over the band. A
          censored value ("<0.01") gets a hollow marker: it is somewhere below
          its bound, and drawing it filled would state a precision the lab did
          not report (vision §4.2).
        */}
        <div
          style={{
            position: 'absolute',
            left: `${marker}%`,
            top: 2,
            width: 14,
            height: 14,
            marginLeft: -7,
            borderRadius: '50%',
            background: censored ? 'var(--surface-1)' : markerColor,
            border: censored ? `2px solid ${markerColor}` : undefined,
            boxSizing: 'border-box',
            boxShadow: '0 0 0 2px var(--surface-1)',
          }}
        />
      </div>
      <div
        className="row row--between"
        style={{ fontSize: 'var(--text-xs)', color: 'var(--ink-muted)' }}
      >
        <span>{low !== null ? formatNumber(low) : ''}</span>
        <span>{high !== null ? formatNumber(high) : ''}</span>
      </div>
    </div>
  )
}

function rangeAria(o: Observation, t: Translate): string {
  const { low, high } = o.referenceRange
  const value = `${o.rawValue}${o.unitRaw ? ` ${o.unitRaw}` : ''}`
  if (low !== null && high !== null) {
    return t('band.aria.between', {
      value,
      low: formatNumber(low),
      high: formatNumber(high),
    })
  }
  if (high !== null) return t('band.aria.up-to', { value, high: formatNumber(high) })
  return t('band.aria.from', { value, low: formatNumber(low ?? 0) })
}
