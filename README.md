# LabScope

A mobile-first web app for visualizing and tracking medical test results over time.

Built with Vite + React + TypeScript. Responsive down to phone widths and installable
as a PWA, so it runs from a home screen without a native build.

## Getting started

```bash
npm install
npm run dev
```

The dev server runs at http://localhost:5173.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Type-check and build to `dist/` |
| `npm run preview` | Serve the production build locally |

## Status

Early scaffold. The result cards in `src/App.tsx` render **placeholder data with
invented reference ranges** — replace them with clinically sourced ranges before
the app displays anyone's real results.
