import { createBrowserRouter, Navigate } from 'react-router-dom'
import PublicLayout from '../layouts/PublicLayout'
import AuthLayout from '../layouts/AuthLayout'
import AdminDashboardLayout from '../layouts/AdminDashboardLayout'
import PlayerLayout from '../layouts/PlayerLayout'
import ProfesorLayout from '../layouts/ProfesorLayout'
import LandingPage from '../pages/LandingPage'
import LoginPage from '../pages/LoginPage'
import PlayerAuthPage from '../pages/PlayerAuthPage'
import ProfesorLoginPage from '../pages/ProfesorLoginPage'
import AdminDashboardPage from '../pages/AdminDashboardPage'
import ClubPage from '../pages/QuienesSomosPage'
import ReservasPage from '../pages/ReservasPage'
import TorneosPage from '../pages/TorneosPage'
import PagosPage from '../pages/PagosPage'
import PlayerDashboardPage from '../pages/PlayerDashboardPage'
import PlayerRegisterPage from '../pages/PlayerRegisterPage'
import PlayerStatsPage from '../pages/PlayerStatsPage'
import PlayerTournamentsPage from '../pages/PlayerTournamentsPage'
import PlayerOpponentsPage from '../pages/PlayerOpponentsPage'
import PlayerProfilePage from '../pages/PlayerProfilePage'
import PlayerTurnosFijosPage from '../pages/PlayerTurnosFijosPage'
import PlayerReservasPage from '../pages/PlayerReservasPage'
import PlayerNotificacionesPage from '../pages/PlayerNotificacionesPage'
import ProfesorDashboardPage from '../pages/ProfesorDashboardPage'
import ProfesorAgendaPage from '../pages/ProfesorAgendaPage'
import ProfesorDisponibilidadPage from '../pages/ProfesorDisponibilidadPage'
import NotFoundPage from '../pages/NotFoundPage'

const router = createBrowserRouter([
  {
    // Rutas públicas con navbar
    element: <PublicLayout />,
    children: [
      { path: '/', element: <LandingPage /> },
    ],
  },
  {
    // Login admin (sin navbar)
    element: <AuthLayout />,
    children: [
      { path: '/login', element: <LoginPage /> },
    ],
  },
  {
    // Área jugadores: auth pública + dashboard protegido
    path: '/dashboardJugadores',
    children: [
      // /dashboardJugadores → login (público)
      { index: true, element: <PlayerAuthPage /> },
      // /dashboardJugadores/registro → registro dedicado (público)
      { path: 'registro', element: <PlayerRegisterPage /> },
      // /dashboardJugadores/* → área protegida con PlayerLayout
      {
        element: <PlayerLayout />,
        children: [
          { path: 'dashboard',      element: <PlayerDashboardPage /> },
          { path: 'reservas',       element: <PlayerReservasPage /> },
          { path: 'estadisticas',   element: <PlayerStatsPage /> },
          { path: 'torneos',        element: <PlayerTournamentsPage /> },
          { path: 'oponentes',      element: <PlayerOpponentsPage /> },
          { path: 'turnos-fijos',   element: <PlayerTurnosFijosPage /> },
          { path: 'perfil',         element: <PlayerProfilePage /> },
          { path: 'notificaciones', element: <PlayerNotificacionesPage /> },
        ],
      },
    ],
  },
  {
    // Dashboard admin protegido
    path: '/dashboardAdmin',
    element: <AdminDashboardLayout />,
    children: [
      { index: true, element: <AdminDashboardPage /> },
      { path: 'club', element: <ClubPage /> },
      { path: 'reservas', element: <ReservasPage /> },
      { path: 'torneos', element: <TorneosPage /> },
      { path: 'pagos', element: <PagosPage /> },
    ],
  },
  {
    // Portal profesores
    path: '/dashboardProfesor',
    children: [
      // /dashboardProfesor → login (público)
      { index: true, element: <ProfesorLoginPage /> },
      // /dashboardProfesor/* → área protegida
      {
        element: <ProfesorLayout />,
        children: [
          { path: 'agenda',          element: <ProfesorAgendaPage /> },
          { path: 'disponibilidad',  element: <ProfesorDisponibilidadPage /> },
        ],
      },
    ],
  },
  // Redirects de rutas viejas → nuevas (compatibilidad)
  { path: '/jugadores',           element: <Navigate to="/dashboardJugadores" replace /> },
  { path: '/jugadores/*',         element: <Navigate to="/dashboardJugadores" replace /> },
  { path: '/dashboard',           element: <Navigate to="/dashboardAdmin" replace /> },
  { path: '/dashboard/*',         element: <Navigate to="/dashboardAdmin" replace /> },

  {
    path: '*',
    element: <NotFoundPage />,
  },
])

export default router
