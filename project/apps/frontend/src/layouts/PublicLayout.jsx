import { Outlet } from 'react-router-dom'
import PublicNavbar from '../components/ui/PublicNavbar'

const PublicLayout = () => {
  return (
    <div className="public-font">
      <PublicNavbar />
      <Outlet />
    </div>
  )
}

export default PublicLayout
