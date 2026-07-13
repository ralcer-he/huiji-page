import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App.jsx'
import { AppProvider } from './store/AppContext.jsx'
import './index.css'

const isTauri = typeof window !== 'undefined' && (
  window.__TAURI__ !== undefined ||
  window.location.protocol === 'tauri:' ||
  window.location.hostname === 'tauri.localhost'
)

if (isTauri && 'serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(regs => {
    regs.forEach(r => r.unregister())
  }).catch(() => {})
  if ('caches' in window) {
    caches.keys().then(keys => {
      keys.forEach(k => caches.delete(k))
    }).catch(() => {})
  }
} else if (!isTauri && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {})
  })
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppProvider>
      <HashRouter>
        <App />
      </HashRouter>
    </AppProvider>
  </React.StrictMode>,
)
