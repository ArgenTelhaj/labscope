import type { Series } from '../domain/series'
import { formatRange, isPlottable } from '../domain/value'
import { useI18n } from '../i18n'
import { ProvenanceChip, StatusChip } from '../ui/Chips'
import { RangeBand } from '../ui/RangeBand'
import { TrendChart } from '../ui/TrendChart'
import { IconInfo } from '../ui/icons'

/**
 * One analyte, its full history (vision §8, L3).
 *
 * The line is earned, not assumed: with fewer than three results there is no
 * chart, because two points are not a trend. Everything a reader needs to judge
 * comparability — lab, unit, range, where it was read from — is on the page.
 */
export function AnalyteScreen({ series }: { series: Series }) {
  const { t, d } = useI18n()
  const latest = series.latest.observation
  const points = [...series.points].reverse()
  const plottable = series.points.filter((p) => isPlottable(p.observation))
  const range = formatRange(latest.referenceRange)

  const previous = series.points.length > 1 ? series.points[series.points.length - 2] : null
  const delta =
    previous && latest.valueNum !== null && previous.observation.valueNum !== null
      ? latest.valueNum - previous.observation.valueNum
      : null

  return (
    <div className="stack enter">
      <section className="card stack stack--tight">
        {series.panelLabel && <p className="kicker">{series.panelLabel}</p>}
        <p className="hero">
          {latest.rawValue}
          {latest.unitRaw && <span className="hero__unit">{latest.unitRaw}</span>}
        </p>
        <p className="note">
          {d(series.latest.report.collectedAt)} ·{' '}
          {series.latest.report.performingLab ?? t('chip.lab-missing')}
        </p>

        <div className="bandwrap">
          <RangeBand observation={latest} />
        </div>

        <div className="row row--wrap" style={{ gap: 'var(--space-2)' }}>
          <StatusChip observation={latest} />
          <span className="muted">
            {range ? t('common.lab-range', { range }) : t('status.long.unknown')}
          </span>
        </div>

        {latest.referenceRange.qualifier && (
          <p className="footnote">
            {t('analyte.qualifier', { qualifier: latest.referenceRange.qualifier })}
          </p>
        )}

        {latest.comparator !== 'eq' && (
          <p className="footnote">{t('analyte.censored', { value: latest.rawValue })}</p>
        )}
      </section>

      {plottable.length >= 3 ? (
        <section className="card stack stack--tight">
          <h2 className="section-title">{t('analyte.over-time')}</h2>
          <TrendChart series={series} />
          {plottable.length < series.points.length && (
            <p className="footnote">
              {t('analyte.not-plotted', { count: series.points.length - plottable.length })}
            </p>
          )}
        </section>
      ) : (
        <section className="card stack stack--tight">
          <h2 className="section-title">{t('analyte.over-time')}</h2>
          {delta !== null ? (
            <>
              <p className="note">
                {delta === 0
                  ? t('analyte.unchanged')
                  : t(delta > 0 ? 'analyte.delta.up' : 'analyte.delta.down', {
                      delta: `${formatDelta(delta)}${latest.unitRaw ? ` ${latest.unitRaw}` : ''}`,
                      date: d(previous!.report.collectedAt),
                    })}
              </p>
              <p className="footnote">{t('analyte.two-points')}</p>
            </>
          ) : (
            <p className="note">{t('analyte.one-point')}</p>
          )}
        </section>
      )}

      {series.labs.length > 1 && (
        <div className="banner banner--attention">
          <span className="banner__icon">
            <IconInfo />
          </span>
          <span>
            {t('analyte.labs-differ', {
              count: series.labs.length,
              labs: series.labs.join(', '),
            })}
          </span>
        </div>
      )}

      {series.units.length > 1 && (
        <div className="banner banner--attention">
          <span className="banner__icon">
            <IconInfo />
          </span>
          <span>{t('analyte.units-differ', { units: series.units.join(', ') })}</span>
        </div>
      )}

      <h2 className="section-title">{t('analyte.every-result')}</h2>
      <section className="card card--flush">
        {points.map(({ observation, report }) => (
          <div key={observation.id} className="review-item">
            <div className="row row--between">
              <span style={{ fontWeight: 600 }}>
                {observation.rawValue}
                {observation.unitRaw && (
                  <span className="result__unit">{observation.unitRaw}</span>
                )}
              </span>
              <StatusChip observation={observation} />
            </div>
            <p className="muted">{d(report.collectedAt)}</p>
            <div className="row row--wrap" style={{ gap: 'var(--space-2)' }}>
              <ProvenanceChip lab={report.performingLab} entryMode={observation.entryMode} />
              <span className="chip">
                {formatRange(observation.referenceRange) ?? t('analyte.no-range-short')}
              </span>
            </div>
            <p className="footnote">
              {t('analyte.printed-as', { label: observation.rawLabel })}
              {observation.source.documentName
                ? ` · ${observation.source.documentName}${
                    observation.source.page
                      ? `, ${t('analyte.page', { page: observation.source.page })}`
                      : ''
                  }`
                : ` · ${t('common.typed-by-hand')}`}
            </p>
            {observation.source.rawLine && (
              <p className="review-item__source">{observation.source.rawLine}</p>
            )}
          </div>
        ))}
      </section>

      <p className="footnote">{t('analyte.footnote')}</p>
    </div>
  )
}

function formatDelta(delta: number): string {
  const abs = Math.abs(delta)
  return String(Number(abs.toFixed(abs >= 10 ? 1 : 3)))
}
