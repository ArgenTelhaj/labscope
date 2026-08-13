import { formatDate } from '../domain/series'
import type { Series } from '../domain/series'
import { formatRange, isPlottable, STATUS_LABEL } from '../domain/value'
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
          {formatDate(series.latest.report.collectedAt)} ·{' '}
          {series.latest.report.performingLab ?? 'Lab not recorded'}
        </p>

        <div className="bandwrap">
          <RangeBand observation={latest} />
        </div>

        <div className="row row--wrap" style={{ gap: 'var(--space-2)' }}>
          <StatusChip observation={latest} />
          <span className="muted">
            {range ? `Lab’s range ${range}` : STATUS_LABEL.unknown}
          </span>
        </div>

        {latest.referenceRange.qualifier && (
          <p className="footnote">Range applies to: {latest.referenceRange.qualifier}</p>
        )}

        {latest.comparator !== 'eq' && (
          <p className="footnote">
            Reported as “{latest.rawValue}” — the exact value is beyond what the assay
            measures, so the marker is drawn hollow rather than at a precise point.
          </p>
        )}
      </section>

      {plottable.length >= 3 ? (
        <section className="card stack stack--tight">
          <h2 className="section-title">Over time</h2>
          <TrendChart series={series} />
          {plottable.length < series.points.length && (
            <p className="footnote">
              {series.points.length - plottable.length} result
              {series.points.length - plottable.length === 1 ? ' is' : 's are'} reported as
              above or below a limit, or not as a number, and{' '}
              {series.points.length - plottable.length === 1 ? 'is' : 'are'} not plotted. They
              are listed below.
            </p>
          )}
        </section>
      ) : (
        <section className="card stack stack--tight">
          <h2 className="section-title">Over time</h2>
          {delta !== null ? (
            <>
              <p className="note">
                {delta === 0
                  ? 'Unchanged since the previous result.'
                  : `${delta > 0 ? 'Up' : 'Down'} ${formatDelta(delta)}${
                      latest.unitRaw ? ` ${latest.unitRaw}` : ''
                    } since ${formatDate(previous!.report.collectedAt)}.`}
              </p>
              <p className="footnote">
                Two results are not a trend. A chart appears from the third result.
              </p>
            </>
          ) : (
            <p className="note">
              One result so far. Add another report and the movement appears here.
            </p>
          )}
        </section>
      )}

      {series.labs.length > 1 && (
        <div className="banner banner--attention">
          <span className="banner__icon">
            <IconInfo />
          </span>
          <span>
            These results come from {series.labs.length} different laboratories
            ({series.labs.join(', ')}). Different labs can use different methods and different
            reference ranges, so the values are not always directly comparable.
          </span>
        </div>
      )}

      {series.units.length > 1 && (
        <div className="banner banner--attention">
          <span className="banner__icon">
            <IconInfo />
          </span>
          <span>
            The unit changes across this history ({series.units.join(', ')}). Values are shown
            exactly as reported — LabScope does not convert them silently.
          </span>
        </div>
      )}

      <h2 className="section-title">Every result</h2>
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
            <p className="muted">{formatDate(report.collectedAt)}</p>
            <div className="row row--wrap" style={{ gap: 'var(--space-2)' }}>
              <ProvenanceChip lab={report.performingLab} entryMode={observation.entryMode} />
              <span className="chip">
                {formatRange(observation.referenceRange) ?? 'No range printed'}
              </span>
            </div>
            <p className="footnote">
              Printed as “{observation.rawLabel}”
              {observation.source.documentName
                ? ` · ${observation.source.documentName}${
                    observation.source.page ? `, page ${observation.source.page}` : ''
                  }`
                : ' · typed in by hand'}
            </p>
            {observation.source.rawLine && (
              <p className="review-item__source">{observation.source.rawLine}</p>
            )}
          </div>
        ))}
      </section>

      <p className="footnote">
        LabScope shows what your laboratory reported, including its own flags and ranges. It
        does not interpret results. Talk to a clinician about what they mean.
      </p>
    </div>
  )
}

function formatDelta(delta: number): string {
  const abs = Math.abs(delta)
  return String(Number(abs.toFixed(abs >= 10 ? 1 : 3)))
}
