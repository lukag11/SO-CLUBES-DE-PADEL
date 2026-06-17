import { useLocation } from 'react-router-dom'

const titles = {
  '/dashboardAdmin': 'Dashboard',
  '/dashboardAdmin/club': 'Club',
  '/dashboardAdmin/reservas': 'Reservas',
  '/dashboardAdmin/jugadores': 'Jugadores',
  '/dashboardAdmin/clases': 'Clases profesores',
  '/dashboardAdmin/torneos': 'Torneos',
  '/dashboardAdmin/pagos': 'Finanzas',
}

const usePageTitle = () => {
  const { pathname } = useLocation()
  return titles[pathname] || 'PadelwIArk'
}

export default usePageTitle
