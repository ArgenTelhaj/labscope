import { useMemo, useState } from 'react'
import { buildPanels, buildSeries, formatDate, type Panel, type Series } from '../domain/series'
import type { Report } from '../domain/types'
import { formatRange, statusOf } from '../domain/value'
import { StatusChip } from '../ui/Chips'
import { MastheadArt, PanelWell } from '../ui/PanelArt'
import { PanelStrip } from '../ui/PanelStrip'
import { RangeBand } from '../ui/RangeBand'
import { Sparkline } from '../ui/TrendChart'
import { IconChevron } from '../ui/icons'

/**
 * The graphical view (vision §8).
 *
 * L1 is the panel grid: one card per section your reports printed, the grouping
 * taken off the document rather than invented here. L2 is the list of values
 * inside a panel, each positioned in the range its own lab printed.
 *
 * The headline counts; it does not conclude. "Everything is where the lab said
 * it should be" is a restatement of the reports, not a verdict on the person.
 */
export function ResultsScreen({
  reports,
  onOpenSeries,
  onAdd,
}: {
  reports: Report[]
  onOpenSeries: (key: string) => void
  onAdd: () => void
}) {
  const series = useMemo(() => buildSeries(reports), [reports])
  const panels = useMemo(() => buildPanels(series), [series])
  const [openPanel, setOpenPanel] = useState<string | null>(null)

  const flagged = series.filter((s) => outside(s))

  if (series.length === 0) {
    return <NoResults onAdd={onAdd} />
  }

  const panel = panels.find((p) => p.key === openPanel) ?? null
  const watching = panels.filter((p) => p.series.some(outside))

  return (
    <div className="stack enter">
      <section
        className="card masthead"
        data-mood={flagged.length > 0 ? 'watch' : 'calm'}
      >
        <div className="masthead__copy">
          <p className={flagged.length > 0 ? 'kicker' : 'kicker kicker--calm'}>
            {reports.length} report{reports.length === 1 ? '' : 's'} · latest{' '}
            {formatDate(latestDate(reports))}
          </p>

          <h2 className="display display--xl">
            {flagged.length === 0 ? (
              <>
                Everything is <span className="display__accent">where your lab said</span> it
                should be.
              </>
            ) : (
              <>
                {flagged.length} value{flagged.length === 1 ? '' : 's'}{' '}
                <span className="display__accent">worth a look.</span>
              </>
            )}
          </h2>

          <p className="masthead__lede">
            {flagged.length === 0
              ? 'None of your latest values sit outside the range printed on the report they came from.'
              : `The rest of your latest values sit inside the range printed on the report they came from. LabScope shows where they landed — what it means is a conversation with a clinician.`}
          </p>

          <div className="masthead__cta">
            <button type="button" className="btn btn--primary" onClick={onAdd}>
              Add a report
            </button>
            {watching.length > 0 && (
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => setOpenPanel(watching[0].key)}
              >
                Open {watching[0].label}
              </button>
            )}
          </div>

          <div className="stats">
            <div className="stat">
              <p className="stat__num">{series.length}</p>
              <p className="stat__label">
                value{series.length === 1 ? '' : 's'} tracked
              </p>
            </div>
            <div className="stat">
              <p className="stat__num">{panels.length}</p>
              <p className="stat__label">panel{panels.length === 1 ? '' : 's'}</p>
            </div>
            <div className="stat">
              <p className="stat__num">{flagged.length}</p>
              <p className="stat__label">outside the lab’s range</p>
            </div>
          </div>
        </div>

        <MastheadArt
          label={watching[0]?.label ?? panels[0].label}
          callout={
            watching.length > 0
              ? `${watching.length} panel${watching.length === 1 ? '' : 's'} to check`
              : `${series.length - flagged.length} in range`
          }
        />
      </section>

      {panel ? (
        <PanelDetail
          panel={panel}
          onBack={() => setOpenPanel(null)}
          onOpenSeries={onOpenSeries}
        />
      ) : (
        <>
          <h2 className="section-title">Panels, as your reports grouped them</h2>
          <div className="panelgrid">
            {panels.map((p) => (
              <PanelCard key={p.key} panel={p} onOpen={() => setOpenPanel(p.key)} />
            ))}
          </div>
        </>
      )}

      <p className="footnote">
        Panels are the section headings printed on your own reports — LabScope does not sort
        results into groups of its own. Values are grouped by the name printed on the report,
        so two labs that print the same test differently show as two entries.
      </p>
    </div>
  )
}

/* ---------------------------------------------------------------- cards --- */

function PanelCard({ panel, onOpen }: { panel: Panel; onOpen: () => void }) {
  const watch = panel.series.filter(outside)
  const critical = panel.series.some(
    (s) => statusOf(s.latest.observation) === 'critical',
  )

  return (
    <button
      type="button"
      className={`panelcard${watch.length > 0 ? ' card--attention' : ''}`}
      onClick={onOpen}
    >
      <PanelWell label={panel.label} tone={watch.length > 0 ? 'accent' : 'calm'} />

      <div className="panelcard__body">
        <div className="panelcard__head">
          <span className="panelcard__title">{panel.label}</span>
          <span className="panelcard__count">
            {panel.series.length} value{panel.series.length === 1 ? '' : 's'}
          </span>
        </div>

        <p className="panelcard__values">{keyValues(panel)}</p>

        <span className={watch.length > 0 ? 'tag tag--watch' : 'tag tag--calm'}>
          {watch.length === 0
            ? 'All in range'
            : critical
              ? `${watch.length} flagged, ${panel.series.length - watch.length} in range`
              : `${watch.length} watching`}
        </span>

        <div className="panelcard__spark">
          <PanelStrip series={panel.series} />
        </div>
      </div>
    </button>
  )
}

/** L2: the values inside one panel. */
function PanelDetail({
  panel,
  onBack,
  onOpenSeries,
}: {
  panel: Panel
  onBack: () => void
  onOpenSeries: (key: string) => void
}) {
  return (
    <div className="stack enter">
      <div className="row row--between">
        <h2 className="display display--lg">{panel.label}</h2>
        <button type="button" className="btn btn--ghost" onClick={onBack}>
          All panels
        </button>
      </div>

      <section className="card card--flush">
        {panel.series.map((s) => {
          const o = s.latest.observation
          const range = formatRange(o.referenceRange)
          return (
            <button
              type="button"
              key={s.key}
              className="result"
              onClick={() => onOpenSeries(s.key)}
            >
              <div className="result__main">
                <p className="result__label">{s.displayLabel}</p>
                <p className="result__meta">
                  {formatDate(s.latest.report.collectedAt)}
                  {range ? ` · Lab’s range ${range}` : ' · The report printed no range'}
                  {s.points.length > 1 ? ` · ${s.points.length} results` : ''}
                </p>
              </div>

              <div className="result__band">
                <RangeBand observation={o} />
              </div>

              <div className="result__spark">
                <Sparkline series={s} />
              </div>

              <div className="result__right">
                <p className="result__value">
                  {o.rawValue}
                  {o.unitRaw && <span className="result__unit">{o.unitRaw}</span>}
                </p>
                <StatusChip observation={o} />
              </div>

              <span className="result__chev">
                <IconChevron />
              </span>
            </button>
          )
        })}
      </section>

      {panel.unlabelled && (
        <p className="footnote">
          These values had no section heading on the report they came from. Add one on the
          review screen and they move into a panel of their own.
        </p>
      )}
    </div>
  )
}

function NoResults({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="card masthead enter" data-mood="calm">
      <div className="masthead__copy">
        <p className="kicker kicker--calm">Nothing here yet</p>
        <h2 className="display display--xl">
          Your results, <span className="display__accent">as your lab printed them.</span>
        </h2>
        <p className="masthead__lede">
          Add a report and its values appear here, each one against the reference range from
          that report — never a range borrowed from somewhere else.
        </p>
        <div className="masthead__cta">
          <button type="button" className="btn btn--primary" onClick={onAdd}>
            Add a report
          </button>
        </div>
      </div>
      <MastheadArt label="all results" slug="empty-state" />
    </div>
  )
}

/* --------------------------------------------------------------- helpers --- */

function outside(s: Series): boolean {
  const status = statusOf(s.latest.observation)
  return status === 'outside' || status === 'critical'
}

/** The first few values, printed exactly as the report printed them. */
function keyValues(panel: Panel): string {
  return panel.series
    .slice(0, 3)
    .map((s) => {
      const o = s.latest.observation
      return `${s.displayLabel} ${o.rawValue}${o.unitRaw ? ` ${o.unitRaw}` : ''}`
    })
    .join(' · ')
}

function latestDate(reports: Report[]): string {
  return reports.reduce(
    (newest, r) => (r.collectedAt > newest ? r.collectedAt : newest),
    '',
  )
}
