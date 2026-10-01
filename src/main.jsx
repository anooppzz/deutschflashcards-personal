import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { initPwa } from './engine/pwa'

// NOTE: StrictMode intentionally omitted during Phase 0 migration.
// The original app never double-invoked effects; this app has effects with
// real side effects (translation API calls, localStorage writes). We verify
// 1:1 behavioral parity with the original first, then reintroduce StrictMode
// deliberately in a later phase and audit any effects it flags.
const root = createRoot(document.getElementById('root'))
root.render(<App />)
document.getElementById('loading').style.display = 'none'
// offline cache + install prompt (live site only, see engine/pwa.js)
initPwa()
