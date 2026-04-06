import { Link } from 'react-router-dom'

const NotFoundPage = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 gap-4">
      <h1 className="text-6xl font-bold text-gray-300">404</h1>
      <p className="text-gray-600">Página no encontrada</p>
      <Link to="/" className="text-blue-600 hover:underline">
        Volver al inicio
      </Link>
    </div>
  )
}

export default NotFoundPage
