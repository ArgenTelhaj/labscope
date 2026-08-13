# LabScope

A mobile-first web app for keeping your lab results over time: upload a report, confirm what
was read from it, and see each value against the reference range **that report printed**.

Built with Vite + React + TypeScript. Responsive down to phone widths and installable
as a PWA, so it runs from a home screen without a native build.

## Getting started

```bash
npm install
npm run dev
```

The dev server runs at http://localhost:5173.

Sample reports for trying the flow are in `public/samples/` — synthetic PDFs, not real
patient data. `sample-report-sectioned.pdf` is the one printed as a table with section
headings, so it is the one that exercises panel grouping; the others are read line by line
and land under "Other results".

The organ renders the interface expects are not in the repo. Drop them into `public/organs/`
following [`docs/image-needs.md`](docs/image-needs.md); until then the panel cards fall back
to a monogram.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Type-check and build to `dist/` |
| `npm run lint` | Lint with oxlint |
| `npm run preview` | Serve the production build locally |

## How it works

1. **Add** — drop in a PDF. Its text layer is read in the browser (no upload, no network) and
   turned into a *proposal*: test name, value, unit, and the reference range as printed.
2. **Check before saving** — you confirm or correct every value, and set the collection date.
   Nothing becomes a record until you do. Rows the parser was unsure about are flagged.
3. **Results** — every value positioned inside the range its own lab printed, with a trend
   chart once an analyte has three or more results.

Scans, photos and password-protected PDFs have no text layer to read; those fall back to
typing the values in, with the reason stated on screen.

## What it deliberately does not do

- **No invented reference ranges.** There is no fallback range table in this codebase. If a
  report printed no range, the app says so.
- **No interpretation.** No scores, no risk estimates, no "what this means". It shows what
  your laboratory reported, including the laboratory's own flags.
- **No silent unit conversion**, and no assumption that two labs' results are comparable — a
  change of lab, unit or range is shown, not smoothed over.

## Storage

Reports live in `localStorage` in your browser. Nothing is uploaded and nothing is logged.
That also means they are per-browser and per-device, and clearing site data deletes them.
A real storage layer is the next architectural decision — see
[`docs/product-vision.md`](docs/product-vision.md) §12.

## Status

MVP: upload → review → graphical view, on the domain model in
[`docs/product-vision.md`](docs/product-vision.md) §6. Not a medical device; not for clinical
use.

## Documentation

- [`docs/product-vision.md`](docs/product-vision.md) — product vision and architecture (source
  of truth)
