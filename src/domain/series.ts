import type { Observation, Report } from './types'
import { seriesKeyFor } from './value'

/**
 * A series is one analyte's history, assembled across reports. In this MVP the
 * identity is the printed label (vision §4.2 — a local name is not an
 * identifier), so the UI says so wherever a series spans more than one lab.
 */
export type SeriesPoint = {
  observation: Observation
  report: Report
}

export type Series = {
  key: string
  /** The most recently printed label for this analyte. */
  displayLabel: string
  /** The section heading the most recent report printed above it, if any. */
  panelLabel: string | null
  /** Oldest first — the time axis is collection date. */
  points: SeriesPoint[]
  latest: SeriesPoint
  /** Distinct performing labs across the series. */
  labs: string[]
  /** Distinct units as printed across the series. */
  units: string[]
}

export function buildSeries(reports: Report[]): Series[] {
  const byKey = new Map<string, SeriesPoint[]>()

  for (const report of reports) {
    for (const observation of report.observations) {
      const key = observation.seriesKey || seriesKeyFor(observation.rawLabel)
      const bucket = byKey.get(key)
      if (bucket) bucket.push({ observation, report })
      else byKey.set(key, [{ observation, report }])
    }
  }

  const series: Series[] = []
  for (const [key, unsorted] of byKey) {
    const points = [...unsorted].sort((a, b) =>
      a.report.collectedAt.localeCompare(b.report.collectedAt),
    )
    const latest = points[points.length - 1]
    series.push({
      key,
      displayLabel: latest.observation.rawLabel,
      // The newest report's heading wins: it is the grouping the user last saw
      // on paper. Records saved before headings were captured have none.
      panelLabel: lastPanel(points),
      points,
      latest,
      labs: unique(points.map((p) => p.report.performingLab)),
      units: unique(points.map((p) => p.observation.unitRaw)),
    })
  }

  return series.sort((a, b) => a.displayLabel.localeCompare(b.displayLabel))
}

export function findSeries(reports: Report[], key: string): Series | undefined {
  return buildSeries(reports).find((s) => s.key === key)
}

/* --------------------------------------------------------------- panels --- */

/**
 * A panel is one section of a report, as that report printed it — "Thyroid
 * function", "Lipid profile". It is the first level of the results view
 * (vision §8, L1).
 *
 * Grouping is organisation, not interpretation: the heading comes off the
 * document, never from a table of ours mapping analytes to organs or systems.
 * Anything the report left unheaded collects under one honest catch-all rather
 * than being placed somewhere by guess.
 */
export type Panel = {
  key: string
  /** As printed, or the catch-all wording for results that had no heading. */
  label: string
  /** True when these results simply had no heading on their report. */
  unlabelled: boolean
  series: Series[]
  /** Most recent collection date across the panel. */
  latestDate: string
}

export const UNGROUPED_PANEL_KEY = '~ungrouped'
const UNGROUPED_PANEL_LABEL = 'Other results'

export function panelKeyFor(panelRaw: string | null | undefined): string {
  const normalised = (panelRaw ?? '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
  return normalised || UNGROUPED_PANEL_KEY
}

export function buildPanels(series: Series[]): Panel[] {
  const byKey = new Map<string, Series[]>()

  for (const s of series) {
    const key = panelKeyFor(s.panelLabel)
    const bucket = byKey.get(key)
    if (bucket) bucket.push(s)
    else byKey.set(key, [s])
  }

  const panels: Panel[] = []
  for (const [key, members] of byKey) {
    const unlabelled = key === UNGROUPED_PANEL_KEY
    panels.push({
      key,
      label: unlabelled ? UNGROUPED_PANEL_LABEL : (members[0].panelLabel ?? UNGROUPED_PANEL_LABEL),
      unlabelled,
      series: members,
      latestDate: members.reduce(
        (newest, s) =>
          s.latest.report.collectedAt > newest ? s.latest.report.collectedAt : newest,
        '',
      ),
    })
  }

  // Newest panel first, so the last report you added is the one you land on.
  // The catch-all always sorts last: it is a leftover, not a finding.
  return panels.sort((a, b) => {
    if (a.unlabelled !== b.unlabelled) return a.unlabelled ? 1 : -1
    return b.latestDate.localeCompare(a.latestDate) || a.label.localeCompare(b.label)
  })
}

function lastPanel(points: SeriesPoint[]): string | null {
  for (let i = points.length - 1; i >= 0; i--) {
    const panel = points[i].observation.panelRaw
    if (panel) return panel
  }
  return null
}

function unique(values: Array<string | null>): string[] {
  return [...new Set(values.filter((v): v is string => Boolean(v)))]
}

/** Locale-independent, short, and unambiguous — no US/EU date confusion. */
export function formatDate(iso: string): string {
  if (!iso) return 'Date not set'
  const date = new Date(`${iso}T00:00:00`)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function formatDateShort(iso: string): string {
  const date = new Date(`${iso}T00:00:00`)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}
