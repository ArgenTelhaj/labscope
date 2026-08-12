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

No test runner is configured.

## Architecture

Vite + React 19 + TypeScript SPA. Entry: `index.html` → `src/main.tsx` → `src/App.tsx`. TS uses split project references (`tsconfig.json` → `tsconfig.app.json` for `src/`, `tsconfig.node.json` for Vite config). Bundler resolution, `verbatimModuleSyntax` on, `erasableSyntaxOnly` on — no enums, no namespaces, type-only imports must use `import type`.

Positioning: mobile-first PWA for visualizing medical test results over time — see
[`docs/product-vision.md`](docs/product-vision.md) for the full picture. Currently an early scaffold:
`src/App.tsx` renders a static `markers` array with **placeholder reference ranges that are not
clinically sourced**. That array and its `Marker` type are throwaway — they contradict the domain
model (see vision §14). Delete them rather than building on them; nothing that ships may contain an
unsourced reference range.

The product needs a backend (async ingestion, storage, auth, tenancy); the current static SPA is only
the client. That decision is deliberately deferred until the domain model and manual entry exist.

## Documentation

- `docs/product-vision.md` — product vision and high-level architecture (source of truth)
- `README.md` — setup and scripts

New long-form documentation goes in `docs/` as markdown, and gets a line here.
