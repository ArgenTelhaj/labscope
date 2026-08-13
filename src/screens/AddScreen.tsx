import { useRef, useState } from 'react'
import type { ReportProposal } from '../domain/types'
import { extractTextLines } from '../ingest/pdfText'
import { parseReport } from '../ingest/parseReport'
import { emptyProposal } from '../ingest/proposal'
import { IconInfo, IconPen, IconUpload } from '../ui/icons'

/**
 * Intake (vision §7). Upload produces a *proposal*; the review screen is the
 * only path to a record. Nothing is committed here.
 */
export function AddScreen({ onProposal }: { onProposal: (proposal: ReportProposal) => void }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    setError(null)
    setBusy(true)
    try {
      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        const lines = await extractTextLines(file)
        onProposal(parseReport(lines, file.name).proposal)
      } else {
        // Images need OCR, which needs a backend. Rather than guess, the file
        // is kept as the source and the values are typed in.
        onProposal({
          ...emptyProposal(),
          documentName: file.name,
          notice:
            'Photos and images need OCR, which this build does not do on-device. The file is recorded as the source — enter the values from it by hand.',
        })
      }
    } catch {
      setError('That file could not be opened. It may be password-protected or damaged.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="stack">
      <label
        className="drop"
        data-dragging={dragging}
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          const file = e.dataTransfer.files[0]
          if (file) void handleFile(file)
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,image/*"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) void handleFile(file)
            e.target.value = ''
          }}
        />
        {busy ? (
          <>
            <span className="spinner" />
            <span className="drop__title">Reading the report</span>
            <span className="muted">This happens on your device.</span>
          </>
        ) : (
          <>
            <span className="drop__icon">
              <IconUpload size={28} />
            </span>
            <span className="drop__title">Upload a lab report</span>
            <span className="muted">PDF. Drop it here or tap to choose.</span>
          </>
        )}
      </label>

      {error && (
        <div className="banner banner--attention">
          <span className="banner__icon">
            <IconInfo />
          </span>
          <span>{error}</span>
        </div>
      )}

      <button
        type="button"
        className="btn btn--block"
        onClick={() => onProposal(emptyProposal())}
        disabled={busy}
      >
        <IconPen />
        Enter results by hand
      </button>

      <div className="banner">
        <span className="banner__icon">
          <IconInfo />
        </span>
        <span>
          Whatever is read from your report is a <strong>proposal</strong>. You confirm every
          value against the original before it is saved — and the reference ranges come from
          your report, never from a general table.
        </span>
      </div>

      <p className="footnote">
        Your reports stay in this browser. Nothing is uploaded, and LabScope does not
        interpret results — it shows what your lab reported.
      </p>
    </div>
  )
}
