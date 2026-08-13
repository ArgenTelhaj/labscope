# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Product direction — read this first

[`docs/product-vision.md`](docs/product-vision.md) is the source of truth for what LabScope is, its
domain model, ingestion pipeline, information architecture, design-system principles, regulatory
boundaries, and roadmap. Read it before designing anything non-trivial; it explains *why* the
constraints below exist.

**Keep it current.** On every change or implementation, check whether that document still describes
reality, and update it in the same change when it does not. Specifically, update it when you:

- change or extend the domain model (entities, fields, their meaning) — §6
- change the ingestion or review flow — §7
- add, move, or remove a screen or view level — §8
- establish a design-system rule or component — §9
- ship anything that touches the regulatory line between displaying and interpreting results — §5
- complete or reorder roadmap work — §13
- answer one of the open questions — §15 (move the answer into the body, delete the question)
- discover that a stated assumption is wrong

If a change contradicts the document and the document is right, raise it rather than silently
diverging. If the document is wrong, fix it. Do not let code and vision drift apart.

## Non-negotiable domain constraints

Derived from `docs/product-vision.md`; the rationale is there.

- A result's **panel is the section heading its report printed**, captured like any other printed
  fact. There is no analyte→organ or analyte→panel table, and adding one would cross §4.5's line
  from grouping into inferring. Unheaded results go to a visible catch-all, never to a guess.
- A reference range belongs to the **result**, not the analyte — captured from the issuing report,
  stored with its provenance and qualifier. Never a global lookup table.
- Preserve the raw label and raw value exactly as printed alongside any parsed/normalised form.
- The time axis is **specimen collection time**, never upload time.
- Result values are not always numbers (`<0.01`, "Negative", "1:160"). Model accordingly.
- Units are UCUM-coded; conversions are per-analyte and never silent.
- Interpretation flags come from the lab (H/L/critical); the app reports them, it does not decide them.
- Extraction proposes, a human commits. Every data point links back to its source document.
- The app displays and organises; it does not diagnose, score, or recommend.
- No health data in logs, analytics, error trackers, or URL parameters.

## Commands

- `npm run dev` — Vite dev server at http://localhost:5173
- `npm run build` — `tsc -b` (project references) then `vite build` to `dist/`
- `npm run lint` — oxlint (config in `.oxlintrc.json`, plugins: react, typescript, oxc)
- `npm run preview` — serve the production build
- `tools/parse-check.sh <file.pdf>…` — run the real ingestion pipeline over PDFs on disk and print
  the proposal it produced. The way to check extraction against real reports without clicking
  through the app. Output goes to `.parse-check-out/` (gitignored).

No test runner is configured.

**Never commit a real patient report to this repo.** `public/samples/` holds synthetic ones only.
Point `tools/parse-check.sh` at real reports wherever they already live.

## Architecture

Vite + React 19 + TypeScript SPA. Entry: `index.html` → `src/main.tsx` → `src/App.tsx`. TS uses split project references (`tsconfig.json` → `tsconfig.app.json` for `src/`, `tsconfig.node.json` for Vite config). Bundler resolution, `verbatimModuleSyntax` on, `erasableSyntaxOnly` on — no enums, no namespaces, type-only imports must use `import type`.

Positioning: mobile-first PWA for visualizing medical test results over time — see
[`docs/product-vision.md`](docs/product-vision.md) for the full picture.

Current state: MVP of the upload → review → graphical view flow, client-only.

- `src/domain` — the model (§6 subset), value parsing, status derivation, series assembly. No UI.
- `src/ingest` — PDF text-layer extraction (pdfjs, in-browser) and the deterministic parser. It
  produces *proposals*; it never commits.
  - `pdfText.ts` — glyph runs → rows and cells. Folds superscripts back into their base (`10³/uL`)
    and clusters rows by baseline proximity. `buildLines` is the pure part, for the harness.
  - `columns.ts` — table recovery. When a report prints a header row, resolves each cell to a
    column by maximum overlap, and folds wrapped continuation rows into the row above.
  - `parseReport.ts` — reads rows as a table when `columns.ts` found one, otherwise falls back to
    matching each line by shape. Also dates, flags and the performing lab.
- `src/store/reports.ts` — `localStorage` persistence, and the commit step that turns a reviewed
  proposal into a record.
- `src/design` — tokens and component CSS. Status is never carried by colour alone. The visual
  identity (cream/terracotta/sage, Caprasimo + Figtree, pills and soft shadow) is vision §9.1;
  nothing outside `tokens.css` hard-codes a colour.
- `src/ui`, `src/screens` — design-system atoms and the five screens. `PanelArt.tsx` is the only
  file that maps a printed heading to a picture, and the mapping is decoration only.

The old placeholder `markers` array with invented ranges is gone. There is no reference-range
fallback table anywhere in the codebase, and adding one would violate the constraint above.

The product still needs a backend (async ingestion, document storage, OCR, auth, tenancy); the
current SPA is only the client, and `localStorage` is a placeholder for it.

## Documentation

- `docs/product-vision.md` — product vision and high-level architecture (source of truth)
- `docs/image-needs.md` — the organ-render shot list and the spec a new render must meet
- `README.md` — setup and scripts

New long-form documentation goes in `docs/` as markdown, and gets a line here.
