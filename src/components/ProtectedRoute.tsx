import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export const ProtectedRoute = () => {
  const { loading, user } = useAuth()
  const location = useLocation()

  if (loading) {
    return <div className="page"><p>Lade Sitzung …</p></div>
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return <Outlet />
}
