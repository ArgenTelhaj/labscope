/**
 * Scale helpers shared by the band and the trend chart.
 *
 * The axis is anchored to the reference range, not to the data — a y-axis fitted
 * to the values exaggerates movement, and here the exaggeration is of someone's
 * health (vision §8).
 */

export function domainFor(
  low: number | null,
  high: number | null,
  value: number,
): [number, number] | null {
  let lo: number
  let hi: number

  if (low !== null && high !== null && high > low) {
    const pad = (high - low) * 0.6
    lo = low - pad
    hi = high + pad
  } else if (high !== null) {
    lo = Math.min(0, value)
    hi = high * 1.6
  } else if (low !== null) {
    lo = low * 0.4
    hi = Math.max(low * 1.6, value * 1.1)
  } else {
    return null
  }

  // Always keep the value on screen, with a margin so it never sits on the edge.
  const span = hi - lo || 1
  if (value < lo) lo = value - span * 0.1
  if (value > hi) hi = value + span * 0.1
  return [lo, hi]
}

export function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v))
}
