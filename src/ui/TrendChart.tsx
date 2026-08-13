import { useState } from 'react'
import type { Series, SeriesPoint } from '../domain/series'
import { formatDateShort } from '../domain/series'
import { formatNumber, isPlottable, statusOf } from '../domain/value'
import { clamp, domainFor } from './scale'

/**
 * One analyte over time (vision §8, L3).
 *
 * Honesty rules baked into the geometry:
 *  - the y-axis is anchored to the reported range, not to the data, so normal
 *    fluctuation is not magnified into a dramatic slope
 *  - the range band is drawn per point from that point's own reported range, so
 *    a lab changing its interval is visible instead of averaged away
 *  - a change of performing lab draws a seam; the line is never silently
 *    continuous across labs that may not be comparable (vision §4.3)
 *  - censored values ("<0.01") are not plotted as if they were exact
 */

const W = 320
const H = 190
const PAD = { top: 14, right: 16, bottom: 26, left: 38 }

export function TrendChart({ series }: { series: Series }) {
  const [active, setActive] = useState<number | null>(null)

  const points = series.points.filter((p) => isPlottable(p.observation))
  if (points.length < 3) return null

  const times = points.map((p) => dateValue(p.report.collectedAt))
  const tMin = Math.min(...times)
  const tMax = Math.max(...times)
  const [yMin, yMax] = yDomain(points)

  const x = (t: number) =>
    PAD.left + ((t - tMin) / (tMax - tMin || 1)) * (W - PAD.left - PAD.right)
  const y = (v: number) =>
    H - PAD.bottom - ((v - yMin) / (yMax - yMin || 1)) * (H - PAD.top - PAD.bottom)

  const coords = points.map((p, i) => ({
    point: p,
    cx: x(times[i]),
    cy: y(p.observation.valueNum as number),
  }))

  const path = coords.map((c, i) => `${i === 0 ? 'M' : 'L'}${c.cx} ${c.cy}`).join(' ')
  const bands = bandSegments(coords, yMin, yMax, y)
  // The seam sits between the two results, because that is where the change
  // happened — not on either result.
  const seams = coords
    .map((c, i) => ({ c, i }))
    .filter(({ c, i }) => i > 0 && labOf(c.point) !== labOf(coords[i - 1].point))
    .map(({ c, i }) => ({ x: (coords[i - 1].cx + c.cx) / 2 }))

  const activePoint = active !== null ? coords[active] : null
  const latestRange = points[points.length - 1].observation.referenceRange

  return (
    <figure style={{ margin: 0, maxWidth: 560 }}>
      <svg
        className="chart"
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`${series.displayLabel} over time, ${points.length} results`}
        onPointerLeave={() => setActive(null)}
      >
        {/* the lab's reported range, per point */}
        {bands.map((b, i) => (
          <rect
            key={`band${i}`}
            x={b.x}
            y={b.y}
            width={b.width}
            height={b.height}
            fill="var(--series-1-wash)"
          />
        ))}

        {/* range bounds as hairlines, so the band edge is readable in greyscale */}
        {latestRange.low !== null && latestRange.low >= yMin && (
          <line
            x1={PAD.left}
            x2={W - PAD.right}
            y1={y(latestRange.low)}
            y2={y(latestRange.low)}
            stroke="var(--grid)"
          />
        )}
        {latestRange.high !== null && latestRange.high <= yMax && (
          <line
            x1={PAD.left}
            x2={W - PAD.right}
            y1={y(latestRange.high)}
            y2={y(latestRange.high)}
            stroke="var(--grid)"
          />
        )}

        {/* baseline */}
        <line
          x1={PAD.left}
          x2={W - PAD.right}
          y1={H - PAD.bottom}
          y2={H - PAD.bottom}
          stroke="var(--baseline)"
        />

        {/* seams where the performing lab changed */}
        {seams.map((s, i) => {
          // Keep the annotation inside the plot: flip it left when the seam is
          // close to the right edge, rather than letting it clip.
          const flip = s.x > W - PAD.right - 40
          return (
            <g key={`seam${i}`}>
              <line
                x1={s.x}
                x2={s.x}
                y1={PAD.top}
                y2={H - PAD.bottom}
                stroke="var(--baseline)"
              />
              <text
                x={s.x + (flip ? -3 : 3)}
                y={PAD.top + 8}
                fontSize={8}
                textAnchor={flip ? 'end' : 'start'}
                fill="var(--ink-muted)"
                fontFamily="var(--font)"
              >
                new lab
              </text>
            </g>
          )
        })}

        <path
          d={path}
          fill="none"
          stroke="var(--series-1)"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {coords.map((c, i) => {
          const status = statusOf(c.point.observation)
          const fill =
            status === 'critical'
              ? 'var(--status-critical)'
              : status === 'outside'
                ? 'var(--status-outside)'
                : 'var(--series-1)'
          return (
            <g key={c.point.observation.id}>
              <circle cx={c.cx} cy={c.cy} r={4.5} fill={fill} stroke="var(--surface-1)" strokeWidth={2} />
              {/* hit target, larger than the mark */}
              <circle
                cx={c.cx}
                cy={c.cy}
                r={14}
                fill="transparent"
                style={{ cursor: 'pointer' }}
                onPointerEnter={() => setActive(i)}
                onPointerDown={() => setActive(i)}
              />
            </g>
          )
        })}

        {/* y ticks: the range bounds carry the scale */}
        {yTicks(latestRange.low, latestRange.high, yMin, yMax).map((t) => (
          <text
            key={`tick${t}`}
            x={PAD.left - 6}
            y={y(t) + 3}
            fontSize={9}
            textAnchor="end"
            fill="var(--ink-muted)"
            fontFamily="var(--font)"
          >
            {formatNumber(t)}
          </text>
        ))}

        {/* x ticks: first and last only — the tooltip carries the rest */}
        <text
          x={PAD.left}
          y={H - 8}
          fontSize={9}
          fill="var(--ink-muted)"
          fontFamily="var(--font)"
        >
          {formatDateShort(points[0].report.collectedAt)}
        </text>
        <text
          x={W - PAD.right}
          y={H - 8}
          fontSize={9}
          textAnchor="end"
          fill="var(--ink-muted)"
          fontFamily="var(--font)"
        >
          {formatDateShort(points[points.length - 1].report.collectedAt)}
        </text>

        {activePoint && (
          <g pointerEvents="none">
            <line
              x1={activePoint.cx}
              x2={activePoint.cx}
              y1={PAD.top}
              y2={H - PAD.bottom}
              stroke="var(--baseline)"
            />
            <Tooltip
              x={activePoint.cx}
              y={activePoint.cy}
              lines={[
                `${activePoint.point.observation.rawValue}${
                  activePoint.point.observation.unitRaw
                    ? ` ${activePoint.point.observation.unitRaw}`
                    : ''
                }`,
                formatDateShort(activePoint.point.report.collectedAt),
              ]}
            />
          </g>
        )}
      </svg>

      <figcaption className="legend" style={{ marginTop: 'var(--space-2)' }}>
        <span className="legend__item">
          <span className="legend__swatch" />
          As reported
        </span>
        <span className="legend__item">
          <span className="legend__swatch legend__swatch--band" />
          Range printed by the lab
        </span>
      </figcaption>
    </figure>
  )
}

function Tooltip({ x, y, lines }: { x: number; y: number; lines: string[] }) {
  const width = Math.max(...lines.map((l) => l.length)) * 5 + 14
  const height = lines.length * 12 + 8
  const left = clamp(x - width / 2, 2, W - width - 2)
  const top = y - height - 12 < PAD.top ? y + 12 : y - height - 12

  return (
    <g>
      <rect
        x={left}
        y={top}
        width={width}
        height={height}
        rx={5}
        fill="var(--surface-1)"
        stroke="var(--border-strong)"
      />
      {lines.map((line, i) => (
        <text
          key={line + i}
          x={left + 7}
          y={top + 14 + i * 12}
          fontSize={i === 0 ? 10 : 9}
          fontWeight={i === 0 ? 600 : 400}
          fill={i === 0 ? 'var(--ink)' : 'var(--ink-muted)'}
          fontFamily="var(--font)"
        >
          {line}
        </text>
      ))}
    </g>
  )
}

/** A small, axis-free version for list rows. */
export function Sparkline({ series }: { series: Series }) {
  const points = series.points.filter((p) => isPlottable(p.observation))
  if (points.length < 3) return null

  const values = points.map((p) => p.observation.valueNum as number)
  // Anchored to the reported range, exactly like the full chart: a sparkline
  // scaled to its own min/max turns ordinary variation into a cliff.
  const [min, max] = sparklineDomain(points, values)
  const span = max - min || 1
  const w = 64
  const h = 18

  const path = values
    .map((v, i) => {
      const px = (i / (values.length - 1)) * w
      const py = h - 2 - ((v - min) / span) * (h - 4)
      return `${i === 0 ? 'M' : 'L'}${px.toFixed(1)} ${py.toFixed(1)}`
    })
    .join(' ')

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden focusable="false">
      <path
        d={path}
        fill="none"
        stroke="var(--series-1)"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function sparklineDomain(points: SeriesPoint[], values: number[]): [number, number] {
  const { low, high } = points[points.length - 1].observation.referenceRange
  const base = domainFor(low, high, values[0])
  let lo = base ? base[0] : Math.min(...values)
  let hi = base ? base[1] : Math.max(...values)
  const pad = (hi - lo || Math.abs(hi) || 1) * 0.1
  lo = Math.min(lo, Math.min(...values) - pad)
  hi = Math.max(hi, Math.max(...values) + pad)
  return [lo, hi]
}

function labOf(p: SeriesPoint): string {
  return p.report.performingLab ?? ''
}

function dateValue(iso: string): number {
  const t = Date.parse(`${iso}T00:00:00`)
  return Number.isNaN(t) ? 0 : t
}

function yDomain(points: SeriesPoint[]): [number, number] {
  const values: number[] = []
  for (const p of points) {
    values.push(p.observation.valueNum as number)
    const { low, high } = p.observation.referenceRange
    if (low !== null) values.push(low)
    if (high !== null) values.push(high)
  }
  const min = Math.min(...values)
  const max = Math.max(...values)
  const pad = (max - min || Math.abs(max) || 1) * 0.15
  return [min - pad, max + pad]
}

/** Rectangles for each point's own reported range, spanning to its neighbours. */
function bandSegments(
  coords: Array<{ point: SeriesPoint; cx: number }>,
  yMin: number,
  yMax: number,
  y: (v: number) => number,
) {
  const segments: Array<{ x: number; y: number; width: number; height: number }> = []

  for (let i = 0; i < coords.length; i++) {
    const { low, high } = coords[i].point.observation.referenceRange
    if (low === null && high === null) continue

    const left = i === 0 ? PAD.left : (coords[i - 1].cx + coords[i].cx) / 2
    const right =
      i === coords.length - 1 ? W - PAD.right : (coords[i].cx + coords[i + 1].cx) / 2

    const top = y(high ?? yMax)
    const bottom = y(low ?? yMin)
    segments.push({ x: left, y: top, width: Math.max(right - left, 0), height: bottom - top })
  }

  return segments
}

function yTicks(
  low: number | null,
  high: number | null,
  yMin: number,
  yMax: number,
): number[] {
  const ticks = [low, high].filter((t): t is number => t !== null && t >= yMin && t <= yMax)
  return ticks.length > 0 ? ticks : [round(yMin), round(yMax)]
}

function round(n: number): number {
  const magnitude = Math.abs(n)
  if (magnitude >= 100) return Math.round(n)
  if (magnitude >= 10) return Math.round(n * 10) / 10
  return Math.round(n * 100) / 100
}
