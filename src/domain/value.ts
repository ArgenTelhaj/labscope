import type {
  Comparator,
  LabInterpretation,
  Observation,
  ReferenceRangeSnapshot,
} from './types'

/**
 * Value handling. Lab values are not always numbers, and the ones that are
 * often carry a comparator ("<0.01"). Plotting a censored value as its bound is
 * a subtle lie (vision §4.2), so censored values are parsed but never charted
 * as if they were exact.
 */

export type ParsedValue = {
  comparator: Comparator
  num: number | null
}

const COMPARATORS: Array<[RegExp, Comparator]> = [
  [/^<=|^≤/, 'lte'],
  [/^>=|^≥/, 'gte'],
  [/^</, 'lt'],
  [/^>/, 'gt'],
]

/**
 * Reads a printed value. Returns `num: null` for anything that is not a number
 * ("Negative", "1:160", "Trace") — those are kept as raw text only.
 */
export function parseRawValue(raw: string): ParsedValue {
  const trimmed = raw.trim()
  let rest = trimmed
  let comparator: Comparator = 'eq'

  for (const [pattern, cmp] of COMPARATORS) {
    if (pattern.test(rest)) {
      comparator = cmp
      rest = rest.replace(pattern, '').trim()
      break
    }
  }

  const num = parseNumber(rest)
  return { comparator, num }
}

/**
 * Parses a printed number, accepting the comma decimal separator used across
 * most of Europe. `1,25` is 1.25 — reading it as 125 is the classic ingestion
 * failure (vision §4.4), so it is handled explicitly rather than by accident.
 * A comma with exactly three following digits is ambiguous (`1,250`); those are
 * treated as thousands separators only when a decimal point is also present.
 */
export function parseNumber(text: string): number | null {
  const t = text.trim()
  if (!/^[+-]?[\d.,]+$/.test(t) || !/\d/.test(t)) return null

  let normalised = t
  if (t.includes(',') && t.includes('.')) {
    // Both present: the last one is the decimal separator.
    normalised =
      t.lastIndexOf(',') > t.lastIndexOf('.')
        ? t.replace(/\./g, '').replace(',', '.')
        : t.replace(/,/g, '')
  } else if (t.includes(',')) {
    normalised = t.replace(',', '.')
  }

  const value = Number(normalised)
  return Number.isFinite(value) ? value : null
}

/** True when the value is a number we can position against a range. */
export function isPlottable(o: Observation): boolean {
  return o.valueNum !== null && o.comparator === 'eq'
}

export function hasRange(range: ReferenceRangeSnapshot): boolean {
  return range.provenance === 'from_report' && (range.low !== null || range.high !== null)
}

/**
 * Status is derived in this order, and no further:
 *   1. the lab's own flag, when the report printed one
 *   2. the lab's own printed range, compared against the value
 *   3. unknown — the report gave us nothing to compare against
 *
 * There is no "borderline" grade and no verdict of our own. The app reports
 * what the issuing lab said (vision §4.5, §5).
 */
export type ResultStatus = 'within' | 'outside' | 'critical' | 'unknown'

export function statusOf(o: Observation): ResultStatus {
  if (o.interpretation === 'HH' || o.interpretation === 'LL') return 'critical'
  if (o.interpretation === 'H' || o.interpretation === 'L') return 'outside'
  if (o.interpretation === 'N') return 'within'

  const { low, high } = o.referenceRange
  if (!hasRange(o.referenceRange) || o.valueNum === null) return 'unknown'

  if (low !== null && o.valueNum < low) return 'outside'
  if (high !== null && o.valueNum > high) return 'outside'
  // A censored value can still be conclusively inside or below a bound.
  if (o.comparator === 'lt' || o.comparator === 'lte') {
    if (low !== null && o.valueNum <= low) return 'outside'
    return 'within'
  }
  if (o.comparator === 'gt' || o.comparator === 'gte') {
    if (high !== null && o.valueNum >= high) return 'outside'
    return 'within'
  }
  return 'within'
}

/** Wording used everywhere a status is shown. Neutral: no pass/fail language. */
export const STATUS_LABEL: Record<ResultStatus, string> = {
  within: 'Within the lab’s range',
  outside: 'Outside the lab’s range',
  critical: 'Flagged critical by the lab',
  unknown: 'No range on the report',
}

export const STATUS_SHORT: Record<ResultStatus, string> = {
  within: 'In range',
  outside: 'Out of range',
  critical: 'Critical',
  unknown: 'No range',
}

/**
 * Position of a value inside its reported range, 0 = low bound, 1 = high bound.
 * Returns null when it cannot be placed. Values outside the range are clamped
 * to a small margin so the marker stays visible at the band's edge.
 */
export function positionInRange(o: Observation): number | null {
  const { low, high } = o.referenceRange
  if (o.valueNum === null || low === null || high === null || high <= low) return null
  return (o.valueNum - low) / (high - low)
}

/** Groups observations by the printed label, normalised. Not a canonical id. */
export function seriesKeyFor(rawLabel: string): string {
  return rawLabel
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

export function formatRange(range: ReferenceRangeSnapshot): string | null {
  if (!hasRange(range)) return null
  const unit = range.unitRaw ? ` ${range.unitRaw}` : ''
  if (range.low !== null && range.high !== null) {
    return `${formatNumber(range.low)}–${formatNumber(range.high)}${unit}`
  }
  if (range.high !== null) return `≤ ${formatNumber(range.high)}${unit}`
  if (range.low !== null) return `≥ ${formatNumber(range.low)}${unit}`
  return null
}

/**
 * Numbers are printed back exactly as the lab printed them wherever the raw
 * string is available; this is only for numbers we hold as numbers (range
 * bounds, axis ticks), where we keep the significant figures we were given.
 */
export function formatNumber(n: number): string {
  if (Number.isInteger(n)) return String(n)
  return String(Number(n.toFixed(4)))
}

export const INTERPRETATION_LABEL: Record<LabInterpretation, string> = {
  H: 'High (lab flag)',
  L: 'Low (lab flag)',
  HH: 'Critically high (lab flag)',
  LL: 'Critically low (lab flag)',
  N: 'Normal (lab flag)',
}
