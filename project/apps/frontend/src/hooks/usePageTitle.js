import { useLocation } from 'react-router-dom'

const titles = {
  '/dashboardAdmin': 'Dashboard',
  '/dashboardAdmin/club': 'Club',
  '/dashboardAdmin/reservas': 'Reservas',
  '/dashboardAdmin/jugadores': 'Jugadores',
  '/dashboardAdmin/clases': 'Clases profesores',
  '/dashboardAdmin/torneos': 'Torneos',
  '/dashboardAdmin/pagos': 'Pagos',
}

const usePageTitle = () => {
  const { pathname } = useLocation()
  return titles[pathname] || 'PadelOS'
}

export default usePageTitle
