/**
 * MVP subset of the domain model in docs/product-vision.md §6.
 *
 * Deliberately narrower than the full model — no ACCOUNT/SUBJECT/tenancy (single
 * local user), no LOINC identity, no UCUM coding yet — but the shapes that exist
 * here match the ones described there, so widening them later is additive.
 *
 * The non-negotiables that ARE honoured here:
 *  - a reference range belongs to the observation and carries its provenance
 *  - raw label and raw value are preserved exactly as printed
 *  - the time axis is specimen collection time
 *  - values are not always numbers
 *  - interpretation flags come from the lab, never from us
 *  - every observation links back to where it was read from
 */

export type Comparator = 'eq' | 'lt' | 'gt' | 'lte' | 'gte'

/** The lab's own flag, as printed. We report it; we never derive it. */
export type LabInterpretation = 'H' | 'L' | 'HH' | 'LL' | 'N'

export type EntryMode = 'extracted' | 'manual'

/**
 * Captured from the issuing report. `provenance: 'none'` means the report did
 * not print a range — the UI says so rather than inventing one. There is
 * deliberately no fallback table in this codebase.
 */
export type ReferenceRangeSnapshot = {
  low: number | null
  high: number | null
  /** Unit as printed next to the range, when it differs from the value's. */
  unitRaw: string | null
  /** "adult male", "3rd trimester" — as printed. */
  qualifier: string | null
  provenance: 'from_report' | 'none'
  /** The exact text the range was read from. */
  rawText: string | null
}

/** Where an observation was read from — the MVP stand-in for a page region. */
export type SourceRegion = {
  documentName: string
  page: number | null
  /** The full text line the values were parsed out of. */
  rawLine: string | null
}

export type Observation = {
  id: string
  reportId: string

  /** Exactly as printed. Never overwritten by normalisation. */
  rawLabel: string

  /**
   * The section heading printed above this row on the report — "Thyroid
   * function", "Lipid profile", "Hematologji". Raw, as printed, and null when
   * the report printed no headings. It is the lab's own grouping, captured
   * like any other printed fact; LabScope never invents one, and never sorts a
   * result into a group the report did not put it in.
   */
  panelRaw: string | null
  /** Exactly as printed: "14.2", "<0.01", "Negative", "1:160". */
  rawValue: string

  /** Parsed forms. `valueNum` is null for non-numeric results. */
  comparator: Comparator
  valueNum: number | null
  /** Unit as printed. UCUM coding is a later phase. */
  unitRaw: string | null

  /**
   * Grouping key for the longitudinal series. In this MVP it is derived from
   * the printed label (normalised case/punctuation) — NOT a canonical analyte
   * identity. The UI states this. LOINC mapping replaces it later.
   */
  seriesKey: string

  interpretation: LabInterpretation | null
  referenceRange: ReferenceRangeSnapshot
  entryMode: EntryMode
  /** Per-field extraction confidence, 0–1. Manual entry is 1. */
  confidence: number
  source: SourceRegion
}

export type Report = {
  id: string
  /** The time axis. Specimen collection, never upload. ISO date (YYYY-MM-DD). */
  collectedAt: string
  reportedAt: string | null
  performingLab: string | null
  fasting: boolean | null
  /** Filename of the uploaded document, or null for manual entry. */
  documentName: string | null
  /** Set when the user confirmed the proposal — the moment it became a record. */
  committedAt: string
  observations: Observation[]
}

/**
 * A proposal is what extraction produces. It is not a record until a human
 * commits it (vision §7). Same shape as the committed form minus the ids.
 */
export type ObservationProposal = {
  /** Stable key for React lists and edits within the review screen. */
  key: string
  include: boolean
  rawLabel: string
  panelRaw: string
  rawValue: string
  unitRaw: string
  rangeLow: string
  rangeHigh: string
  rangeQualifier: string
  interpretation: LabInterpretation | null
  confidence: number
  source: SourceRegion
}

/**
 * What ingestion has to say about a proposal it could not fill. A code, not a
 * sentence: the wording lives in `src/i18n/labels.ts` so it can be read in the
 * reader's own language.
 */
export type ProposalNotice = 'no-text-layer' | 'no-results-found' | 'needs-ocr'

export type ReportProposal = {
  collectedAt: string
  reportedAt: string
  performingLab: string
  fasting: boolean | null
  documentName: string | null
  observations: ObservationProposal[]
  /** Why extraction produced nothing, when it produced nothing. */
  notice: ProposalNotice | null
}
