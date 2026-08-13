/**
 * Dev harness: runs the real ingestion pipeline over PDFs on disk and prints
 * what it proposed. Not part of the app bundle.
 *
 *   npx rolldown tools/parse-check.mts --format esm --platform node \
 *     --external 'pdfjs-dist/legacy/build/pdf.mjs' -d .parse-check-out
 *   node .parse-check-out/parse-check.js <file.pdf> ...
 */
import fs from 'node:fs'
import { parseReport } from '../src/ingest/parseReport'
import { buildLines, type TextLine } from '../src/ingest/pdfText'

const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')

async function read(file: string): Promise<TextLine[]> {
  const data = new Uint8Array(fs.readFileSync(file))
  const doc = await pdfjs.getDocument({ data, useSystemFonts: true }).promise
  const lines: TextLine[] = []
  for (let p = 1; p <= doc.numPages; p++) {
    const content = await (await doc.getPage(p)).getTextContent()
    lines.push(...buildLines(p, content.items))
  }
  return lines
}

for (const file of process.argv.slice(2)) {
  const lines = await read(file)
  const { proposal, stats } = parseReport(lines, file.split('/').pop()!)

  console.log(`\n##### ${file}`)
  console.log(
    `collected=${proposal.collectedAt || '(none)'}  reported=${proposal.reportedAt || '(none)'}  lab=${proposal.performingLab || '(none)'}`,
  )
  console.log(
    `strategy=${stats.strategy}  lines=${stats.linesRead}  accepted=${stats.linesAccepted}  notice=${proposal.notice ?? '-'}`,
  )
  for (const o of proposal.observations) {
    console.log(
      [
        '  ' + (o.panelRaw || '—').padEnd(22),
        o.rawLabel.padEnd(30),
        o.rawValue.padEnd(7),
        o.unitRaw.padEnd(9),
        `${o.rangeLow}..${o.rangeHigh}`.padEnd(12),
        (o.interpretation ?? '-').padEnd(2),
        String(o.confidence).padEnd(4),
        o.rangeQualifier,
      ].join(' | '),
    )
  }
}
