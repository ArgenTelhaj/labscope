import { useMemo, useState } from 'react'
import type { LabInterpretation, ObservationProposal, ReportProposal } from '../domain/types'
import { ConfidenceChip } from '../ui/Chips'
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
          <span>{draft.notice}</span>
        </div>
      )}

      <section className="card stack">
        <h2 className="section-title">This report</h2>

        <div className="field">
          <label className="field__label" htmlFor="collected">
            Collection date — the date the sample was taken
          </label>
          <input
            id="collected"
            className="input"
            type="date"
            value={draft.collectedAt}
            onChange={(e) => setDraft({ ...draft, collectedAt: e.target.value })}
          />
          <span className="footnote">
            Not the date you uploaded it. Everything is placed on this date, so it is worth
            checking against the report.
          </span>
        </div>

        <div className="grid-2">
          <div className="field">
            <label className="field__label" htmlFor="reported">
              Report date
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
              Fasting
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
              <option value="">Not stated</option>
              <option value="yes">Fasting</option>
              <option value="no">Not fasting</option>
            </select>
          </div>
        </div>

        <div className="field">
          <label className="field__label" htmlFor="lab">
            Performing laboratory
          </label>
          <input
            id="lab"
            className="input"
            value={draft.performingLab}
            placeholder="As printed on the report"
            onChange={(e) => setDraft({ ...draft, performingLab: e.target.value })}
          />
        </div>

        {draft.documentName && (
          <p className="footnote">Source document: {draft.documentName}</p>
        )}
      </section>

      <div className="row row--between">
        <h2 className="section-title">
          {included.length} value{included.length === 1 ? '' : 's'} to save
        </h2>
        {needsAttention > 0 && (
          <span className="muted">{needsAttention} to check</span>
        )}
      </div>

      <section className="card card--flush">
        {sortedKeys.length === 0 && (
          <p className="empty">Nothing to review yet.</p>
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
                <span className="muted">{o.include ? 'Save this' : 'Skipped'}</span>
              </label>
              <div className="row" style={{ gap: 'var(--space-2)' }}>
                <ConfidenceChip confidence={o.confidence} />
                <button
                  type="button"
                  className="iconbtn"
                  aria-label="Remove this row"
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
                placeholder="Test name, exactly as printed"
                aria-label="Test name"
                onChange={(e) => patch(o.key, { rawLabel: e.target.value })}
              />
              <input
                className="input input--sm"
                value={o.panelRaw}
                placeholder="Section heading"
                aria-label="Section heading printed above this test"
                onChange={(e) => patch(o.key, { panelRaw: e.target.value })}
              />
            </div>

            <div className="grid-3">
              <input
                className="input input--sm"
                value={o.rawValue}
                placeholder="Value"
                aria-label="Value"
                inputMode="text"
                onChange={(e) => patch(o.key, { rawValue: e.target.value })}
              />
              <input
                className="input input--sm"
                value={o.unitRaw}
                placeholder="Unit"
                aria-label="Unit"
                onChange={(e) => patch(o.key, { unitRaw: e.target.value })}
              />
              <select
                className="input input--sm"
                value={o.interpretation ?? ''}
                aria-label="Flag printed by the lab"
                onChange={(e) =>
                  patch(o.key, {
                    interpretation: (e.target.value || null) as LabInterpretation | null,
                  })
                }
              >
                <option value="">No flag</option>
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
                placeholder="Range low"
                aria-label="Reference range low, as printed"
                inputMode="decimal"
                onChange={(e) => patch(o.key, { rangeLow: e.target.value })}
              />
              <input
                className="input input--sm"
                value={o.rangeHigh}
                placeholder="Range high"
                aria-label="Reference range high, as printed"
                inputMode="decimal"
                onChange={(e) => patch(o.key, { rangeHigh: e.target.value })}
              />
              <input
                className="input input--sm"
                value={o.rangeQualifier}
                placeholder="e.g. adult male"
                aria-label="Range qualifier, as printed"
                onChange={(e) => patch(o.key, { rangeQualifier: e.target.value })}
              />
            </div>

            {o.source.rawLine && (
              <p className="review-item__source" title="The line this was read from">
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
        Add another value
      </button>

      <p className="footnote">
        Values and ranges are saved exactly as you confirm them here, alongside the line they
        were read from. If your report printed no reference range, leave the range blank —
        LabScope will say so rather than substitute one. The section heading is only used to
        group results the way your report grouped them; leave it blank and the value sits
        under “Other results”.
      </p>

      <div className="row" style={{ gap: 'var(--space-3)' }}>
        <button type="button" className="btn btn--ghost" onClick={onCancel}>
          Discard
        </button>
        <button
          type="button"
          className="btn btn--primary"
          style={{ flex: 1 }}
          disabled={!canCommit}
          onClick={() => onCommit(draft)}
        >
          Save {included.length} value{included.length === 1 ? '' : 's'}
        </button>
      </div>
      {!canCommit && (
        <p className="footnote">
          A collection date and at least one value with a name are needed before saving.
        </p>
      )}
    </div>
  )
}
