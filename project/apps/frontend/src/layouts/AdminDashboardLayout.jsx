import { Outlet, Navigate } from 'react-router-dom'
import useAuthStore from '../store/authStore'
import Sidebar from '../components/ui/Sidebar'
import Navbar from '../components/ui/Navbar'
import usePageTitle from '../hooks/usePageTitle'

const DashboardLayout = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const title = usePageTitle()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar />

      {/* Contenido principal desplazado por el ancho del sidebar */}
      <div className="flex-1 flex flex-col ml-60">
        <Navbar title={title} />
        <main className="flex-1 p-6 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default DashboardLayout
