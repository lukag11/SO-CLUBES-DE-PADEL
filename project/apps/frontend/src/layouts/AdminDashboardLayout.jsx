import { useState, useEffect, useRef } from 'react'
import { Outlet, Navigate, useLocation } from 'react-router-dom'
import useAuthStore from '../store/authStore'
import useNotificacionesStore from '../store/notificacionesStore'
import useClubStore from '../store/clubStore'
import useTurnosFijosStore from '../store/turnosFijosStore'
import Sidebar from '../components/ui/Sidebar'
import Navbar from '../components/ui/Navbar'
import AsistenteWiark from '../components/asistente/AsistenteWiark'
import AsistenteBienvenida from '../components/asistente/AsistenteBienvenida'
import usePageTitle from '../hooks/usePageTitle'
import { api } from '../lib/api'
import { trackEvento } from '../lib/telemetria'

const DashboardLayout = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const token = useAuthStore((s) => s.token)
  const setUser = useAuthStore((s) => s.setUser)
  const loadFromBackend = useClubStore((s) => s.loadFromBackend)
  const clubLoaded = useClubStore((s) => s._loaded)
  const canchasReales = useClubStore((s) => s._canchasReales)
  const onboardingCompletado = useClubStore((s) => s.club.onboardingCompletado)
  const esDueno = useAuthStore((s) => s.user?.rol) !== 'staff' // owner o sin definir = dueño
  const setTurnosFijos = useTurnosFijosStore((s) => s.setTurnosFijos)
  const fetchNotificaciones = useNotificacionesStore((s) => s.fetchNotificaciones)
  const title = usePageTitle()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Onboarding: se decide UNA sola vez, cuando el club termina de cargar del backend. Si el dueño
  // entra a un club recién creado (0 canchas reales y sin onboarding hecho) → wizard de bienvenida.
  // Decidir una vez evita que el wizard se cierre solo a mitad de guardar (aplicarOnboarding marca
  // el flag antes de persistir). El descarte lo controla onDone.
  const [showOnboarding, setShowOnboarding] = useState(false)
  const onboardingDecidido = useRef(false)
  useEffect(() => {
    if (!clubLoaded || onboardingDecidido.current) return
    onboardingDecidido.current = true
    if (esDueno && canchasReales === 0 && !onboardingCompletado) setShowOnboarding(true)
  }, [clubLoaded, canchasReales, onboardingCompletado, esDueno])

  // Carga datos actualizados del admin desde el backend
  useEffect(() => {
    if (!token) return
    api.get('/auth/admin/me', { Authorization: `Bearer ${token}` })
      .then((data) => { if (data?.id) setUser(data) })
      .catch(() => {})
  }, [token])

  // Carga config del club desde el backend al montar el layout (con canchas reales)
  useEffect(() => {
    if (!token) return
    api.get('/clubs/me', { Authorization: `Bearer ${token}` })
      .then((data) => { if (data?.id) loadFromBackend(data) })
      .catch(() => {})
  }, [token])

  // Carga turnos fijos del club + polling cada 30s
  useEffect(() => {
    if (!token) return
    const fetch = () =>
      api.get('/turnos-fijos', { Authorization: `Bearer ${token}` })
        .then((data) => { if (Array.isArray(data)) setTurnosFijos(data) })
        .catch(() => {})
    fetch()
    const interval = setInterval(() => { if (!document.hidden) fetch() }, 30_000)
    const onFocus = () => fetch()
    window.addEventListener('focus', onFocus)
    return () => { clearInterval(interval); window.removeEventListener('focus', onFocus) }
  }, [token])

  // Carga notificaciones admin desde backend + polling cada 30s
  useEffect(() => {
    if (!token) return
    fetchNotificaciones(token)
    const interval = setInterval(() => { if (!document.hidden) fetchNotificaciones(token) }, 30_000)
    const onFocus = () => fetchNotificaciones(token)
    window.addEventListener('focus', onFocus)
    return () => { clearInterval(interval); window.removeEventListener('focus', onFocus) }
  }, [token])

  // Telemetría: registra cada pantalla del dashboard que abre el admin (para el
  // agente de onboarding). Fire-and-forget; nunca afecta la navegación.
  useEffect(() => {
    if (!token) return
    trackEvento('pantalla', location.pathname)
  }, [location.pathname, token])

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  // Bienvenida a pantalla completa (sin sidebar/navbar) para el club recién creado.
  if (showOnboarding) {
    return <AsistenteBienvenida onDone={() => setShowOnboarding(false)} />
  }

  return (
    <div className="h-screen bg-slate-50 flex overflow-hidden">
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <Sidebar
        mobileOpen={sidebarOpen}
        onMobileClose={() => setSidebarOpen(false)}
      />
      <div className="flex-1 min-w-0 flex flex-col h-full lg:ml-16">
        <Navbar title={title} onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 p-4 md:p-6 overflow-y-auto overflow-x-hidden">
          {!clubLoaded ? (
            <div className="flex flex-col gap-4 animate-pulse">
              <div className="h-8 w-48 rounded-xl bg-slate-200" />
              <div className="h-4 w-72 rounded-lg bg-slate-100" />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
                {[1, 2, 3].map((i) => <div key={i} className="h-32 rounded-2xl bg-slate-100" />)}
              </div>
              <div className="h-64 rounded-2xl bg-slate-100" />
            </div>
          ) : (
            <Outlet />
          )}
        </main>
      </div>
      <AsistenteWiark />
    </div>
  )
}

export default DashboardLayout
