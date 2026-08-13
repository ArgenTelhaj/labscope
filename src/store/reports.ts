import { useSyncExternalStore } from 'react'
import type { Observation, Report, ReportProposal } from '../domain/types'
import { parseNumber, parseRawValue, seriesKeyFor } from '../domain/value'

/**
 * Local, in-browser persistence for the MVP. No backend, no network, no
 * analytics — health data never leaves the device in this build (vision §11).
 * The storage shape mirrors the domain model so moving to a real backend is a
 * transport change, not a remodelling.
 */

const STORAGE_KEY = 'labscope.reports.v1'

let reports: Report[] = load()
const listeners = new Set<() => void>()

function load(): Report[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as Report[]) : []
  } catch {
    return []
  }
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reports))
  } catch {
    // Storage full or blocked: the in-memory record still works for this
    // session. Nothing is logged — it would be health data.
  }
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useReports(): Report[] {
  return useSyncExternalStore(subscribe, () => reports)
}

function id(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`
}

/**
 * Turns a reviewed proposal into a record. This is the commit step — the point
 * at which a human has confirmed what the document said.
 */
export function commitProposal(proposal: ReportProposal): Report {
  const reportId = id('rep')

  const observations: Observation[] = proposal.observations
    .filter((o) => o.include && o.rawLabel.trim() && o.rawValue.trim())
    .map((o) => {
      const { comparator, num } = parseRawValue(o.rawValue)
      const low = parseNumber(o.rangeLow)
      const high = parseNumber(o.rangeHigh)
      const hasBound = low !== null || high !== null

      return {
        id: id('obs'),
        reportId,
        rawLabel: o.rawLabel.trim(),
        panelRaw: o.panelRaw.trim() || null,
        rawValue: o.rawValue.trim(),
        comparator,
        valueNum: num,
        unitRaw: o.unitRaw.trim() || null,
        seriesKey: seriesKeyFor(o.rawLabel),
        interpretation: o.interpretation,
        referenceRange: {
          low,
          high,
          unitRaw: o.unitRaw.trim() || null,
          qualifier: o.rangeQualifier.trim() || null,
          provenance: hasBound ? 'from_report' : 'none',
          rawText: hasBound ? `${o.rangeLow}${o.rangeHigh ? `–${o.rangeHigh}` : ''}` : null,
        },
        entryMode: o.source.rawLine ? 'extracted' : 'manual',
        confidence: o.source.rawLine ? o.confidence : 1,
        source: o.source,
      } satisfies Observation
    })

  const report: Report = {
    id: reportId,
    collectedAt: proposal.collectedAt,
    reportedAt: proposal.reportedAt || null,
    performingLab: proposal.performingLab.trim() || null,
    fasting: proposal.fasting,
    documentName: proposal.documentName,
    committedAt: new Date().toISOString(),
    observations,
  }

  reports = [...reports, report].sort((a, b) => b.collectedAt.localeCompare(a.collectedAt))
  persist()
  return report
}

/**
 * Removes a report and everything read from it. A real record is append-only
 * (vision §7) — this exists because the MVP is local-only and a user needs to
 * be able to undo a bad import.
 */
export function deleteReport(reportId: string) {
  reports = reports.filter((r) => r.id !== reportId)
  persist()
}
