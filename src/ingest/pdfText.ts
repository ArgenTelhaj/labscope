/**
 * pdf.js is ~1.5 MB with its worker. It is loaded on demand, the first time
 * someone actually uploads a PDF, so the app shell stays small.
 */
let pdfjsPromise: Promise<typeof import('pdfjs-dist')> | null = null

async function loadPdfjs() {
  if (!pdfjsPromise) {
    pdfjsPromise = (async () => {
      const [pdfjs, worker] = await Promise.all([
        import('pdfjs-dist'),
        import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
      ])
      pdfjs.GlobalWorkerOptions.workerSrc = worker.default
      return pdfjs
    })()
  }
  return pdfjsPromise
}

/**
 * A run of text separated from its neighbours by a horizontal gap wide enough to
 * read as a column break. Cells carry their horizontal extent so the parser can
 * recover the report's table layout instead of guessing at a flattened string.
 */
export type TextCell = {
  /** Left edge, in PDF points from the left of the page. */
  x: number
  /** Right edge. */
  xEnd: number
  text: string
}

export type TextLine = {
  page: number
  /** Text of the line, with column breaks preserved as double spaces. */
  text: string
  /** Baseline of the line's dominant run, used for ordering and row spacing. */
  y: number
  /** Height of the line's dominant run, in points. Proxy for font size. */
  height: number
  cells: TextCell[]
}

type Run = { x: number; xEnd: number; y: number; height: number; str: string }

/** A horizontal gap wider than this many points reads as a column break. */
const COLUMN_GAP = 6
/** Runs closer than this fraction of the font height are one word, not two. */
const KERNING_RATIO = 0.18
/** Rows are clustered within this fraction of the font height of each other. */
const ROW_TOLERANCE_RATIO = 0.5
/** …and a single row may never span more than this many font heights. */
const ROW_SPAN_RATIO = 1.2
/** A run this much shorter than its neighbour is a different font size. */
const SUPERSCRIPT_SIZE_RATIO = 0.9
/** …and raised by at least this fraction of the height to be an exponent. */
const SUPERSCRIPT_RISE_RATIO = 0.15

/**
 * Reads the text layer of a PDF, reconstructing rows and their cells from
 * positioned glyph runs.
 *
 * Two things here exist because real lab reports need them:
 *
 *  - **Superscripts are folded back in.** `10³/uL` reaches us as three runs at
 *    two different baselines and two different sizes. Left alone, the exponent
 *    lands on the value row as a stray `3` and the `10 /uL` wraps to a row of
 *    its own — so the unit is lost and the value picks up a phantom number.
 *  - **Rows are clustered by the gap between baselines**, not against the first
 *    run seen. Anchoring on the first run splits a row the moment a superscript
 *    or a smaller-set reference range shifts a baseline by more than the
 *    tolerance, which is exactly what a `10³/uL` column does.
 *
 * Scanned PDFs and photos have no text layer — this returns nothing for them,
 * which is the honest answer here: OCR needs a backend (vision §12), and the
 * app falls back to manual entry rather than guessing.
 */
export async function extractTextLines(file: File): Promise<TextLine[]> {
  const pdfjs = await loadPdfjs()
  const data = new Uint8Array(await file.arrayBuffer())
  const task = pdfjs.getDocument({ data })
  const doc = await task.promise
  const lines: TextLine[] = []

  try {
    for (let pageNo = 1; pageNo <= doc.numPages; pageNo++) {
      const page = await doc.getPage(pageNo)
      const content = await page.getTextContent()

      lines.push(...buildLines(pageNo, content.items))
    }
  } finally {
    await task.destroy()
  }

  return lines
}

/** The shape of a pdf.js text item, narrowed to what layout needs. */
export type GlyphRun = {
  str: string
  width?: number
  height?: number
  transform: number[]
}

/**
 * Turns one page's positioned glyph runs into lines and cells. Split out from
 * the pdf.js plumbing above so the layout rules can be exercised directly.
 */
export function buildLines(page: number, items: readonly unknown[]): TextLine[] {
  const runs: Run[] = []
  for (const item of items as GlyphRun[]) {
    if (typeof item?.str !== 'string' || item.str.trim() === '') continue
    const width = item.width ?? 0
    runs.push({
      x: item.transform[4],
      xEnd: item.transform[4] + width,
      y: item.transform[5],
      height: item.height || Math.abs(item.transform[3]) || 10,
      str: item.str.trim(),
    })
  }
  if (runs.length === 0) return []

  const lines: TextLine[] = []
  for (const row of clusterRows(runs)) {
    const line = assembleLine(page, row)
    if (line) lines.push(line)
  }
  return lines
}

/**
 * Groups runs into rows. A run joins the current row when it is close to the
 * previous run's baseline *and* the row has not already grown taller than a
 * line of text — the second condition stops a page of tightly-set rows from
 * chaining into one.
 */
function clusterRows(runs: Run[]): Run[][] {
  const unit = medianHeight(runs)
  const tolerance = unit * ROW_TOLERANCE_RATIO
  const maxSpan = unit * ROW_SPAN_RATIO

  const sorted = [...runs].sort((a, b) => b.y - a.y || a.x - b.x)
  const rows: Run[][] = []
  let current: Run[] = []
  let anchor = Infinity
  let previous = Infinity

  for (const run of sorted) {
    const joins =
      current.length > 0 && previous - run.y <= tolerance && anchor - run.y <= maxSpan
    if (!joins) {
      if (current.length > 0) rows.push(current)
      current = []
      anchor = run.y
    }
    current.push(run)
    previous = run.y
  }
  if (current.length > 0) rows.push(current)

  return rows
}

/** Builds one line's text and cells from the runs sharing its baseline. */
function assembleLine(page: number, row: Run[]): TextLine | null {
  const ordered = mergeSuperscripts([...row].sort((a, b) => a.x - b.x))
  const unit = medianHeight(ordered)

  const cells: TextCell[] = []
  let cell: TextCell | null = null
  let cursor = -Infinity

  for (const run of ordered) {
    const gap = run.x - cursor
    if (!cell || gap > COLUMN_GAP) {
      cell = { x: run.x, xEnd: run.xEnd, text: run.str }
      cells.push(cell)
    } else {
      cell.text += gap < unit * KERNING_RATIO ? run.str : ` ${run.str}`
      cell.xEnd = run.xEnd
    }
    cursor = run.xEnd
  }

  const nonEmpty = cells.filter((c) => c.text.trim() !== '')
  if (nonEmpty.length === 0) return null
  for (const c of nonEmpty) c.text = c.text.trim()

  return {
    page,
    text: nonEmpty.map((c) => c.text).join('  '),
    y: dominant(ordered).y,
    height: dominant(ordered).height,
    cells: nonEmpty,
  }
}

/**
 * Folds a raised, smaller run into the run before it as `^n`, so `10³/uL`
 * survives as `10^3/uL`. Only applies after a run ending in a digit: that is
 * what an exponent attaches to, and it keeps footnote markers — which follow
 * words — out of the values.
 */
function mergeSuperscripts(ordered: Run[]): Run[] {
  const out: Run[] = []

  for (const run of ordered) {
    const previous = out[out.length - 1]
    const isExponent =
      previous !== undefined &&
      /^\d+$/.test(run.str) &&
      /\d$/.test(previous.str) &&
      run.height < previous.height * SUPERSCRIPT_SIZE_RATIO &&
      run.y - previous.y >= previous.height * SUPERSCRIPT_RISE_RATIO &&
      run.x - previous.xEnd < previous.height * KERNING_RATIO

    if (isExponent) {
      previous.str += `^${run.str}`
      previous.xEnd = run.xEnd
      continue
    }
    out.push({ ...run })
  }

  return out
}

/** The run carrying the row's body text — the tallest, ties broken leftmost. */
function dominant(runs: Run[]): Run {
  return runs.reduce((best, run) => (run.height > best.height ? run : best), runs[0])
}

function medianHeight(runs: Run[]): number {
  const heights = runs.map((r) => r.height).sort((a, b) => a - b)
  return heights[Math.floor(heights.length / 2)] || 10
}
