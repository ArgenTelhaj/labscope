import type { Series } from '../domain/series'
import { positionInRange, statusOf } from '../domain/value'
import { STATUS_SHORT_KEY, useI18n, type Translate } from '../i18n'
import { clamp } from './scale'

/**
 * The 40px summary at the foot of a panel card.
 *
 * A sparkline across a panel would be a lie — the analytes in one panel share
 * no unit and no scale, so a single line through them means nothing. What they
 * *do* share is a position inside their own reported range, which is the same
 * reading the range band gives, miniaturised: one column per value, the dot
 * where that value sits between the bounds its lab printed.
 *
 * Values the report gave no range for get a hollow tick at the baseline rather
 * than a guessed position — there is no fallback range anywhere in this app.
 */

const COLUMN = 11
const HEIGHT = 40
const TOP = 6
const BOTTOM = HEIGHT - 6
const MAX_COLUMNS = 14

export function PanelStrip({ series }: { series: Series[] }) {
  const { t } = useI18n()
  const shown = series.slice(0, MAX_COLUMNS)
  const width = Math.max(shown.length * COLUMN, COLUMN)

  return (
    <svg
      className="panelstrip"
      viewBox={`0 0 ${width} ${HEIGHT}`}
      width={width}
      height={HEIGHT}
      role="img"
      aria-label={ariaFor(series, t)}
      focusable="false"
    >
      {shown.map((s, i) => {
        const o = s.latest.observation
        const status = statusOf(o)
        const position = positionInRange(o)
        const x = i * COLUMN + COLUMN / 2

        const colour =
          status === 'critical'
            ? 'var(--status-critical)'
            : status === 'outside'
              ? 'var(--status-outside)'
              : status === 'within'
                ? 'var(--status-within)'
                : 'var(--ink-muted)'

        // Position is measured from the low bound up, so the drawing matches
        // the range band: high sits high.
        const y =
          position === null
            ? BOTTOM
            : BOTTOM - clamp(position, -0.12, 1.12) * (BOTTOM - TOP)

        return (
          <g key={s.key}>
            <line
              x1={x}
              x2={x}
              y1={TOP}
              y2={BOTTOM}
              stroke="var(--grid)"
              strokeWidth={3}
              strokeLinecap="round"
            />
            {position === null ? (
              <circle cx={x} cy={y} r={2.5} fill="none" stroke={colour} strokeWidth={1.5} />
            ) : (
              <circle cx={x} cy={clamp(y, TOP, BOTTOM)} r={3.5} fill={colour} />
            )}
          </g>
        )
      })}
    </svg>
  )
}

function ariaFor(series: Series[], t: Translate): string {
  const counts = new Map<string, number>()
  for (const s of series) {
    const short = t(STATUS_SHORT_KEY[statusOf(s.latest.observation)])
    counts.set(short, (counts.get(short) ?? 0) + 1)
  }
  return [...counts]
    .map(([status, count]) => t('panel.strip.aria', { count, status: status.toLowerCase() }))
    .join(', ')
}
