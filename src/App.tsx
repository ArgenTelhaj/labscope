import { useMemo, useState } from 'react'
import { buildSeries } from './domain/series'
import type { ReportProposal } from './domain/types'
import { AddScreen } from './screens/AddScreen'
import { AnalyteScreen } from './screens/AnalyteScreen'
import { ReportScreen, ReportsScreen } from './screens/ReportsScreen'
import { ResultsScreen } from './screens/ResultsScreen'
import { ReviewScreen } from './screens/ReviewScreen'
import { commitProposal, deleteReport, useReports } from './store/reports'
import { useI18n, type LabelKey, type Translate } from './i18n'
import { LanguagePicker } from './ui/LanguagePicker'
import { IconBack, IconChart, IconDocuments, IconUpload } from './ui/icons'

/**
 * Navigation is held in memory rather than in the URL: a URL carrying an
 * analyte name is health data in a place it must never be (vision §11).
 */
type Route =
  | { name: 'results' }
  | { name: 'reports' }
  | { name: 'add' }
  | { name: 'review'; proposal: ReportProposal }
  | { name: 'series'; key: string }
  | { name: 'report'; id: string }

const TABS = ['results', 'reports', 'add'] as const

const TAB_LABEL: Record<(typeof TABS)[number], LabelKey> = {
  results: 'nav.results',
  reports: 'nav.reports',
  add: 'nav.add',
}

export default function App() {
  const { t } = useI18n()
  const reports = useReports()
  const [route, setRoute] = useState<Route>({ name: 'results' })
  const series = useMemo(() => buildSeries(reports), [reports])

  const openSeries = route.name === 'series' ? series.find((s) => s.key === route.key) : undefined
  const openReport =
    route.name === 'report' ? reports.find((r) => r.id === route.id) : undefined

  const back =
    route.name === 'series'
      ? () => setRoute({ name: 'results' })
      : route.name === 'report'
        ? () => setRoute({ name: 'reports' })
        : route.name === 'review'
          ? () => setRoute({ name: 'add' })
          : null

  const nav = TABS.map((tab) => (
    <button
      key={tab}
      type="button"
      className="navitem"
      aria-current={isCurrent(route, tab) ? 'page' : undefined}
      onClick={() => setRoute({ name: tab } as Route)}
    >
      <span className="navitem__icon">
        {tab === 'results' && <IconChart />}
        {tab === 'reports' && <IconDocuments />}
        {tab === 'add' && <IconUpload />}
      </span>
      <span className="navitem__label">{t(TAB_LABEL[tab])}</span>
      {tab === 'results' && reports.length > 0 && (
        <span className="navitem__count">{series.length}</span>
      )}
      {tab === 'reports' && reports.length > 0 && (
        <span className="navitem__count">{reports.length}</span>
      )}
    </button>
  ))

  return (
    <div className="app">
      {/* Desktop: a standing left rail. Below 880px it collapses to a bottom bar. */}
      <aside className="sidebar">
        <div className="sidebar__brand">
          <span className="sidebar__mark" aria-hidden />
          <span>{t('app.name')}</span>
        </div>
        <nav className="nav" aria-label={t('app.nav.aria')}>
          {nav}
        </nav>
        <div className="sidebar__foot">
          <LanguagePicker />
          <p>{t('app.sidebar.foot')}</p>
        </div>
      </aside>

      <div className="content">
        <header className="topbar">
          {back && (
            <button type="button" className="iconbtn" onClick={back} aria-label={t('action.back')}>
              <IconBack />
            </button>
          )}
          <h1 className="topbar__title">{title(route, t, openSeries?.displayLabel)}</h1>
          {/* The sidebar carries the switcher on desktop; on a phone there is none. */}
          <div className="topbar__lang">
            <LanguagePicker />
          </div>
        </header>

        <main className="screen">
          {route.name === 'results' && (
            <ResultsScreen
              reports={reports}
              onOpenSeries={(key) => setRoute({ name: 'series', key })}
              onAdd={() => setRoute({ name: 'add' })}
            />
          )}

          {route.name === 'reports' && (
            <ReportsScreen
              reports={reports}
              onOpenReport={(id) => setRoute({ name: 'report', id })}
              onAdd={() => setRoute({ name: 'add' })}
            />
          )}

          {route.name === 'add' && (
            <AddScreen onProposal={(proposal) => setRoute({ name: 'review', proposal })} />
          )}

          {route.name === 'review' && (
            <ReviewScreen
              initial={route.proposal}
              onCancel={() => setRoute({ name: 'add' })}
              onCommit={(proposal) => {
                commitProposal(proposal)
                setRoute({ name: 'results' })
              }}
            />
          )}

          {route.name === 'series' &&
            (openSeries ? (
              <AnalyteScreen series={openSeries} />
            ) : (
              <p className="empty">{t('gone.series')}</p>
            ))}

          {route.name === 'report' &&
            (openReport ? (
              <ReportScreen
                report={openReport}
                onDelete={() => {
                  deleteReport(openReport.id)
                  setRoute({ name: 'reports' })
                }}
              />
            ) : (
              <p className="empty">{t('gone.report')}</p>
            ))}
        </main>
      </div>

      <nav className="tabbar" aria-label={t('app.nav.aria')}>
        {TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            className="tab"
            aria-current={isCurrent(route, tab) ? 'page' : undefined}
            onClick={() => setRoute({ name: tab } as Route)}
          >
            {tab === 'results' && <IconChart />}
            {tab === 'reports' && <IconDocuments />}
            {tab === 'add' && <IconUpload />}
            {t(TAB_LABEL[tab])}
          </button>
        ))}
      </nav>
    </div>
  )
}

function title(route: Route, t: Translate, seriesLabel?: string): string {
  switch (route.name) {
    case 'results':
      return t('title.results')
    case 'reports':
      return t('title.reports')
    case 'add':
      return t('title.add')
    case 'review':
      return t('title.review')
    // The analyte's own name is printed as the report printed it, untranslated.
    case 'series':
      return seriesLabel ?? t('title.series')
    case 'report':
      return t('title.report')
  }
}

function isCurrent(route: Route, tab: (typeof TABS)[number]): boolean {
  if (route.name === tab) return true
  if (tab === 'results' && route.name === 'series') return true
  if (tab === 'reports' && route.name === 'report') return true
  if (tab === 'add' && route.name === 'review') return true
  return false
}
