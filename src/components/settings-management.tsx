'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useToast } from '@/hooks/use-toast'
import { 
  Settings, 
  Save, 
  Plus, 
  Edit, 
  Trash2, 
  Download,
  Upload,
  Users,
  Clock,
  FileText,
  Bell,
  Database,
  Shield
} from 'lucide-react'
import Papa from 'papaparse'

interface PositionRate {
  id: string
  position: string
  hourlyRate: number
  areaNorm?: number
  createdAt: string
  updatedAt: string
}

interface SystemSettings {
  advanceDeadline: number // День месяца для закрытия аванса
  salaryDeadline: number // День месяца для закрытия зарплаты
  workingHoursPerDay: number // Норма рабочих часов в день
  notificationDays: number // За сколько дней напоминать о закрытии
  enableNotifications: boolean
  timezone: string
}

export function SettingsManagement() {
  const [positionRates, setPositionRates] = useState<PositionRate[]>([])
  const [systemSettings, setSystemSettings] = useState<SystemSettings>({
    advanceDeadline: 15,
    salaryDeadline: 1,
    workingHoursPerDay: 8,
    notificationDays: 3,
    enableNotifications: true,
    timezone: 'Europe/Moscow'
  })
  const [isAddRateDialogOpen, setIsAddRateDialogOpen] = useState(false)
  const [isEditRateDialogOpen, setIsEditRateDialogOpen] = useState(false)
  const [editingRate, setEditingRate] = useState<PositionRate | null>(null)
  const [newRate, setNewRate] = useState({
    position: '',
    hourlyRate: '',
    areaNorm: ''
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<'rates' | 'system' | 'notifications'>('rates')
  const { toast } = useToast()

  // Загрузка данных
  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setIsLoading(true)
    try {
      const [ratesRes] = await Promise.all([
        fetch('/api/position-rates')
      ])

      if (ratesRes.ok) {
        const ratesData = await ratesRes.json()
        setPositionRates(ratesData)
      } else {
        setError('Ошибка загрузки данных')
      }
    } catch (err) {
      setError('Ошибка соединения с сервером')
    } finally {
      setIsLoading(false)
    }
  }

  // Добавление ставки
  const handleAddRate = async () => {
    if (!newRate.position || !newRate.hourlyRate) {
      setError('Должность и ставка обязательны')
      return
    }

    try {
      const response = await fetch('/api/position-rates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          position: newRate.position,
          hourlyRate: parseFloat(newRate.hourlyRate),
          areaNorm: newRate.areaNorm ? parseFloat(newRate.areaNorm) : null
        }),
      })

      if (response.ok) {
        await loadData()
        setIsAddRateDialogOpen(false)
        setNewRate({ position: '', hourlyRate: '', areaNorm: '' })
        toast({
          title: "Ставка добавлена",
          description: "Новая ставка успешно добавлена",
        })
      } else {
        const data = await response.json()
        setError(data.error || 'Ошибка добавления ставки')
      }
    } catch (err) {
      setError('Ошибка соединения с сервером')
    }
  }

  // Редактирование ставки
  const handleEditRate = async () => {
    if (!editingRate) return

    try {
      const response = await fetch(`/api/position-rates/${editingRate.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          position: editingRate.position,
          hourlyRate: editingRate.hourlyRate,
          areaNorm: editingRate.areaNorm
        }),
      })

      if (response.ok) {
        await loadData()
        setIsEditRateDialogOpen(false)
        setEditingRate(null)
        toast({
          title: "Ставка обновлена",
          description: "Данные ставки успешно обновлены",
        })
      } else {
        const data = await response.json()
        setError(data.error || 'Ошибка обновления ставки')
      }
    } catch (err) {
      setError('Ошибка соединения с сервером')
    }
  }

  // Удаление ставки
  const handleDeleteRate = async (id: string) => {
    if (!confirm('Вы уверены, что хотите удалить эту ставку?')) return

    try {
      const response = await fetch(`/api/position-rates/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        await loadData()
        toast({
          title: "Ставка удалена",
          description: "Ставка успешно удалена",
        })
      } else {
        const data = await response.json()
        setError(data.error || 'Ошибка удаления ставки')
      }
    } catch (err) {
      setError('Ошибка соединения с сервером')
    }
  }

  // Сохранение системных настроек
  const handleSaveSystemSettings = async () => {
    try {
      // В реальном приложении здесь будет API вызов
      localStorage.setItem('systemSettings', JSON.stringify(systemSettings))
      
      toast({
        title: "Настройки сохранены",
        description: "Системные настройки успешно обновлены",
      })
    } catch (err) {
      setError('Ошибка сохранения настроек')
    }
  }

  // Импорт ставок из CSV
  const handleImportRates = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const ratesData = results.data.map((row: any) => ({
            position: row.Position || row.position || '',
            hourlyRate: parseFloat(row.Rate || row.rate || 0),
            areaNorm: row.Norm ? parseFloat(row.Norm) : null
          }))

          // Импортируем каждую ставку
          for (const rate of ratesData) {
            if (rate.position && rate.hourlyRate > 0) {
              await fetch('/api/position-rates', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(rate)
              })
            }
          }

          await loadData()
          toast({
            title: "Импорт завершен",
            description: `Импортировано ${ratesData.length} ставок`,
          })
        } catch (err) {
          setError('Ошибка импорта файла')
        }
      },
      error: (error) => {
        setError('Ошибка parsing CSV файла')
      }
    })
  }

  // Экспорт ставок в CSV
  const handleExportRates = () => {
    const csv = Papa.unparse(positionRates.map(rate => ({
      Position: rate.position,
      Rate: rate.hourlyRate,
      Norm: rate.areaNorm || ''
    })))

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `position_rates_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Настройки</h2>
        <p className="text-gray-600">Конфигурация системы и параметров</p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Вкладки */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('rates')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'rates'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Clock className="w-4 h-4 inline mr-2" />
            Ставки
          </button>
          <button
            onClick={() => setActiveTab('system')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'system'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Settings className="w-4 h-4 inline mr-2" />
            Система
          </button>
          <button
            onClick={() => setActiveTab('notifications')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'notifications'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Bell className="w-4 h-4 inline mr-2" />
            Уведомления
          </button>
        </nav>
      </div>

      {/* Содержимое вкладок */}
      {activeTab === 'rates' && (
        <div className="space-y-6">
          {/* Заголовок и действия */}
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-medium text-gray-900">Ставки по должностям</h3>
              <p className="text-sm text-gray-500">Управление часовыми ставками для должностей</p>
            </div>
            <div className="flex space-x-2">
              <input
                type="file"
                accept=".csv"
                onChange={handleImportRates}
                className="hidden"
                id="import-rates"
              />
              <Button
                variant="outline"
                onClick={() => document.getElementById('import-rates')?.click()}
              >
                <Upload className="w-4 h-4 mr-2" />
                Импорт
              </Button>
              <Button variant="outline" onClick={handleExportRates}>
                <Download className="w-4 h-4 mr-2" />
                Экспорт
              </Button>
              <Dialog open={isAddRateDialogOpen} onOpenChange={setIsAddRateDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Добавить
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Добавление ставки</DialogTitle>
                    <DialogDescription>
                      Укажите должность и часовую ставку
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    {error && (
                      <Alert variant="destructive">
                        <AlertDescription>{error}</AlertDescription>
                      </Alert>
                    )}
                    <div>
                      <Label htmlFor="position">Должность</Label>
                      <Input
                        id="position"
                        value={newRate.position}
                        onChange={(e) => setNewRate({ ...newRate, position: e.target.value })}
                        placeholder="Уборщик"
                      />
                    </div>
                    <div>
                      <Label htmlFor="hourlyRate">Часовая ставка (руб.)</Label>
                      <Input
                        id="hourlyRate"
                        type="number"
                        step="0.01"
                        value={newRate.hourlyRate}
                        onChange={(e) => setNewRate({ ...newRate, hourlyRate: e.target.value })}
                        placeholder="150.00"
                      />
                    </div>
                    <div>
                      <Label htmlFor="areaNorm">Норма площади (м²)</Label>
                      <Input
                        id="areaNorm"
                        type="number"
                        step="0.01"
                        value={newRate.areaNorm}
                        onChange={(e) => setNewRate({ ...newRate, areaNorm: e.target.value })}
                        placeholder="500"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsAddRateDialogOpen(false)}>
                      Отмена
                    </Button>
                    <Button onClick={handleAddRate}>Добавить</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Таблица ставок */}
          <Card>
            <CardHeader>
              <CardTitle>Список ставок</CardTitle>
              <CardDescription>
                Всего ставок: {positionRates.length}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Должность</TableHead>
                    <TableHead>Часовая ставка</TableHead>
                    <TableHead>Норма площади</TableHead>
                    <TableHead>Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {positionRates.map((rate) => (
                    <TableRow key={rate.id}>
                      <TableCell className="font-medium">{rate.position}</TableCell>
                      <TableCell>{rate.hourlyRate.toFixed(2)} руб.</TableCell>
                      <TableCell>{rate.areaNorm ? `${rate.areaNorm} м²` : '-'}</TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditingRate(rate)
                              setIsEditRateDialogOpen(true)
                            }}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteRate(rate.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Диалог редактирования */}
          <Dialog open={isEditRateDialogOpen} onOpenChange={setIsEditRateDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Редактирование ставки</DialogTitle>
                <DialogDescription>
                  Измените данные ставки
                </DialogDescription>
              </DialogHeader>
              {editingRate && (
                <div className="space-y-4">
                  {error && (
                    <Alert variant="destructive">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}
                  <div>
                    <Label htmlFor="edit-position">Должность</Label>
                    <Input
                      id="edit-position"
                      value={editingRate.position}
                      onChange={(e) => setEditingRate({ ...editingRate, position: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-hourly-rate">Часовая ставка (руб.)</Label>
                    <Input
                      id="edit-hourly-rate"
                      type="number"
                      step="0.01"
                      value={editingRate.hourlyRate}
                      onChange={(e) => setEditingRate({ ...editingRate, hourlyRate: parseFloat(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-area-norm">Норма площади (м²)</Label>
                    <Input
                      id="edit-area-norm"
                      type="number"
                      step="0.01"
                      value={editingRate.areaNorm || ''}
                      onChange={(e) => setEditingRate({ 
                        ...editingRate, 
                        areaNorm: e.target.value ? parseFloat(e.target.value) : null 
                      })}
                    />
                  </div>
                </div>
              )}
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsEditRateDialogOpen(false)}>
                  Отмена
                </Button>
                <Button onClick={handleEditRate}>Сохранить</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {activeTab === 'system' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Settings className="w-5 h-5 mr-2" />
                Системные настройки
              </CardTitle>
              <CardDescription>
                Основные параметры работы системы
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="advance-deadline">День закрытия аванса</Label>
                  <Select 
                    value={systemSettings.advanceDeadline.toString()} 
                    onValueChange={(value) => setSystemSettings({ ...systemSettings, advanceDeadline: parseInt(value) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                        <SelectItem key={day} value={day.toString()}>
                          {day} числа
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="salary-deadline">День закрытия зарплаты</Label>
                  <Select 
                    value={systemSettings.salaryDeadline.toString()} 
                    onValueChange={(value) => setSystemSettings({ ...systemSettings, salaryDeadline: parseInt(value) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                        <SelectItem key={day} value={day.toString()}>
                          {day} числа
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="working-hours">Рабочих часов в день</Label>
                  <Input
                    id="working-hours"
                    type="number"
                    min="1"
                    max="24"
                    value={systemSettings.workingHoursPerDay}
                    onChange={(e) => setSystemSettings({ 
                      ...systemSettings, 
                      workingHoursPerDay: parseInt(e.target.value) 
                    })}
                  />
                </div>

                <div>
                  <Label htmlFor="notification-days">Напоминать за (дней)</Label>
                  <Input
                    id="notification-days"
                    type="number"
                    min="1"
                    max="30"
                    value={systemSettings.notificationDays}
                    onChange={(e) => setSystemSettings({ 
                      ...systemSettings, 
                      notificationDays: parseInt(e.target.value) 
                    })}
                  />
                </div>

                <div>
                  <Label htmlFor="timezone">Часовой пояс</Label>
                  <Select 
                    value={systemSettings.timezone} 
                    onValueChange={(value) => setSystemSettings({ ...systemSettings, timezone: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Europe/Moscow">Москва (UTC+3)</SelectItem>
                      <SelectItem value="Europe/Samara">Самара (UTC+4)</SelectItem>
                      <SelectItem value="Asia/Yekaterinburg">Екатеринбург (UTC+5)</SelectItem>
                      <SelectItem value="Asia/Omsk">Омск (UTC+6)</SelectItem>
                      <SelectItem value="Asia/Krasnoyarsk">Красноярск (UTC+7)</SelectItem>
                      <SelectItem value="Asia/Irkutsk">Иркутск (UTC+8)</SelectItem>
                      <SelectItem value="Asia/Yakutsk">Якутск (UTC+9)</SelectItem>
                      <SelectItem value="Asia/Vladivostok">Владивосток (UTC+10)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSaveSystemSettings}>
                  <Save className="w-4 h-4 mr-2" />
                  Сохранить настройки
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'notifications' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Bell className="w-5 h-5 mr-2" />
                Настройки уведомлений
              </CardTitle>
              <CardDescription>
                Управление уведомлениями и напоминаниями
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Включить уведомления</h4>
                  <p className="text-sm text-gray-500">Получать напоминания о сроках закрытия периодов</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer"
                    checked={systemSettings.enableNotifications}
                    onChange={(e) => setSystemSettings({ 
                      ...systemSettings, 
                      enableNotifications: e.target.checked 
                    })}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className="border-t pt-6">
                <h4 className="font-medium mb-4">Типы уведомлений</h4>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h5 className="font-medium">Напоминание о закрытии аванса</h5>
                      <p className="text-sm text-gray-500">За {systemSettings.notificationDays} дней до срока</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" defaultChecked />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <h5 className="font-medium">Напоминание о закрытии зарплаты</h5>
                      <p className="text-sm text-gray-500">За {systemSettings.notificationDays} дней до срока</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" defaultChecked />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <h5 className="font-medium">Уведомление о новых сотрудниках</h5>
                      <p className="text-sm text-gray-500">При добавлении новых сотрудников</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" defaultChecked />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSaveSystemSettings}>
                  <Save className="w-4 h-4 mr-2" />
                  Сохранить настройки
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}