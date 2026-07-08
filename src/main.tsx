import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App.tsx'

// F9.3: never silently swap the service worker mid-session. A proper in-app
// toast replaces this confirm() in Phase 8.
const updateSW = registerSW({
  onNeedRefresh() {
    if (window.confirm('Update available — refresh now?')) {
      void updateSW(true)
    }
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
