import { useRef, useState } from 'react'
import type { ReportProposal } from '../domain/types'
import { extractTextLines } from '../ingest/pdfText'
import { parseReport } from '../ingest/parseReport'
import { emptyProposal } from '../ingest/proposal'
import { useI18n } from '../i18n'
import { Marked } from '../ui/Marked'
import { IconInfo, IconPen, IconUpload } from '../ui/icons'

/**
 * Intake (vision §7). Upload produces a *proposal*; the review screen is the
 * only path to a record. Nothing is committed here.
 */
export function AddScreen({ onProposal }: { onProposal: (proposal: ReportProposal) => void }) {
  const { t } = useI18n()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(false)
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    setError(false)
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
          notice: 'needs-ocr',
        })
      }
    } catch {
      setError(true)
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
            <span className="drop__title">{t('add.reading.title')}</span>
            <span className="muted">{t('add.reading.note')}</span>
          </>
        ) : (
          <>
            <span className="drop__icon">
              <IconUpload size={28} />
            </span>
            <span className="drop__title">{t('add.drop.title')}</span>
            <span className="muted">{t('add.drop.hint')}</span>
          </>
        )}
      </label>

      {error && (
        <div className="banner banner--attention">
          <span className="banner__icon">
            <IconInfo />
          </span>
          <span>{t('add.error.unreadable')}</span>
        </div>
      )}

      <button
        type="button"
        className="btn btn--block"
        onClick={() => onProposal(emptyProposal())}
        disabled={busy}
      >
        <IconPen />
        {t('add.manual')}
      </button>

      <div className="banner">
        <span className="banner__icon">
          <IconInfo />
        </span>
        <span>
          <Marked text={t('add.banner')} element="strong" />
        </span>
      </div>

      <p className="footnote">{t('add.footnote')}</p>
    </div>
  )
}
