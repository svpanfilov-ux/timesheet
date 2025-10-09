import { useEffect } from 'react'
import { useLocation } from 'wouter'
import { useAuth } from './auth-provider'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRole?: string
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth()
  const [, setLocation] = useLocation()

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        setLocation('/login')
        return
      }

      if (requiredRole && user.role !== requiredRole) {
        setLocation('/login')
        return
      }
    }
  }, [user, isLoading, requiredRole, setLocation])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  if (requiredRole && user.role !== requiredRole) {
    return null
  }

  return <>{children}</>
}