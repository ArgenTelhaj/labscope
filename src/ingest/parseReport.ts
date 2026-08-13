import type { LabInterpretation, ObservationProposal, ReportProposal } from '../domain/types'
import { parseNumber } from '../domain/value'
import { readTable, type TableRow } from './columns'
import type { TextLine } from './pdfText'

/**
 * A deliberately conservative, deterministic extractor for text-layer PDFs.
 *
 * It proposes; it never commits (vision §7). Everything it produces goes to a
 * review screen where a human confirms it against the original, and every field
 * it is unsure about is marked so the reviewer's attention lands there first.
 *
 * It is intentionally NOT clever: no model, no global range table, no guessing
 * at analyte identity. It reads what a line printed, or it declines the line.
 *
 * Two strategies, in order:
 *
 *  1. **Table** — when the report prints a header row, every cell is read by
 *     its column (see `columns.ts`). This is the accurate path, and the one
 *     most lab reports qualify for.
 *  2. **Line** — otherwise, fall back to matching the shape of each line. Less
 *     accurate, so proposals from this path score lower and the reviewer is
 *     pointed at them first.
 */

const NUM = String.raw`\d[\d.,]*`

/** "0.4 - 4.0", "0,4–4,0", "70 to 99" */
const RANGE_PAIR = new RegExp(String.raw`(?<![\w-])(${NUM})\s*(?:-|–|—|to|\.\.\.)\s*(${NUM})(?![\w-])`, 'gi')
/** "< 5.0", "≤ 200", "> 40" */
const RANGE_BOUND = new RegExp(String.raw`(?<![\w])(<=|>=|<|>|≤|≥)\s*(${NUM})(?![\w])`, 'g')

/** Units as printed. Matching is by shape, not by a closed vocabulary. */
const UNIT = new RegExp(
  String.raw`^(?:%|‰|x?10\^?\d+\/?[a-zµμ]*|[a-zµμ°]+(?:\/[a-zµμ0-9^.]+)*(?:\/[a-zµμ0-9^.]+)?)$`,
  'i',
)
const KNOWN_UNIT_HINT =
  /^(?:%|g|mg|µg|μg|ug|ng|pg|kg|l|dl|ml|µl|μl|ul|fl|u|iu|mIU|mol|mmol|µmol|μmol|nmol|pmol|meq|mm|s|sec|ratio|x?10)/i

/** Non-numeric results labs print. Kept verbatim; never coerced to a number. */
const CODED_VALUE =
  /\b(negative|positive|not detected|detected|non-?reactive|reactive|trace|absent|present|normal|abnormal|negativ|pozitiv)\b/i
/** Titres: "1:160" */
const TITRE = /\b\d+\s*:\s*\d+\b/

/** Lines that are page furniture or identity, never results. */
const NOISE =
  /\b(patient|name|nume|address|adresa|phone|telefon|page|pagina|doctor|medic|physician|cnp|born|birth|sex|gender|signature|semnatura|laborator|laboratory|report|raport|result[s]?\s*$|specimen\s*$|www\.|@|©)\b/i

/**
 * A printed date, optionally followed by its time. The separators must match:
 * without that, a reference range printed as "13.5-17.5" reads as a date, and
 * the whole result disappears.
 */
const DATE_TIME = new RegExp(
  String.raw`\b(?:\d{1,2}([-./])\d{1,2}\1\d{2,4}|\d{4}([-./])\d{1,2}\2\d{1,2})(?:\s+\d{1,2}:\d{2}(?::\d{2})?)?\b`,
  'g',
)
/** The same pattern, stateless, for tests that must not carry a lastIndex. */
const DATE_TIME_TEST = new RegExp(DATE_TIME.source)

const FLAG_TOKEN = /^(HH|LL|H|L|N|\*{1,2})$/
const FLAG_WORD = /^(high|low|ridicat|scazut|crescut|elevated|decreased)$/i

/**
 * The lab's own verdict, as words. Albanian and English; the app translates the
 * lab's flag, it does not form one of its own (vision §5). "Critical" is only
 * ever read from a word that actually says so — "very high" is still H.
 */
const WORD_CRITICAL = /\b(critical|panic|kritik|urgjent)\b/
const WORD_HIGH = /\b(larte|lart|high|elevated|increased|crescut|ridicat|mbi)\b/
const WORD_LOW = /\b(ulet|ult|low|decreased|reduced|scazut|nen)\b/
const WORD_NORMAL = /\b(normal|normale|brenda|within)\b/

type ValueHit = { text: string; index: number; length: number }

export type ParseStats = {
  linesRead: number
  linesAccepted: number
  /** Which strategy produced the observations. Diagnostic; see tools/. */
  strategy: 'table' | 'line' | 'none'
}

export function parseReport(
  lines: TextLine[],
  documentName: string,
): { proposal: ReportProposal; stats: ParseStats } {
  const rows = readTable(lines)

  const observations = rows
    ? rows.map((row, index) => fromRow(row, documentName, index))
    : lines
        .map((line, index) => fromLine(line, documentName, index))
        .filter((o): o is ObservationProposal => o !== null)

  const strategy: ParseStats['strategy'] =
    observations.length === 0 ? 'none' : rows ? 'table' : 'line'

  const fullText = lines.map((l) => l.text).join('\n')

  const proposal: ReportProposal = {
    collectedAt: findDate(fullText, COLLECTION_KEYWORDS) ?? '',
    reportedAt: findDate(fullText, REPORT_KEYWORDS) ?? '',
    performingLab: findLab(lines),
    fasting: null,
    documentName,
    observations,
    notice:
      observations.length === 0
        ? lines.length === 0
          ? 'no-text-layer'
          : 'no-results-found'
        : null,
  }

  return {
    proposal,
    stats: { linesRead: lines.length, linesAccepted: observations.length, strategy },
  }
}

/* --------------------------------------------------------------- table --- */

/**
 * Reads one table row. Each cell's meaning is already settled by its column, so
 * nothing here has to guess which number is the result — it only has to read
 * what the cell says.
 */
function fromRow(row: TableRow, documentName: string, index: number): ObservationProposal {
  const range = readRangeCell(row.range)
  const value = row.value.trim()

  return {
    key: `t${index}`,
    include: true,
    rawLabel: cleanLabel(row.label),
    panelRaw: row.panel,
    rawValue: value,
    unitRaw: row.unit.trim(),
    rangeLow: range.low,
    rangeHigh: range.high,
    rangeQualifier: range.qualifier,
    interpretation: readWordsCell(row.words),
    confidence: scoreRow({
      hasRange: range.low !== '' || range.high !== '',
      hasUnit: row.unit.trim() !== '',
      hasLabel: row.label.trim().length >= 2,
      valueTokens: value.split(/\s+/).filter(Boolean).length,
      readable: parseNumber(value) !== null || CODED_VALUE.test(value) || TITRE.test(value),
      usedCommaDecimal: value.includes(','),
    }),
    source: { documentName, page: row.page, rawLine: row.rawLine },
  }
}

type RangeCell = { low: string; high: string; qualifier: string }

/**
 * Reads a reference cell. Labs print more than bounds here: a qualifier
 * ("Vlere e deshiruar"), and often further bands stratifying the rest of the
 * scale ("100-129 Risk mesatar", "> 130 Risk i larte").
 *
 * The *first* band is taken as the range, because that is the one the lab
 * printed as the reference; everything after it is kept verbatim as the
 * qualifier so the reviewer sees exactly what the report said. Choosing among
 * the bands would be interpretation, which is not ours to do (vision §5).
 */
function readRangeCell(text: string): RangeCell {
  const cell = text.trim()
  if (!cell) return { low: '', high: '', qualifier: '' }

  const pair = firstMatch(cell, RANGE_PAIR)
  const bound = firstMatch(cell, RANGE_BOUND)
  const hit = pick(pair, bound)
  if (!hit) return { low: '', high: '', qualifier: cell }

  const rest = (cell.slice(0, hit.index) + ' ' + cell.slice(hit.index + hit[0].length))
    .replace(/\s+/g, ' ')
    .replace(/^[;,\-–—\s]+|[;,\s]+$/g, '')
    .trim()

  if (hit === pair) return { low: hit[1], high: hit[2], qualifier: rest }

  const upper = hit[1] === '<' || hit[1] === '<=' || hit[1] === '≤'
  return { low: upper ? '' : hit[2], high: upper ? hit[2] : '', qualifier: rest }
}

/** Translates the lab's printed verdict into its flag. Never derives one. */
function readWordsCell(text: string): LabInterpretation | null {
  const words = text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
  if (!words.trim()) return null

  const critical = WORD_CRITICAL.test(words)
  if (WORD_HIGH.test(words)) return critical ? 'HH' : 'H'
  if (WORD_LOW.test(words)) return critical ? 'LL' : 'L'
  if (WORD_NORMAL.test(words)) return 'N'

  const token = words.trim().toUpperCase()
  return FLAG_TOKEN.test(token) && token !== '*' && token !== '**'
    ? (token as LabInterpretation)
    : null
}

function scoreRow(input: {
  hasRange: boolean
  hasUnit: boolean
  hasLabel: boolean
  valueTokens: number
  readable: boolean
  usedCommaDecimal: boolean
}): number {
  let score = 0.95
  if (!input.hasRange) score -= 0.2
  if (!input.hasUnit) score -= 0.05
  if (!input.hasLabel) score -= 0.3
  if (!input.readable) score -= 0.25
  if (input.valueTokens > 1) score -= 0.25
  if (input.usedCommaDecimal) score -= 0.1
  return Math.max(0.2, Math.round(score * 100) / 100)
}

/* ---------------------------------------------------------------- line --- */

function fromLine(
  line: TextLine,
  documentName: string,
  index: number,
): ObservationProposal | null {
  const text = line.text
  if (text.length > 160 || text.length < 4) return null
  if (NOISE.test(text)) return null

  // Reports that stamp a time on every row would otherwise make every row look
  // like a date line. Take the dates out and read what is left.
  const body = text.replace(DATE_TIME, ' ').replace(/\s{3,}/g, '  ').trim()
  if (body.length < 4 || !/[a-zµμ]/i.test(body)) return null

  // 1. The reference range, if the report printed one. Taken from the right of
  //    the line, where labs put it, and removed before the value is looked for.
  const range = findRange(body)
  const withoutRange = range ? blank(body, range.index, range.length) : body

  // 2. The value: the first standalone number to the left of the range.
  const value = findValue(withoutRange, range?.index ?? body.length)
  if (!value) return null

  const beforeValue = withoutRange.slice(0, value.index)
  const afterValue = withoutRange.slice(value.index + value.length)

  const rawLabel = cleanLabel(beforeValue)
  if (!rawLabel || rawLabel.length < 2 || rawLabel.length > 64) return null
  if (/^\d/.test(rawLabel)) return null

  const trailing = afterValue.split(/\s+/).filter(Boolean)
  const unit = trailing.find((t) => isUnit(t)) ?? ''
  const interpretation = findFlag(trailing)

  // Numbers left over after value, unit and range usually mean a multi-column
  // report (a "previous result" column is the classic trap) — lower confidence.
  const leftoverNumbers = countNumbers(afterValue.replace(unit, ''))

  const confidence = scoreLine({
    hasRange: Boolean(range),
    hasUnit: Boolean(unit),
    usedCommaDecimal: value.text.includes(','),
    leftoverNumbers,
    isCoded: parseNumber(value.text) === null,
  })

  return {
    key: `p${index}`,
    include: true,
    rawLabel,
    // The line reader has no table structure, so it has no headings to read.
    panelRaw: '',
    rawValue: value.text,
    unitRaw: unit,
    rangeLow: range?.low ?? '',
    rangeHigh: range?.high ?? '',
    rangeQualifier: '',
    interpretation,
    confidence,
    source: { documentName, page: line.page, rawLine: text },
  }
}

type RangeHit = { low: string; high: string; index: number; length: number }

function findRange(text: string): RangeHit | null {
  let best: RangeHit | null = null
  for (const m of text.matchAll(RANGE_PAIR)) {
    // Take the last pair on the line: ranges sit to the right of the value.
    best = { low: m[1], high: m[2], index: m.index, length: m[0].length }
  }
  if (best) return best

  for (const m of text.matchAll(RANGE_BOUND)) {
    const bound = m[2]
    const upper = m[1] === '<' || m[1] === '<=' || m[1] === '≤'
    // An upper bound at the start of a line is a censored value, not a range.
    if (m.index < 4) continue
    best = {
      low: upper ? '' : bound,
      high: upper ? bound : '',
      index: m.index,
      length: m[0].length,
    }
  }
  return best
}

function findValue(text: string, limit: number): ValueHit | null {
  const numeric = new RegExp(String.raw`(<=|>=|<|>|≤|≥)?\s?(${NUM})`, 'g')
  for (const m of text.matchAll(numeric)) {
    if (m.index >= limit) break
    // A number glued to letters ("B12", "25-OH") is part of the label.
    const before = text[m.index - 1]
    const after = text[m.index + m[0].length]
    if (before && /[\w-]/.test(before)) continue
    if (after && /[\w]/.test(after) && !isUnitStart(text.slice(m.index + m[0].length))) continue
    return { text: m[0].trim(), index: m.index, length: m[0].length }
  }

  const coded = text.match(CODED_VALUE) ?? text.match(TITRE)
  if (coded && coded.index !== undefined && coded.index < limit) {
    return { text: coded[0].trim(), index: coded.index, length: coded[0].length }
  }
  return null
}

function isUnitStart(rest: string): boolean {
  const token = rest.trim().split(/\s+/)[0] ?? ''
  return isUnit(token)
}

function isUnit(token: string): boolean {
  const t = token.replace(/[(),;]/g, '')
  if (!t || t.length > 12) return false
  if (FLAG_TOKEN.test(t)) return false
  if (t === '%') return true
  return UNIT.test(t) && KNOWN_UNIT_HINT.test(t)
}

function findFlag(tokens: string[]): LabInterpretation | null {
  for (const token of tokens) {
    const t = token.replace(/[(),;]/g, '')
    if (FLAG_TOKEN.test(t)) {
      if (t === '*' || t === '**') return null // an asterisk is a footnote, not a flag
      return t as LabInterpretation
    }
    if (FLAG_WORD.test(t)) {
      return /high|ridicat|crescut|elevated/i.test(t) ? 'H' : 'L'
    }
  }
  return null
}

function scoreLine(input: {
  hasRange: boolean
  hasUnit: boolean
  usedCommaDecimal: boolean
  leftoverNumbers: number
  isCoded: boolean
}): number {
  let score = 0.95
  if (!input.hasRange) score -= 0.25
  if (!input.hasUnit && !input.isCoded) score -= 0.15
  if (input.usedCommaDecimal) score -= 0.1
  if (input.leftoverNumbers > 0) score -= 0.15 * Math.min(input.leftoverNumbers, 2)
  return Math.max(0.2, Math.round(score * 100) / 100)
}

/* -------------------------------------------------------------- shared --- */

function cleanLabel(text: string): string {
  return text
    .replace(/[.…]{2,}/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/[:\-–—,;]+$/, '')
    .trim()
}

function blank(text: string, index: number, length: number): string {
  return text.slice(0, index) + ' '.repeat(length) + text.slice(index + length)
}

function countNumbers(text: string): number {
  return (text.match(new RegExp(NUM, 'g')) ?? []).length
}

function firstMatch(text: string, pattern: RegExp): RegExpExecArray | null {
  const scan = new RegExp(pattern.source, pattern.flags)
  return scan.exec(text)
}

function pick(a: RegExpExecArray | null, b: RegExpExecArray | null): RegExpExecArray | null {
  if (!a) return b
  if (!b) return a
  return a.index <= b.index ? a : b
}

/* ---------------------------------------------------------------- dates --- */

const COLLECTION_KEYWORDS =
  /(collect|drawn|sampl|specimen|recolt|prelev|prélèv|entnahme|taken|accept|pranuar|receiv|primit|marre)/i
const REPORT_KEYWORDS =
  /(report|issued|validat|verifi|approv|aprovuar|emis|raport|printed|leshuar)/i
/** A date on one of these lines is the patient's, not the specimen's. */
const IDENTITY_DATE = /(birth|born|datelindja|dob|age|vjec|naissance|geburt)/i

const DATE_PATTERNS = [
  /\b(\d{4})([-./])(\d{1,2})\2(\d{1,2})\b/, // 2026-08-12
  /\b(\d{1,2})([-./])(\d{1,2})\2(\d{2,4})\b/, // 12.08.2026 (day first)
]

/**
 * Finds a date near a keyword. Day-first is assumed for ambiguous forms, which
 * is why the review screen always shows the collection date as an editable,
 * required field — a wrong date silently corrupts the time axis.
 *
 * Lines carrying the patient's date of birth are skipped outright. A report
 * whose header happens to print the birthday above the collection date would
 * otherwise date the whole series to the year 2000.
 */
function findDate(text: string, keywords: RegExp): string | null {
  const lines = text.split('\n').filter((line) => !IDENTITY_DATE.test(line))

  // A line often carries both dates ("Collected: … Reported: …"), so read from
  // the keyword rightwards rather than taking the first date on the line.
  for (const line of lines) {
    const at = line.search(keywords)
    if (at === -1) continue
    const iso = matchDate(line.slice(at))
    if (iso) return iso
  }

  for (const line of lines) {
    const iso = matchDate(line)
    if (iso) return iso
  }
  return null
}

function matchDate(line: string): string | null {
  const isoMatch = line.match(DATE_PATTERNS[0])
  if (isoMatch) return toIso(+isoMatch[1], +isoMatch[3], +isoMatch[4])

  const dmy = line.match(DATE_PATTERNS[1])
  if (dmy) {
    const first = +dmy[1]
    const second = +dmy[3]
    // Day-first, unless the first number cannot be a month and the second can.
    const dayFirst = !(first <= 12 && second > 12)
    return toIso(
      fullYear(+dmy[4]),
      dayFirst ? second : first,
      dayFirst ? first : second,
    )
  }

  return null
}

/** Two-digit years appear on the per-row timestamps of some reports. */
function fullYear(year: number): number {
  if (year >= 100) return year
  return year <= 79 ? 2000 + year : 1900 + year
}

function toIso(year: number, month: number, day: number): string | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null
  if (year < 1900 || year > 2200) return null
  const iso = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  return Number.isNaN(Date.parse(iso)) ? null : iso
}

/* ------------------------------------------------------------------ lab --- */

const LAB_HINT = /(lab|labor|clinic|diagnos|medic|hospital|spital|centre|center|health)/i

/**
 * The performing lab, when the text layer names it. Often it does not — the
 * name lives in the letterhead image — and an empty field the reviewer fills in
 * is better than a confident wrong one, so labelled fields ("ID Card :"),
 * certificate numbers and dates are all rejected rather than accepted as names.
 */
function findLab(lines: TextLine[]): string {
  const candidates = lines
    .slice(0, 8)
    .map((l) => l.text.replace(/\s{2,}/g, ' ').trim())
    .filter((t) => t.length >= 4 && t.length <= 60)
    .filter((t) => !t.endsWith(':'))
    .filter((t) => (t.match(/:/g) ?? []).length < 2)
    .filter((t) => (t.match(/\d/g) ?? []).length < 3)
    .filter((t) => !DATE_TIME_TEST.test(t))

  return candidates.find((t) => LAB_HINT.test(t)) ?? ''
}
