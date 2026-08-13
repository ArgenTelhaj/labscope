import { useMemo, useState } from 'react'
import { buildSeries } from './domain/series'
import type { ReportProposal } from './domain/types'
import { AddScreen } from './screens/AddScreen'
import { AnalyteScreen } from './screens/AnalyteScreen'
import { ReportScreen, ReportsScreen } from './screens/ReportsScreen'
import { ResultsScreen } from './screens/ResultsScreen'
import { ReviewScreen } from './screens/ReviewScreen'
import { commitProposal, deleteReport, useReports } from './store/reports'
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

const TAB_LABEL: Record<(typeof TABS)[number], string> = {
  results: 'Results',
  reports: 'Reports',
  add: 'Add a report',
}

export default function App() {
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
      <span className="navitem__label">{TAB_LABEL[tab]}</span>
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
          <span>LabScope</span>
        </div>
        <nav className="nav" aria-label="Main">
          {nav}
        </nav>
        <p className="sidebar__foot">
          Your reports are stored in this browser. Nothing is uploaded, and results are shown
          as your laboratory reported them.
        </p>
      </aside>

      <div className="content">
        <header className="topbar">
          {back && (
            <button type="button" className="iconbtn" onClick={back} aria-label="Back">
              <IconBack />
            </button>
          )}
          <h1 className="topbar__title">{title(route, openSeries?.displayLabel)}</h1>
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
              <p className="empty">This value is no longer in your record.</p>
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
              <p className="empty">This report is no longer in your record.</p>
            ))}
        </main>
      </div>

      <nav className="tabbar" aria-label="Main">
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
            {TAB_LABEL[tab]}
          </button>
        ))}
      </nav>
    </div>
  )
}

function title(route: Route, seriesLabel?: string): string {
  switch (route.name) {
    case 'results':
      return 'LabScope'
    case 'reports':
      return 'Reports'
    case 'add':
      return 'Add a report'
    case 'review':
      return 'Check before saving'
    case 'series':
      return seriesLabel ?? 'Result'
    case 'report':
      return 'Report'
  }
}

function isCurrent(route: Route, tab: (typeof TABS)[number]): boolean {
  if (route.name === tab) return true
  if (tab === 'results' && route.name === 'series') return true
  if (tab === 'reports' && route.name === 'report') return true
  if (tab === 'add' && route.name === 'review') return true
  return false
}
