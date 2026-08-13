import { useMemo, useState } from 'react'
import type { LabInterpretation, ObservationProposal, ReportProposal } from '../domain/types'
import { ConfidenceChip } from '../ui/Chips'
import { NOTICE_KEY, useI18n } from '../i18n'
import { IconInfo, IconTrash } from '../ui/icons'
import { blankObservation } from '../ingest/proposal'

/**
 * The commit step (vision §7). Extraction proposes, a human commits — even a
 * perfect extraction passes through here. Low-confidence fields are surfaced so
 * attention lands where it is needed, and the line each value was read from is
 * shown next to it as the MVP's source-region link.
 */
export function ReviewScreen({
  initial,
  onCommit,
  onCancel,
}: {
  initial: ReportProposal
  onCommit: (proposal: ReportProposal) => void
  onCancel: () => void
}) {
  const { t } = useI18n()
  const [draft, setDraft] = useState<ReportProposal>(initial)

  const included = draft.observations.filter(
    (o) => o.include && o.rawLabel.trim() && o.rawValue.trim(),
  )
  const needsAttention = included.filter((o) => o.confidence < 0.75).length
  const canCommit = Boolean(draft.collectedAt) && included.length > 0

  const sortedKeys = useMemo(() => draft.observations.map((o) => o.key), [draft.observations])

  function patch(key: string, changes: Partial<ObservationProposal>) {
    setDraft((d) => ({
      ...d,
      observations: d.observations.map((o) => (o.key === key ? { ...o, ...changes } : o)),
    }))
  }

  return (
    <div className="stack">
      {draft.notice && (
        <div className="banner banner--attention">
          <span className="banner__icon">
            <IconInfo />
          </span>
          <span>{t(NOTICE_KEY[draft.notice])}</span>
        </div>
      )}

      <section className="card stack">
        <h2 className="section-title">{t('review.this-report')}</h2>

        <div className="field">
          <label className="field__label" htmlFor="collected">
            {t('review.collected.label')}
          </label>
          <input
            id="collected"
            className="input"
            type="date"
            value={draft.collectedAt}
            onChange={(e) => setDraft({ ...draft, collectedAt: e.target.value })}
          />
          <span className="footnote">{t('review.collected.hint')}</span>
        </div>

        <div className="grid-2">
          <div className="field">
            <label className="field__label" htmlFor="reported">
              {t('review.reported.label')}
            </label>
            <input
              id="reported"
              className="input"
              type="date"
              value={draft.reportedAt}
              onChange={(e) => setDraft({ ...draft, reportedAt: e.target.value })}
            />
          </div>
          <div className="field">
            <label className="field__label" htmlFor="fasting">
              {t('review.fasting.label')}
            </label>
            <select
              id="fasting"
              className="input"
              value={draft.fasting === null ? '' : draft.fasting ? 'yes' : 'no'}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  fasting: e.target.value === '' ? null : e.target.value === 'yes',
                })
              }
            >
              <option value="">{t('review.fasting.unstated')}</option>
              <option value="yes">{t('review.fasting.yes')}</option>
              <option value="no">{t('review.fasting.no')}</option>
            </select>
          </div>
        </div>

        <div className="field">
          <label className="field__label" htmlFor="lab">
            {t('review.lab.label')}
          </label>
          <input
            id="lab"
            className="input"
            value={draft.performingLab}
            placeholder={t('review.lab.placeholder')}
            onChange={(e) => setDraft({ ...draft, performingLab: e.target.value })}
          />
        </div>

        {draft.documentName && (
          <p className="footnote">
            {t('review.source-document', { name: draft.documentName })}
          </p>
        )}
      </section>

      <div className="row row--between">
        <h2 className="section-title">{t('review.to-save', { count: included.length })}</h2>
        {needsAttention > 0 && (
          <span className="muted">{t('review.to-check', { count: needsAttention })}</span>
        )}
      </div>

      <section className="card card--flush">
        {sortedKeys.length === 0 && (
          <p className="empty">{t('review.nothing-yet')}</p>
        )}
        {draft.observations.map((o) => (
          <div className="review-item" key={o.key} data-included={o.include}>
            <div className="row row--between">
              <label className="check">
                <input
                  type="checkbox"
                  checked={o.include}
                  onChange={(e) => patch(o.key, { include: e.target.checked })}
                />
                <span className="muted">
                  {o.include ? t('review.save-this') : t('review.skipped')}
                </span>
              </label>
              <div className="row" style={{ gap: 'var(--space-2)' }}>
                <ConfidenceChip confidence={o.confidence} />
                <button
                  type="button"
                  className="iconbtn"
                  aria-label={t('review.remove-row')}
                  onClick={() =>
                    setDraft((d) => ({
                      ...d,
                      observations: d.observations.filter((x) => x.key !== o.key),
                    }))
                  }
                >
                  <IconTrash />
                </button>
              </div>
            </div>

            <div className="grid-name">
              <input
                className="input input--sm"
                value={o.rawLabel}
                placeholder={t('review.field.name.placeholder')}
                aria-label={t('review.field.name')}
                onChange={(e) => patch(o.key, { rawLabel: e.target.value })}
              />
              <input
                className="input input--sm"
                value={o.panelRaw}
                placeholder={t('review.field.panel')}
                aria-label={t('review.field.panel.aria')}
                onChange={(e) => patch(o.key, { panelRaw: e.target.value })}
              />
            </div>

            <div className="grid-3">
              <input
                className="input input--sm"
                value={o.rawValue}
                placeholder={t('review.field.value')}
                aria-label={t('review.field.value')}
                inputMode="text"
                onChange={(e) => patch(o.key, { rawValue: e.target.value })}
              />
              <input
                className="input input--sm"
                value={o.unitRaw}
                placeholder={t('review.field.unit')}
                aria-label={t('review.field.unit')}
                onChange={(e) => patch(o.key, { unitRaw: e.target.value })}
              />
              <select
                className="input input--sm"
                value={o.interpretation ?? ''}
                aria-label={t('review.field.flag.aria')}
                onChange={(e) =>
                  patch(o.key, {
                    interpretation: (e.target.value || null) as LabInterpretation | null,
                  })
                }
              >
                <option value="">{t('review.field.flag.none')}</option>
                <option value="H">H</option>
                <option value="L">L</option>
                <option value="HH">HH</option>
                <option value="LL">LL</option>
                <option value="N">N</option>
              </select>
            </div>

            <div className="grid-3">
              <input
                className="input input--sm"
                value={o.rangeLow}
                placeholder={t('review.field.range-low')}
                aria-label={t('review.field.range-low.aria')}
                inputMode="decimal"
                onChange={(e) => patch(o.key, { rangeLow: e.target.value })}
              />
              <input
                className="input input--sm"
                value={o.rangeHigh}
                placeholder={t('review.field.range-high')}
                aria-label={t('review.field.range-high.aria')}
                inputMode="decimal"
                onChange={(e) => patch(o.key, { rangeHigh: e.target.value })}
              />
              <input
                className="input input--sm"
                value={o.rangeQualifier}
                placeholder={t('review.field.qualifier.placeholder')}
                aria-label={t('review.field.qualifier.aria')}
                onChange={(e) => patch(o.key, { rangeQualifier: e.target.value })}
              />
            </div>

            {o.source.rawLine && (
              <p className="review-item__source" title={t('review.source-line')}>
                {o.source.rawLine}
              </p>
            )}
          </div>
        ))}
      </section>

      <button
        type="button"
        className="btn btn--block"
        onClick={() =>
          setDraft((d) => ({
            ...d,
            observations: [
              ...d.observations,
              blankObservation(d.observations.length, d.documentName ?? ''),
            ],
          }))
        }
      >
        {t('review.add-value')}
      </button>

      <p className="footnote">{t('review.footnote')}</p>

      <div className="row" style={{ gap: 'var(--space-3)' }}>
        <button type="button" className="btn btn--ghost" onClick={onCancel}>
          {t('review.discard')}
        </button>
        <button
          type="button"
          className="btn btn--primary"
          style={{ flex: 1 }}
          disabled={!canCommit}
          onClick={() => onCommit(draft)}
        >
          {t('review.save', { count: included.length })}
        </button>
      </div>
      {!canCommit && (
        <p className="footnote">{t('review.cannot-save')}</p>
      )}
    </div>
  )
}
