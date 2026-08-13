import { formatDate } from '../domain/series'
import type { Report } from '../domain/types'
import { formatRange } from '../domain/value'
import { ProvenanceChip, StatusChip } from '../ui/Chips'
import { IconChevron, IconDocuments, IconTrash } from '../ui/icons'

/** The filing cabinet (vision §8, L0). */
export function ReportsScreen({
  reports,
  onOpenReport,
  onAdd,
}: {
  reports: Report[]
  onOpenReport: (id: string) => void
  onAdd: () => void
}) {
  if (reports.length === 0) {
    return (
      <div className="empty enter">
        <IconDocuments size={32} />
        <h2 className="display display--lg">No reports yet</h2>
        <p className="muted" style={{ maxWidth: '32ch' }}>
          Every value LabScope shows comes from a report you added, and links back to it.
        </p>
        <button type="button" className="btn btn--primary" onClick={onAdd}>
          Add a report
        </button>
      </div>
    )
  }

  return (
    <div className="stack enter">
      <section className="card card--flush">
        {reports.map((report) => (
          <button
            type="button"
            key={report.id}
            className="result result--plain"
            onClick={() => onOpenReport(report.id)}
          >
            <div className="result__main">
              <p className="result__label">{formatDate(report.collectedAt)}</p>
              <p className="result__meta">
                {report.performingLab ?? 'Lab not recorded'} · {report.observations.length}{' '}
                value{report.observations.length === 1 ? '' : 's'}
                {report.documentName ? ` · ${report.documentName}` : ' · typed in by hand'}
              </p>
            </div>
            <span className="result__chev">
              <IconChevron />
            </span>
          </button>
        ))}
      </section>
      <p className="footnote">Sorted by collection date — when the sample was taken.</p>
    </div>
  )
}

/** One visit, as issued (vision §8, L4) — the trust anchor. */
export function ReportScreen({
  report,
  onDelete,
}: {
  report: Report
  onDelete: () => void
}) {
  return (
    <div className="stack enter">
      <section className="card stack stack--tight">
        <h2 className="display display--lg">{formatDate(report.collectedAt)}</h2>
        <div className="row row--wrap" style={{ gap: 'var(--space-2)' }}>
          <ProvenanceChip lab={report.performingLab} />
          {report.fasting !== null && (
            <span className="chip">{report.fasting ? 'Fasting' : 'Not fasting'}</span>
          )}
          {report.reportedAt && (
            <span className="chip">Reported {formatDate(report.reportedAt)}</span>
          )}
        </div>
        <p className="footnote">
          {report.documentName
            ? `Read from ${report.documentName}`
            : 'Entered by hand — no source document'}
          {' · '}
          confirmed {new Date(report.committedAt).toLocaleDateString('en-GB')}
        </p>
      </section>

      <section className="card card--flush">
        {report.observations.map((o) => (
          <div key={o.id} className="review-item">
            <div className="row row--between">
              <span className="result__label">{o.rawLabel}</span>
              <span style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>
                {o.rawValue}
                {o.unitRaw && <span className="result__unit">{o.unitRaw}</span>}
              </span>
            </div>
            <div className="row row--wrap" style={{ gap: 'var(--space-2)' }}>
              <StatusChip observation={o} />
              <span className="muted">
                {formatRange(o.referenceRange) ?? 'No range printed on this report'}
              </span>
            </div>
          </div>
        ))}
      </section>

      <button type="button" className="btn btn--danger btn--block" onClick={onDelete}>
        <IconTrash />
        Delete this report and its values
      </button>
      <p className="footnote">
        Deleting removes the report and everything read from it from this browser.
      </p>
    </div>
  )
}
