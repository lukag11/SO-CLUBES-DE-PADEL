import { useEffect } from 'react'
import '../padelwiark.css'
import usePlatformStore from '../../../store/platformStore'
import PwAdminLogin from './PwAdminLogin'
import PwAdminDashboard from './PwAdminDashboard'

// Panel del super-admin (4to rol). Si no hay sesión → login; si hay → dashboard.
const PlataformaPage = () => {
  const isAuthenticated = usePlatformStore((s) => s.isAuthenticated)

  useEffect(() => {
    const prev = document.title
    document.title = 'PadelwIArk — Plataforma'
    return () => { document.title = prev }
  }, [])

  return isAuthenticated ? <PwAdminDashboard /> : <PwAdminLogin />
}

export default PlataformaPage
