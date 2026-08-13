import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Self-hosted: a webfont CDN would put the device's IP on a third party's log
// on every visit to a health app (vision §11). These ship in the bundle.
import '@fontsource/caprasimo/latin-400.css'
import '@fontsource/figtree/latin-400.css'
import '@fontsource/figtree/latin-500.css'
import '@fontsource/figtree/latin-600.css'
import './design/tokens.css'
import './design/app.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
