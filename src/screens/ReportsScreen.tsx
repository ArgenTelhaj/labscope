import type { Report } from '../domain/types'
import { formatRange } from '../domain/value'
import { useI18n } from '../i18n'
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
  const { t, d } = useI18n()

  if (reports.length === 0) {
    return (
      <div className="empty enter">
        <IconDocuments size={32} />
        <h2 className="display display--lg">{t('reports.empty.title')}</h2>
        <p className="muted" style={{ maxWidth: '32ch' }}>
          {t('reports.empty.body')}
        </p>
        <button type="button" className="btn btn--primary" onClick={onAdd}>
          {t('action.add-report')}
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
              <p className="result__label">{d(report.collectedAt)}</p>
              <p className="result__meta">
                {report.performingLab ?? t('chip.lab-missing')}
                {' · '}
                {t('reports.meta.values', { count: report.observations.length })}
                {report.documentName
                  ? ` · ${report.documentName}`
                  : ` · ${t('common.typed-by-hand')}`}
              </p>
            </div>
            <span className="result__chev">
              <IconChevron />
            </span>
          </button>
        ))}
      </section>
      <p className="footnote">{t('reports.footnote')}</p>
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
  const { t, d, dStamp } = useI18n()

  return (
    <div className="stack enter">
      <section className="card stack stack--tight">
        <h2 className="display display--lg">{d(report.collectedAt)}</h2>
        <div className="row row--wrap" style={{ gap: 'var(--space-2)' }}>
          <ProvenanceChip lab={report.performingLab} />
          {report.fasting !== null && (
            <span className="chip">
              {report.fasting ? t('report.fasting') : t('report.not-fasting')}
            </span>
          )}
          {report.reportedAt && (
            <span className="chip">{t('report.reported-on', { date: d(report.reportedAt) })}</span>
          )}
        </div>
        <p className="footnote">
          {report.documentName
            ? t('report.read-from', { name: report.documentName })
            : t('report.entered-by-hand')}
          {' · '}
          {t('report.confirmed-on', { date: dStamp(report.committedAt) })}
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
                {formatRange(o.referenceRange) ?? t('report.no-range')}
              </span>
            </div>
          </div>
        ))}
      </section>

      <button type="button" className="btn btn--danger btn--block" onClick={onDelete}>
        <IconTrash />
        {t('report.delete')}
      </button>
      <p className="footnote">{t('report.delete.footnote')}</p>
    </div>
  )
}
