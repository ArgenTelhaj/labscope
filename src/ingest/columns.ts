import type { TextCell, TextLine } from './pdfText'

/**
 * Table recovery.
 *
 * Most lab reports are printed as a table with a header row: test, result,
 * unit, reference, and often the lab's own wording for the result. When that
 * header is present, reading each cell by its column is far more reliable than
 * pattern-matching a flattened line — it tells us which number is the result
 * and which is a bound, where the unit is even when it is unusual, and where
 * the lab put its own verdict. It also makes the two things that break a naive
 * line reader tractable:
 *
 *  - **Wrapped cells.** A row whose label column is empty is not a row; it is
 *    the tail of the row above it, wrapped. Reference bands ("100-129 Risk
 *    mesatar") and method names ("Serum / End point") wrap constantly.
 *  - **Per-row timestamps.** Reports that print an application time on every
 *    row make every row look like a date line. As a column it is simply the
 *    time column, and it stops interfering with the result.
 *
 * This still only reads what was printed. It proposes; a human commits (§7).
 * When no header can be found, `readTable` returns null and the caller falls
 * back to reading line by line.
 */

export type ColumnRole =
  | 'label'
  | 'value'
  | 'unit'
  | 'range'
  | 'words'
  | 'method'
  | 'time'
  | 'other'

export type TableRow = {
  page: number
  /** Cell text per role. Absent columns are empty strings. */
  label: string
  value: string
  unit: string
  range: string
  words: string
  /** The section heading in force above this row, '' when the report printed none. */
  panel: string
  /** Every source line this row was assembled from, wrapped tails included. */
  rawLine: string
}

/**
 * Header vocabulary, English and Albanian. Ordered most specific first, since
 * "Result words" must not be read as "Result". Extending this list is how a new
 * lab's layout gets supported — it is a layout vocabulary, not a clinical one,
 * so it carries none of the meaning the domain constraints protect.
 */
const HEADERS: Array<[ColumnRole, RegExp]> = [
  ['words', /^(result words|vleresimi|vleresim|interpretation|interpretim|flag)$/],
  ['range', /^(reference( range| values| interval)?|ref(erence)? val(ues)?|vlerat normale|vlerat referuese|vlera referuese|normal values|normal range|interval referues)$/],
  ['label', /^(test name|emri i testit|analiza|analyte|test|examination|ekzaminimi|parametri|emertimi)$/],
  ['value', /^(result|results|rezultati|rezultat|value|vlera)$/],
  ['unit', /^(unit|units|njesia|njesi|njesite)$/],
  ['method', /^(samp meth|mat met|method|metoda|materiali|sample|mostra|kampioni)$/],
  ['time', /^(app time|ora e aplk|ora e aplikimit|time|ora|date|data|koha)$/],
]

/** A wrapped tail may sit at most this many row pitches below its row. */
const WRAP_REACH = 2.2
/** Plausible length for a section heading. Longer is a sentence, not a heading. */
const PANEL_MAX = 48
/** Below this, a gap after the table is the footer, not a wrapped cell. */
const MIN_ROW_PITCH = 8

type Column = { x: number; xEnd: number; role: ColumnRole }
type Layout = { page: number; headerY: number; columns: Column[]; boundaries: number[] }

export function readTable(lines: TextLine[]): TableRow[] | null {
  const layouts = findLayouts(lines)
  if (layouts.length === 0) return null

  const pitch = rowPitch(lines)
  const rows: TableRow[] = []
  let open: { row: TableRow; y: number } | null = null
  let panel = ''

  for (const line of lines) {
    const layout = layoutFor(layouts, line)
    if (!layout || line.y >= layout.headerY || isHeaderLine(line)) continue

    const cells = distribute(line, layout)

    // A row with no label is the wrapped tail of the row above it — but only
    // while it is still close enough to be part of that row. Past that, we have
    // left the table and are reading the signature block or the footer.
    if (cells.label === '') {
      if (open && open.y - line.y <= pitch * WRAP_REACH && hasContent(cells)) {
        absorb(open.row, cells, line)
        open.y = line.y
      } else {
        open = null
      }
      continue
    }

    // A label with no result is a section heading ("Red cells and RBC line").
    // It is not a result, and nothing may wrap into it — but it is the lab's
    // own grouping of what follows, so it is kept and stamped onto the rows
    // beneath it until the next heading replaces it.
    if (cells.value === '') {
      open = null
      const heading = cells.label.replace(/\s+/g, ' ').replace(/[:\-–—]+$/, '').trim()
      if (heading.length >= 3 && heading.length <= PANEL_MAX) panel = heading
      continue
    }

    const row: TableRow = { ...cells, panel, page: line.page, rawLine: line.text }
    rows.push(row)
    open = { row, y: line.y }
  }

  return rows.length > 0 ? rows : null
}

/* -------------------------------------------------------------- layout --- */

function findLayouts(lines: TextLine[]): Layout[] {
  const layouts: Layout[] = []

  for (let i = 0; i < lines.length; i++) {
    const columns = headerColumns(lines[i])
    if (!columns) continue

    // Bilingual reports stack two header rows over the same columns. Merging
    // their extents gives a truer column width than either row alone, and the
    // lower row's baseline becomes the floor the data has to sit under.
    let header = lines[i]
    const next = lines[i + 1]
    if (next && next.page === header.page) {
      const second = headerColumns(next)
      if (second && second.length === columns.length) {
        for (let c = 0; c < columns.length; c++) {
          columns[c].x = Math.min(columns[c].x, second[c].x)
          columns[c].xEnd = Math.max(columns[c].xEnd, second[c].xEnd)
          if (columns[c].role === 'other') columns[c].role = second[c].role
        }
        header = next
        i++
      }
    }

    layouts.push({
      page: header.page,
      headerY: header.y,
      columns,
      boundaries: boundariesOf(columns),
    })
  }

  return layouts
}

/**
 * Reads a line as a header row. Requires a label column left of a result
 * column plus one more recognised heading — enough to be sure this is the
 * table's header and not a sentence that happens to contain "Result".
 */
function headerColumns(line: TextLine): Column[] | null {
  const columns: Column[] = line.cells.map((cell) => ({
    x: cell.x,
    xEnd: cell.xEnd,
    role: roleOf(cell),
  }))

  const known = columns.filter((c) => c.role !== 'other')
  const label = columns.findIndex((c) => c.role === 'label')
  const value = columns.findIndex((c) => c.role === 'value')

  if (label === -1 || value === -1 || label >= value || known.length < 3) return null
  return columns
}

function isHeaderLine(line: TextLine): boolean {
  return headerColumns(line) !== null
}

function roleOf(cell: TextCell): ColumnRole {
  const text = normalise(cell.text)
  for (const [role, pattern] of HEADERS) {
    if (pattern.test(text)) return role
  }
  return 'other'
}

function normalise(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

/** Splits at the midpoint of the gap between one header cell and the next. */
function boundariesOf(columns: Column[]): number[] {
  const out: number[] = []
  for (let i = 0; i < columns.length - 1; i++) {
    const left = columns[i]
    const right = columns[i + 1]
    out.push(
      left.xEnd < right.x ? (left.xEnd + right.x) / 2 : (left.x + right.x) / 2,
    )
  }
  return out
}

/** The layout governing a line: the nearest header above it, on any page. */
function layoutFor(layouts: Layout[], line: TextLine): Layout | null {
  let best: Layout | null = null
  for (const layout of layouts) {
    if (layout.page > line.page) continue
    if (layout.page === line.page && layout.headerY < line.y) continue
    best = layout
  }
  return best
}

/* ---------------------------------------------------------------- rows --- */

type Cells = { label: string; value: string; unit: string; range: string; words: string }

/**
 * Assigns each cell to the column it overlaps most.
 *
 * Neither edge of a cell is reliable on its own. Cells are set centred in their
 * column, so a long one spills past both boundaries: "0 - 100 Vlere e
 * deshiruar" starts a point and a half left of the reference column and ends
 * well inside the next one, while sitting almost entirely in reference. Taking
 * the column it shares the most width with gets that right, and degrades
 * gracefully when a report's columns are only approximately aligned.
 */
function distribute(line: TextLine, layout: Layout): Cells {
  const cells: Cells = { label: '', value: '', unit: '', range: '', words: '' }

  for (const cell of line.cells) {
    const role = columnFor(cell, layout)
    if (role === undefined || role === 'other' || role === 'method' || role === 'time') continue
    cells[role] = cells[role] ? `${cells[role]} ${cell.text}` : cell.text
  }

  return cells
}

function columnFor(cell: TextCell, layout: Layout): ColumnRole | undefined {
  let best: ColumnRole | undefined
  let bestOverlap = -Infinity

  for (let i = 0; i < layout.columns.length; i++) {
    // The outermost columns own everything beyond the first and last boundary;
    // clamping them to the cell keeps the comparison finite.
    const from = i === 0 ? cell.x : layout.boundaries[i - 1]
    const to = i === layout.columns.length - 1 ? cell.xEnd : layout.boundaries[i]
    const overlap = Math.min(cell.xEnd, to) - Math.max(cell.x, from)

    if (overlap > bestOverlap) {
      bestOverlap = overlap
      best = layout.columns[i].role
    }
  }

  return best
}

function hasContent(cells: Cells): boolean {
  return cells.value !== '' || cells.unit !== '' || cells.range !== '' || cells.words !== ''
}

/**
 * Folds a wrapped tail into its row. Reference and verdict cells wrap as
 * *additional bands* rather than as continued words ("0 - 100 Vlere e
 * deshiruar" / "100-129 Risk mesatar"), so they are kept as separate segments;
 * everything else is continued text.
 */
function absorb(row: TableRow, tail: Cells, line: TextLine): void {
  row.label = join(row.label, tail.label, ' ')
  row.value = join(row.value, tail.value, ' ')
  row.unit = join(row.unit, tail.unit, '')
  row.range = join(row.range, tail.range, '; ')
  row.words = join(row.words, tail.words, '; ')
  row.rawLine = `${row.rawLine}  ${line.text}`
}

function join(head: string, tail: string, separator: string): string {
  if (!tail) return head
  if (!head) return tail
  return `${head}${separator}${tail}`
}

/** Median vertical gap between consecutive lines — the report's row pitch. */
function rowPitch(lines: TextLine[]): number {
  const gaps: number[] = []
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].page !== lines[i - 1].page) continue
    const gap = lines[i - 1].y - lines[i].y
    if (gap > 0) gaps.push(gap)
  }
  if (gaps.length === 0) return MIN_ROW_PITCH
  gaps.sort((a, b) => a - b)
  return Math.max(gaps[Math.floor(gaps.length / 2)], MIN_ROW_PITCH)
}
