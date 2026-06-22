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
import TorneoDetallePage from '../pages/TorneoDetallePage'
import PagosPage from '../pages/PagosPage'
import PlayerDashboardPage from '../pages/PlayerDashboardPage'
import PlayerRegisterPage from '../pages/PlayerRegisterPage'
import PlayerStatsPage from '../pages/PlayerStatsPage'
import PlayerTournamentsPage from '../pages/PlayerTournamentsPage'
import PlayerProfilePage from '../pages/PlayerProfilePage'
import PlayerTurnosFijosPage from '../pages/PlayerTurnosFijosPage'
import PlayerReservasPage from '../pages/PlayerReservasPage'
import PlayerMisReservasPage from '../pages/PlayerMisReservasPage'
import PlayerPagosPage from '../pages/PlayerPagosPage'
import PlayerNotificacionesPage from '../pages/PlayerNotificacionesPage'
import ProfesorDashboardPage from '../pages/ProfesorDashboardPage'
import ProfesorAgendaPage from '../pages/ProfesorAgendaPage'
import ProfesorDisponibilidadPage from '../pages/ProfesorDisponibilidadPage'
import TorneoPublicoPage from '../pages/TorneoPublicoPage'
import TorneosPublicosPage from '../pages/TorneosPublicosPage'
import EventosPage from '../pages/EventosPage'
import JugadoresAdminPage from '../pages/JugadoresAdminPage'
import ClasesProfesorAdminPage from '../pages/ClasesProfesorAdminPage'
import AdminSponsorsPage from '../pages/AdminSponsorsPage'
import AdminReservasLayout from '../layouts/AdminReservasLayout'
import AdminReservasEstadisticasPage from '../pages/AdminReservasEstadisticasPage'
import NotFoundPage from '../pages/NotFoundPage'
import EquipoAdminPage from '../pages/EquipoAdminPage'
import PadelwiarkLanding from '../pages/padelwiark/PadelwiarkLanding'
import PlataformaPage from '../pages/padelwiark/admin/PlataformaPage'
import PwRegistro from '../pages/padelwiark/PwRegistro'

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
          { path: 'turnos-fijos',   element: <PlayerTurnosFijosPage /> },
          { path: 'mis-reservas',   element: <PlayerMisReservasPage /> },
          { path: 'mis-pagos',      element: <PlayerPagosPage /> },
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
      {
        path: 'reservas',
        element: <AdminReservasLayout />,
        children: [
          { index: true, element: <ReservasPage /> },
          { path: 'estadisticas', element: <AdminReservasEstadisticasPage /> },
        ],
      },
      { path: 'torneos', element: <TorneosPage /> },
      { path: 'torneos/:id', element: <TorneoDetallePage /> },
      { path: 'pagos', element: <PagosPage /> },
      { path: 'jugadores', element: <JugadoresAdminPage /> },
      { path: 'clases', element: <ClasesProfesorAdminPage /> },
      { path: 'sponsors', element: <AdminSponsorsPage /> },
      { path: 'equipo', element: <EquipoAdminPage /> },
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
          { path: 'dashboard',       element: <ProfesorDashboardPage /> },
          { path: 'agenda',          element: <ProfesorAgendaPage /> },
          { path: 'disponibilidad',  element: <ProfesorDisponibilidadPage /> },
        ],
      },
    ],
  },
  // Landing de ventas de PadelwIArk (web comercial — sin layout del club)
  { path: '/padelwiark', element: <PadelwiarkLanding /> },
  // Alta self-service de club (pública)
  { path: '/padelwiark/registro', element: <PwRegistro /> },
  // Panel del super-admin (4to rol — dueño de la plataforma)
  { path: '/plataforma', element: <PlataformaPage /> },

  // Ruta pública del torneo (seguimiento sin login)
  { path: '/torneos', element: <TorneosPublicosPage /> },
  { path: '/torneos/:id', element: <TorneoPublicoPage /> },

  // Herramienta pública self-service: Americano / Super 8 (sin login)
  { path: '/eventos', element: <EventosPage /> },

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
