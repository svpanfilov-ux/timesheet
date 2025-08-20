'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useToast } from '@/hooks/use-toast'
import { 
  Plus, 
  Search, 
  ArrowUp, 
  ArrowDown, 
  Edit, 
  Trash2, 
  FileText,
  Calendar,
  ChevronUp,
  ChevronDown
} from 'lucide-react'
import * as Papa from 'papaparse'

interface Employee {
  id: string
  name: string
  position: string
  status: 'active' | 'not_registered' | 'fired'
  terminationDate?: string
  createdAt: string
  updatedAt: string
}

export function EmployeesManagement() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null)
  const [newEmployee, setNewEmployee] = useState({
    name: '',
    position: '',
    status: 'active' as const
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [sortConfig, setSortConfig] = useState<{
    key: keyof Employee | null
    direction: 'asc' | 'desc'
  }>({ key: null, direction: 'asc' })
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [positionFilter, setPositionFilter] = useState<string>('all')
  const { toast } = useToast()

  // Загрузка сотрудников
  useEffect(() => {
    loadEmployees()
  }, [])

  // Фильтрация и сортировка сотрудников
  useEffect(() => {
    let filtered = [...employees]

    // Фильтр по статусу
    if (statusFilter !== 'all') {
      filtered = filtered.filter(employee => employee.status === statusFilter)
    }

    // Фильтр по должности
    if (positionFilter !== 'all') {
      filtered = filtered.filter(employee => employee.position === positionFilter)
    }

    // Поиск по имени или должности
    if (searchTerm) {
      filtered = filtered.filter(employee =>
        employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        employee.position.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Сортировка
    if (sortConfig.key) {
      filtered.sort((a, b) => {
        // Для уволенных сотрудников всегда отправляем в конец
        if (a.status === 'fired' && b.status !== 'fired') return 1
        if (a.status !== 'fired' && b.status === 'fired') return -1
        
        // Если оба уволены или оба не уволены, сортируем по выбранному полю
        if (sortConfig.key) {
          const aValue = a[sortConfig.key!]
          const bValue = b[sortConfig.key!]
          
          if (aValue < bValue) {
            return sortConfig.direction === 'asc' ? -1 : 1
          }
          if (aValue > bValue) {
            return sortConfig.direction === 'asc' ? 1 : -1
          }
        }
        return 0
      })
    } else {
      // Сортировка по умолчанию: уволенные в конце
      filtered.sort((a, b) => {
        if (a.status === 'fired' && b.status !== 'fired') return 1
        if (a.status !== 'fired' && b.status === 'fired') return -1
        return 0
      })
    }

    setFilteredEmployees(filtered)
  }, [employees, searchTerm, sortConfig, statusFilter, positionFilter])

  const handleSort = (key: keyof Employee) => {
    let direction: 'asc' | 'desc' = 'asc'
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc'
    }
    setSortConfig({ key, direction })
  }

  const getSortIcon = (key: keyof Employee) => {
    if (sortConfig.key !== key) {
      return <ChevronUp className="w-4 h-4 opacity-30" />
    }
    return sortConfig.direction === 'asc' 
      ? <ChevronUp className="w-4 h-4" />
      : <ChevronDown className="w-4 h-4" />
  }

  const loadEmployees = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/employees')
      if (response.ok) {
        const data = await response.json()
        setEmployees(data)
      } else {
        setError('Ошибка загрузки сотрудников')
      }
    } catch (err) {
      setError('Ошибка соединения с сервером')
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddEmployee = async () => {
    if (!newEmployee.name || !newEmployee.position) {
      setError('Имя и должность обязательны')
      return
    }

    try {
      const response = await fetch('/api/employees', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newEmployee),
      })

      if (response.ok) {
        await loadEmployees()
        setIsAddDialogOpen(false)
        setNewEmployee({ name: '', position: '', status: 'active' })
        toast({
          title: "Сотрудник добавлен",
          description: "Новый сотрудник успешно добавлен в систему",
        })
      } else {
        const data = await response.json()
        setError(data.error || 'Ошибка добавления сотрудника')
      }
    } catch (err) {
      setError('Ошибка соединения с сервером')
    }
  }

  const handleEditEmployee = async () => {
    if (!editingEmployee) return

    try {
      const response = await fetch(`/api/employees/${editingEmployee.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editingEmployee),
      })

      if (response.ok) {
        await loadEmployees()
        setIsEditDialogOpen(false)
        setEditingEmployee(null)
        toast({
          title: "Сотрудник обновлен",
          description: "Данные сотрудника успешно обновлены",
        })
      } else {
        const data = await response.json()
        setError(data.error || 'Ошибка обновления сотрудника')
      }
    } catch (err) {
      setError('Ошибка соединения с сервером')
    }
  }

  const handleDeleteEmployee = async (id: string) => {
    if (!confirm('Вы уверены, что хотите удалить этого сотрудника?')) return

    try {
      const response = await fetch(`/api/employees/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        await loadEmployees()
        toast({
          title: "Сотрудник удален",
          description: "Сотрудник успешно удален из системы",
        })
      } else {
        const data = await response.json()
        setError(data.error || 'Ошибка удаления сотрудника')
      }
    } catch (err) {
      setError('Ошибка соединения с сервером')
    }
  }

  const handleFireEmployee = async (employee: Employee) => {
    const terminationDate = prompt('Введите дату увольнения (ГГГГ-ММ-ДД):', new Date().toISOString().split('T')[0])
    if (!terminationDate) return

    try {
      const response = await fetch(`/api/employees/${employee.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...employee,
          status: 'fired',
          terminationDate
        }),
      })

      if (response.ok) {
        await loadEmployees()
        toast({
          title: "Сотрудник уволен",
          description: "Статус сотрудника изменен на 'Уволен'",
        })
      } else {
        const data = await response.json()
        setError(data.error || 'Ошибка увольнения сотрудника')
      }
    } catch (err) {
      setError('Ошибка соединения с сервером')
    }
  }

  const handleImportCSV = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const employeesData = results.data.map((row: any) => ({
            name: row.Name || row.name || '',
            position: row.Position || row.position || '',
            status: (row.Status || row.status || 'active').toLowerCase()
          }))

          const response = await fetch('/api/employees/import', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ employees: employeesData }),
          })

          if (response.ok) {
            await loadEmployees()
            toast({
              title: "Импорт завершен",
              description: `Импортировано ${employeesData.length} сотрудников`,
            })
          } else {
            const data = await response.json()
            setError(data.error || 'Ошибка импорта')
          }
        } catch (err) {
          setError('Ошибка импорта файла')
        }
      },
      error: (error) => {
        setError('Ошибка parsing CSV файла')
      }
    })
  }

  const handleExportCSV = () => {
    const csv = Papa.unparse(employees.map(emp => ({
      Name: emp.name,
      Position: emp.position,
      Status: emp.status === 'active' ? 'Активный' : emp.status === 'not_registered' ? 'Подработка' : 'Уволен',
      'Termination Date': emp.terminationDate || ''
    })))

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `employees_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const getStatusBadge = (status: string, terminationDate?: string) => {
    const formatDate = (dateString?: string) => {
      if (!dateString) return ''
      const date = new Date(dateString)
      const day = date.getDate().toString().padStart(2, '0')
      const month = (date.getMonth() + 1).toString().padStart(2, '0')
      const year = date.getFullYear().toString().slice(-2)
      return `${day}.${month}.${year}`
    }

    switch (status) {
      case 'active':
        return <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-200">Активный</Badge>
      case 'not_registered':
        return <Badge variant="secondary">Подработка</Badge>
      case 'fired':
        const formattedDate = formatDate(terminationDate)
        return (
          <div className="flex flex-col">
            <Badge variant="destructive">Уволен</Badge>
            {formattedDate && (
              <span className="text-xs text-gray-500 mt-1">{formattedDate}</span>
            )}
          </div>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
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
      {/* Заголовок и действия */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Управление сотрудниками</h2>
          <p className="text-gray-600">Добавление, редактирование и управление списком сотрудников</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={handleExportCSV}>
            <ArrowUp className="w-4 h-4 mr-2" />
            Экспорт
          </Button>
          <input
            type="file"
            accept=".csv"
            onChange={handleImportCSV}
            className="hidden"
            id="import-csv"
          />
          <Button
            variant="outline"
            onClick={() => document.getElementById('import-csv')?.click()}
          >
            <ArrowDown className="w-4 h-4 mr-2" />
            Импорт
          </Button>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Добавить
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Добавление сотрудника</DialogTitle>
                <DialogDescription>
                  Заполните данные нового сотрудника
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                <div>
                  <Label htmlFor="name">ФИО</Label>
                  <Input
                    id="name"
                    value={newEmployee.name}
                    onChange={(e) => setNewEmployee({ ...newEmployee, name: e.target.value })}
                    placeholder="Иванов Иван Иванович"
                  />
                </div>
                <div>
                  <Label htmlFor="position">Должность</Label>
                  <Input
                    id="position"
                    value={newEmployee.position}
                    onChange={(e) => setNewEmployee({ ...newEmployee, position: e.target.value })}
                    placeholder="Уборщик"
                  />
                </div>
                <div>
                  <Label htmlFor="status">Статус</Label>
                  <Select value={newEmployee.status} onValueChange={(value) => setNewEmployee({ ...newEmployee, status: value as any })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Активный</SelectItem>
                      <SelectItem value="not_registered">Подработка</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Отмена
                </Button>
                <Button onClick={handleAddEmployee}>Добавить</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Поиск и фильтры */}
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Поиск по имени или должности..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <div className="flex space-x-4">
          <div className="flex-1">
            <Label htmlFor="status-filter">Фильтр по статусу</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все статусы</SelectItem>
                <SelectItem value="active">Активные</SelectItem>
                <SelectItem value="not_registered">Подработка</SelectItem>
                <SelectItem value="fired">Уволенные</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex-1">
            <Label htmlFor="position-filter">Фильтр по должности</Label>
            <Select value={positionFilter} onValueChange={setPositionFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все должности</SelectItem>
                {Array.from(new Set(employees.map(e => e.position))).map(position => (
                  <SelectItem key={position} value={position}>{position}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Таблица сотрудников */}
      <Card>
        <CardHeader>
          <CardTitle>Список сотрудников</CardTitle>
          <CardDescription>
            Всего сотрудников: {employees.length} | Активных: {employees.filter(e => e.status === 'active').length}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead 
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center space-x-1">
                    <span>ФИО</span>
                    {getSortIcon('name')}
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => handleSort('position')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Должность</span>
                    {getSortIcon('position')}
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => handleSort('status')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Статус</span>
                    {getSortIcon('status')}
                  </div>
                </TableHead>
                <TableHead>Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEmployees.map((employee) => (
                <TableRow 
                  key={employee.id}
                  className={employee.status === 'fired' ? 'opacity-50 text-gray-500' : ''}
                >
                  <TableCell className={`font-medium ${employee.status === 'fired' ? 'text-gray-400' : ''}`}>
                    {employee.name}
                  </TableCell>
                  <TableCell className={employee.status === 'fired' ? 'text-gray-400' : ''}>
                    {employee.position}
                  </TableCell>
                  <TableCell className={employee.status === 'fired' ? 'text-gray-400' : ''}>
                    {getStatusBadge(employee.status, employee.terminationDate)}
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingEmployee(employee)
                          setIsEditDialogOpen(true)
                        }}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteEmployee(employee.id)}
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
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Редактирование сотрудника</DialogTitle>
            <DialogDescription>
              Измените данные сотрудника
            </DialogDescription>
          </DialogHeader>
          {editingEmployee && (
            <div className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <div>
                <Label htmlFor="edit-name">ФИО</Label>
                <Input
                  id="edit-name"
                  value={editingEmployee.name}
                  onChange={(e) => setEditingEmployee({ ...editingEmployee, name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-position">Должность</Label>
                <Input
                  id="edit-position"
                  value={editingEmployee.position}
                  onChange={(e) => setEditingEmployee({ ...editingEmployee, position: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-status">Статус</Label>
                <Select 
                  value={editingEmployee.status} 
                  onValueChange={(value) => setEditingEmployee({ ...editingEmployee, status: value as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Активный</SelectItem>
                    <SelectItem value="not_registered">Подработка</SelectItem>
                    <SelectItem value="fired">Уволен</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {editingEmployee.status === 'fired' && (
                <div>
                  <Label htmlFor="edit-termination-date">Дата увольнения</Label>
                  <Input
                    id="edit-termination-date"
                    type="date"
                    value={editingEmployee.terminationDate || ''}
                    onChange={(e) => setEditingEmployee({ ...editingEmployee, terminationDate: e.target.value })}
                  />
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleEditEmployee}>Сохранить</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}