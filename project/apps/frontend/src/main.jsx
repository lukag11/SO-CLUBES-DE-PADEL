import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Limpieza total de localStorage al cambiar versión de app
const APP_VERSION = '38.0'
if (localStorage.getItem('app_version') !== APP_VERSION) {
  localStorage.clear()
  localStorage.setItem('app_version', APP_VERSION)
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
