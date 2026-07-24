import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Limpieza total de localStorage al cambiar versión de app
const APP_VERSION = '84.0'
if (localStorage.getItem('app_version') !== APP_VERSION) {
  localStorage.clear()
  localStorage.setItem('app_version', APP_VERSION)
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// PWA: registra el service worker (app instalable). Funciona en HTTPS o en localhost.
// No cachea la API (ver public/sw.js). Falla silenciosa si el navegador no lo soporta.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
}
