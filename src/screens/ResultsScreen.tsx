import { useMemo, useState } from 'react'
import { buildPanels, buildSeries, type Panel, type Series } from '../domain/series'
import type { Report } from '../domain/types'
import { formatRange, statusOf } from '../domain/value'
import { useI18n, type Translate } from '../i18n'
import { Marked } from '../ui/Marked'
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
  const { t, d } = useI18n()
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
            {t('results.kicker', { count: reports.length, date: d(latestDate(reports)) })}
          </p>

          <h2 className="display display--xl">
            <Marked
              className="display__accent"
              text={
                flagged.length === 0
                  ? t('results.headline.calm')
                  : t('results.headline.watch', { count: flagged.length })
              }
            />
          </h2>

          <p className="masthead__lede">
            {flagged.length === 0 ? t('results.lede.calm') : t('results.lede.watch')}
          </p>

          <div className="masthead__cta">
            <button type="button" className="btn btn--primary" onClick={onAdd}>
              {t('action.add-report')}
            </button>
            {watching.length > 0 && (
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => setOpenPanel(watching[0].key)}
              >
                {t('results.open-panel', { label: labelOf(watching[0], t) })}
              </button>
            )}
          </div>

          <div className="stats">
            <div className="stat">
              <p className="stat__num">{series.length}</p>
              <p className="stat__label">{t('results.stat.values', { count: series.length })}</p>
            </div>
            <div className="stat">
              <p className="stat__num">{panels.length}</p>
              <p className="stat__label">{t('results.stat.panels', { count: panels.length })}</p>
            </div>
            <div className="stat">
              <p className="stat__num">{flagged.length}</p>
              <p className="stat__label">{t('results.stat.flagged')}</p>
            </div>
          </div>
        </div>

        <MastheadArt
          label={labelOf(watching[0] ?? panels[0], t)}
          callout={
            watching.length > 0
              ? t('results.callout.to-check', { count: watching.length })
              : t('results.callout.in-range', { count: series.length - flagged.length })
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
          <h2 className="section-title">{t('results.section.panels')}</h2>
          <div className="panelgrid">
            {panels.map((p) => (
              <PanelCard key={p.key} panel={p} onOpen={() => setOpenPanel(p.key)} />
            ))}
          </div>
        </>
      )}

      <p className="footnote">{t('results.footnote')}</p>
    </div>
  )
}

/* ---------------------------------------------------------------- cards --- */

function PanelCard({ panel, onOpen }: { panel: Panel; onOpen: () => void }) {
  const { t } = useI18n()
  const watch = panel.series.filter(outside)
  const critical = panel.series.some(
    (s) => statusOf(s.latest.observation) === 'critical',
  )
  const label = labelOf(panel, t)

  return (
    <button
      type="button"
      className={`panelcard${watch.length > 0 ? ' card--attention' : ''}`}
      onClick={onOpen}
    >
      <PanelWell label={label} tone={watch.length > 0 ? 'accent' : 'calm'} />

      <div className="panelcard__body">
        <div className="panelcard__head">
          <span className="panelcard__title">{label}</span>
          <span className="panelcard__count">
            {t('panel.count', { count: panel.series.length })}
          </span>
        </div>

        <p className="panelcard__values">{keyValues(panel)}</p>

        <span className={watch.length > 0 ? 'tag tag--watch' : 'tag tag--calm'}>
          {watch.length === 0
            ? t('panel.tag.calm')
            : critical
              ? t('panel.tag.critical', {
                  flagged: watch.length,
                  rest: panel.series.length - watch.length,
                })
              : t('panel.tag.watch', { count: watch.length })}
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
  const { t, d } = useI18n()
  return (
    <div className="stack enter">
      <div className="row row--between">
        <h2 className="display display--lg">{labelOf(panel, t)}</h2>
        <button type="button" className="btn btn--ghost" onClick={onBack}>
          {t('panel.all')}
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
                  {d(s.latest.report.collectedAt)}
                  {' · '}
                  {range
                    ? t('common.lab-range', { range })
                    : t('common.no-range-printed')}
                  {s.points.length > 1
                    ? ` · ${t('panel.results-count', { count: s.points.length })}`
                    : ''}
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

      {panel.unlabelled && <p className="footnote">{t('panel.unlabelled.footnote')}</p>}
    </div>
  )
}

function NoResults({ onAdd }: { onAdd: () => void }) {
  const { t } = useI18n()
  return (
    <div className="card masthead enter" data-mood="calm">
      <div className="masthead__copy">
        <p className="kicker kicker--calm">{t('results.empty.kicker')}</p>
        <h2 className="display display--xl">
          <Marked className="display__accent" text={t('results.empty.headline')} />
        </h2>
        <p className="masthead__lede">{t('results.empty.lede')}</p>
        <div className="masthead__cta">
          <button type="button" className="btn btn--primary" onClick={onAdd}>
            {t('action.add-report')}
          </button>
        </div>
      </div>
      <MastheadArt label={t('results.empty.art')} slug="empty-state" />
    </div>
  )
}

/* --------------------------------------------------------------- helpers --- */

/**
 * A panel is named by the heading its report printed. The catch-all printed no
 * heading, so it is the one panel the interface names — in the reader's
 * language, and never as a guess at what those results are.
 */
function labelOf(panel: Panel, t: Translate): string {
  return panel.unlabelled ? t('common.other-results') : panel.label
}

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
