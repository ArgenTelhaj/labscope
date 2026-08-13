import type { ObservationProposal, ReportProposal } from '../domain/types'

/** An empty proposal — the starting point for typing a report in by hand. */
export function emptyProposal(): ReportProposal {
  return {
    collectedAt: '',
    reportedAt: '',
    performingLab: '',
    fasting: null,
    documentName: null,
    observations: [blankObservation(0)],
    notice: null,
  }
}

export function blankObservation(index: number, documentName = ''): ObservationProposal {
  return {
    key: `m${index}_${Math.random().toString(36).slice(2, 8)}`,
    include: true,
    rawLabel: '',
    panelRaw: '',
    rawValue: '',
    unitRaw: '',
    rangeLow: '',
    rangeHigh: '',
    rangeQualifier: '',
    interpretation: null,
    confidence: 1,
    source: { documentName, page: null, rawLine: null },
  }
}
