'use client'

import { useState } from 'react'
import { useAuth } from './auth-provider'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { EmployeesManagement } from './employees-management'
import { TimesheetManagement } from './timesheet-management'
import { ReportsManagement } from './reports-management'
import { SettingsManagement } from './settings-management'
import { useOfflineStorage } from '@/lib/offline-storage'
import { useNotifications } from '@/lib/notifications'
import { Wifi, WifiOff, RefreshCw, Bell } from 'lucide-react'
import { 
  Home, 
  Users, 
  Calendar, 
  FileText, 
  Settings,
  LogOut,
  Clock,
  TrendingUp,
  AlertTriangle
} from 'lucide-react'

interface MainLayoutProps {
  children: React.ReactNode
}

export function MainLayout({ children }: MainLayoutProps) {
  const { user, logout } = useAuth()
  const { isOnline, pendingSyncCount, sync } = useOfflineStorage()
  const { notifications, unreadCount, markAllAsRead } = useNotifications()
  const [activeTab, setActiveTab] = useState('dashboard')
  const [isSyncing, setIsSyncing] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)

  const handleSync = async () => {
    setIsSyncing(true)
    try {
      await sync()
    } catch (error) {
      console.error('Sync error:', error)
    } finally {
      setIsSyncing(false)
    }
  }

  const handleNotificationClick = () => {
    setShowNotifications(!showNotifications)
    if (!showNotifications && unreadCount > 0) {
      markAllAsRead()
    }
  }

  const tabs = [
    { id: 'dashboard', label: 'Главное', icon: Home },
    { id: 'employees', label: 'Сотрудники', icon: Users },
    { id: 'timesheet', label: 'Табель', icon: Calendar },
    { id: 'reports', label: 'Отчёты', icon: FileText },
    { id: 'settings', label: 'Настройки', icon: Settings },
  ]

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardContent />
      case 'employees':
        return <EmployeesContent />
      case 'timesheet':
        return <TimesheetContent />
      case 'reports':
        return <ReportsContent />
      case 'settings':
        return <SettingsContent />
      default:
        return <DashboardContent />
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex flex-col">
        {/* Header */}
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Система управления сотрудниками</h1>
                <p className="text-sm text-gray-500">Добро пожаловать, {user?.name || user?.email}</p>
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-sm text-gray-500">
                  Роль: {user?.role === 'admin' ? 'Администратор' : 'Менеджер'}
                </div>
                
                {/* Индикатор сети и синхронизации */}
                <div className="flex items-center space-x-2">
                  <div className="flex items-center space-x-1 text-sm">
                    {isOnline ? (
                      <Wifi className="w-4 h-4 text-green-500" />
                    ) : (
                      <WifiOff className="w-4 h-4 text-red-500" />
                    )}
                    <span className={isOnline ? 'text-green-600' : 'text-red-600'}>
                      {isOnline ? 'Онлайн' : 'Офлайн'}
                    </span>
                  </div>
                  
                  {pendingSyncCount > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSync}
                      disabled={isSyncing || !isOnline}
                    >
                      <RefreshCw className={`w-4 h-4 mr-1 ${isSyncing ? 'animate-spin' : ''}`} />
                      {pendingSyncCount}
                    </Button>
                  )}
                </div>

                {/* Уведомления */}
                <div className="relative">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNotificationClick}
                  >
                    <Bell className="w-4 h-4 mr-1" />
                    {unreadCount > 0 && (
                      <Badge variant="destructive" className="absolute -top-2 -right-2 w-5 h-5 flex items-center justify-center text-xs p-0">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </Badge>
                    )}
                  </Button>
                  
                  {/* Выпадающее меню уведомлений */}
                  {showNotifications && (
                    <div className="absolute right-0 top-full mt-2 w-80 bg-white border rounded-lg shadow-lg z-50">
                      <div className="p-4 border-b">
                        <div className="flex justify-between items-center">
                          <h3 className="font-medium">Уведомления</h3>
                          {unreadCount > 0 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={markAllAsRead}
                            >
                              Отметить все как прочитанные
                            </Button>
                          )}
                        </div>
                      </div>
                      <div className="max-h-96 overflow-y-auto">
                        {notifications.length === 0 ? (
                          <div className="p-4 text-center text-gray-500">
                            Нет уведомлений
                          </div>
                        ) : (
                          notifications.slice(0, 10).map((notification) => (
                            <div
                              key={notification.id}
                              className={`p-4 border-b hover:bg-gray-50 cursor-pointer ${
                                !notification.read ? 'bg-blue-50' : ''
                              }`}
                              onClick={() => {
                                if (notification.actions?.[0]) {
                                  notification.actions[0].action()
                                }
                                setShowNotifications(false)
                              }}
                            >
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <h4 className="font-medium text-sm">{notification.title}</h4>
                                  <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                                  <p className="text-xs text-gray-400 mt-2">
                                    {new Date(notification.timestamp).toLocaleString('ru-RU')}
                                  </p>
                                </div>
                                {!notification.read && (
                                  <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1"></div>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
                
                <Button variant="outline" size="sm" onClick={logout}>
                  <LogOut className="w-4 h-4 mr-2" />
                  Выйти
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* Navigation */}
        <nav className="bg-white border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex space-x-8">
              {tabs.map((tab) => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center space-x-2 py-4 px-1 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <main className="flex-1">
          <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
            <div className="px-4 py-6 sm:px-0">
              {renderContent()}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

function DashboardContent() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Панель управления</h2>
        <p className="text-gray-600">Общая информация и статистика по системе</p>
      </div>

      {/* Карточки статистики */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">До закрытия аванса</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">5 дней</div>
            <p className="text-xs text-muted-foreground">
              Срок: 15 числа
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Активные сотрудники</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">12</div>
            <p className="text-xs text-muted-foreground">
              Всего: 15 сотрудников
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Отработано часов</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">1,847</div>
            <p className="text-xs text-muted-foreground">
              Норма: 2,160 часов
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Оповещения</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">2</div>
            <p className="text-xs text-muted-foreground">
              Требуют внимания
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Дополнительная информация */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Последние действия</CardTitle>
            <CardDescription>Последние операции в системе</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Добавлен новый сотрудник</p>
                  <p className="text-sm text-gray-500">Иванов Иван Иванович</p>
                </div>
                <Badge variant="secondary">2 часа назад</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Отправлен отчет</p>
                  <p className="text-sm text-gray-500">Аванс за ноябрь</p>
                </div>
                <Badge variant="secondary">1 день назад</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Обновлен табель</p>
                  <p className="text-sm text-gray-500">15 записей изменено</p>
                </div>
                <Badge variant="secondary">3 дня назад</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Статус периодов</CardTitle>
            <CardDescription>Текущее состояние отчетных периодов</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Аванс - Ноябрь 2024</p>
                  <p className="text-sm text-gray-500">1-15 ноября</p>
                </div>
                <Badge variant="outline">Открыт</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Зарплата - Октябрь 2024</p>
                  <p className="text-sm text-gray-500">1-31 октября</p>
                </div>
                <Badge variant="default">Отправлен</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Аванс - Октябрь 2024</p>
                  <p className="text-sm text-gray-500">1-15 октября</p>
                </div>
                <Badge variant="default">Отправлен</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function EmployeesContent() {
  return <EmployeesManagement />
}

function TimesheetContent() {
  return <TimesheetManagement />
}

function ReportsContent() {
  return <ReportsManagement />
}

function SettingsContent() {
  return <SettingsManagement />
}