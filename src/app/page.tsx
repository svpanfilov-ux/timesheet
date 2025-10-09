import { useAuth } from '@/components/auth-provider'
import { ProtectedRoute } from '@/components/protected-route'
import { MainLayout } from '@/components/main-layout'
import { useLocation } from 'wouter'
import { useEffect } from 'react'

export default function Home() {
  const { user, isLoading } = useAuth()
  const [, setLocation] = useLocation()

  useEffect(() => {
    if (!isLoading && !user) {
      setLocation('/login')
    }
  }, [user, isLoading, setLocation])

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

  return (
    <ProtectedRoute>
      <MainLayout>
        {/* Контент будет управляться внутри MainLayout */}
      </MainLayout>
    </ProtectedRoute>
  )
}