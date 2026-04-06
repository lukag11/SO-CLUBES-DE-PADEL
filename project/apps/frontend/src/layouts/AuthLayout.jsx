import { Outlet, Navigate } from 'react-router-dom'
import useAuthStore from '../store/authStore'

// Layout para rutas públicas: si ya está autenticado, redirige al dashboard
const AuthLayout = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)

  if (isAuthenticated) {
    return <Navigate to="/dashboardAdmin" replace />
  }

  return (
    <div className="min-h-screen bg-white">
      <Outlet />
    </div>
  )
}

export default AuthLayout
