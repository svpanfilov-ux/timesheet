'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useToast } from '@/hooks/use-toast'
import { format, startOfMonth, endOfMonth, subMonths, isAfter, isBefore } from 'date-fns'
import { ru } from 'date-fns/locale'
import { 
  FileText, 
  Download, 
  Send, 
  Calendar,
  CheckCircle,
  Clock,
  AlertTriangle,
  Eye,
  Edit,
  Trash2
} from 'lucide-react'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'

interface Report {
  id: string
  type: 'advance' | 'salary'
  period: string
  startDate: string
  endDate: string
  data: string
  status: 'draft' | 'sent'
  sentAt?: string
  createdAt: string
  updatedAt: string
}

interface Employee {
  id: string
  name: string
  position: string
  status: string
}

interface TimeEntry {
  id: string
  date: string
  hours: number
  overtime: number
  dayType: string
  score?: number
  employeeId: string
}

interface PositionRate {
  id: string
  position: string
  hourlyRate: number
  areaNorm?: number
}

export function ReportsManagement() {
  const [reports, setReports] = useState<Report[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [positionRates, setPositionRates] = useState<PositionRate[]>([])
  const [selectedPeriod, setSelectedPeriod] = useState<string>(format(new Date(), 'yyyy-MM'))
  const [selectedType, setSelectedType] = useState<'advance' | 'salary'>('advance')
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [previewReport, setPreviewReport] = useState<any>(null)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const { toast } = useToast()

  // Загрузка данных
  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setIsLoading(true)
    try {
      const [reportsRes, employeesRes, ratesRes] = await Promise.all([
        fetch('/api/reports'),
        fetch('/api/employees'),
        fetch('/api/position-rates')
      ])

      if (reportsRes.ok && employeesRes.ok && ratesRes.ok) {
        const reportsData = await reportsRes.json()
        const employeesData = await employeesRes.json()
        const ratesData = await ratesRes.json()
        
        setReports(reportsData)
        setEmployees(employeesData)
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

  // Генерация отчета
  const generateReport = async () => {
    setIsGenerating(true)
    setError('')

    try {
      // Определяем даты периода
      const currentDate = new Date(`${selectedPeriod}-01`)
      let startDate, endDate
      
      if (selectedType === 'advance') {
        startDate = startOfMonth(currentDate)
        endDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 15)
      } else {
        startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 16)
        endDate = endOfMonth(currentDate)
      }

      // Получаем записи времени за период
      const timeEntriesRes = await fetch(
        `/api/time-entries?startDate=${format(startDate, 'yyyy-MM-dd')}&endDate=${format(endDate, 'yyyy-MM-dd')}`
      )
      
      if (!timeEntriesRes.ok) {
        throw new Error('Ошибка загрузки данных о времени')
      }

      const timeEntries: TimeEntry[] = await timeEntriesRes.json()

      // Группируем данные по сотрудникам
      const reportData = employees
        .filter(emp => emp.status === 'active')
        .map(employee => {
          const employeeEntries = timeEntries.filter(entry => entry.employeeId === employee.id)
          
          // Расчет рабочих часов
          const workHours = employeeEntries
            .filter(entry => entry.dayType === 'work')
            .reduce((sum, entry) => sum + entry.hours, 0)
          
          // Расчет сверхурочных
          const overtimeHours = employeeEntries
            .filter(entry => entry.dayType === 'work')
            .reduce((sum, entry) => sum + entry.overtime, 0)
          
          // Расчет больничных дней
          const sickDays = employeeEntries.filter(entry => entry.dayType === 'sick').length
          
          // Расчет отпускных дней
          const vacationDays = employeeEntries.filter(entry => entry.dayType === 'vacation').length
          
          // Расчет прогулов
          const absentDays = employeeEntries.filter(entry => entry.dayType === 'absent').length
          
          // Получение ставки для должности
          const positionRate = positionRates.find(rate => rate.position === employee.position)
          const hourlyRate = positionRate?.hourlyRate || 0
          
          // Расчет зарплаты
          const salary = workHours * hourlyRate
          const overtimeSalary = overtimeHours * hourlyRate * 1.5
          const totalSalary = salary + overtimeSalary

          return {
            employee: {
              id: employee.id,
              name: employee.name,
              position: employee.position
            },
            workHours,
            overtimeHours,
            sickDays,
            vacationDays,
            absentDays,
            hourlyRate,
            salary,
            overtimeSalary,
            totalSalary
          }
        })

      // Сохраняем отчет
      const reportResponse = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: selectedType,
          period: selectedPeriod,
          startDate: format(startDate, 'yyyy-MM-dd'),
          endDate: format(endDate, 'yyyy-MM-dd'),
          data: JSON.stringify(reportData)
        })
      })

      if (reportResponse.ok) {
        const newReport = await reportResponse.json()
        setReports(prev => [newReport, ...prev])
        
        toast({
          title: "Отчет сгенерирован",
          description: `${selectedType === 'advance' ? 'Аванс' : 'Зарплата'} за ${format(currentDate, 'LLLL yyyy', { locale: ru })}`,
        })
      } else {
        throw new Error('Ошибка сохранения отчета')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка генерации отчета')
    } finally {
      setIsGenerating(false)
    }
  }

  // Отправка отчета
  const sendReport = async (reportId: string) => {
    setIsSending(true)
    try {
      const response = await fetch(`/api/reports/${reportId}/send`, {
        method: 'POST'
      })

      if (response.ok) {
        setReports(prev => prev.map(report => 
          report.id === reportId 
            ? { ...report, status: 'sent', sentAt: new Date().toISOString() }
            : report
        ))
        
        toast({
          title: "Отчет отправлен",
          description: "Отчет успешно отправлен",
        })
      } else {
        throw new Error('Ошибка отправки отчета')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка отправки отчета')
    } finally {
      setIsSending(false)
    }
  }

  // Экспорт в CSV
  const exportToCSV = (report: Report) => {
    const data = JSON.parse(report.data)
    
    const csvData = data.map((item: any) => ({
      'Сотрудник': item.employee.name,
      'Должность': item.employee.position,
      'Рабочие часы': item.workHours,
      'Сверхурочные часы': item.overtimeHours,
      'Больничные дни': item.sickDays,
      'Отпускные дни': item.vacationDays,
      'Прогулы': item.absentDays,
      'Ставка в час': item.hourlyRate,
      'Зарплата': item.salary,
      'Сверхурочные': item.overtimeSalary,
      'Итого': item.totalSalary
    }))

    const csv = Papa.unparse(csvData)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `${report.type}_${report.period}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Экспорт в Excel
  const exportToExcel = (report: Report) => {
    const data = JSON.parse(report.data)
    
    const wsData = [
      ['Сотрудник', 'Должность', 'Рабочие часы', 'Сверхурочные', 'Больничные дни', 'Отпускные дни', 'Прогулы', 'Ставка в час', 'Зарплата', 'Сверхурочные', 'Итого'],
      ...data.map((item: any) => [
        item.employee.name,
        item.employee.position,
        item.workHours,
        item.overtimeHours,
        item.sickDays,
        item.vacationDays,
        item.absentDays,
        item.hourlyRate,
        item.salary,
        item.overtimeSalary,
        item.totalSalary
      ])
    ]

    const ws = XLSX.utils.aoa_to_sheet(wsData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Отчет')
    
    XLSX.writeFile(wb, `${report.type}_${report.period}.xlsx`)
  }

  // Предпросмотр отчета
  const previewReportData = (report: Report) => {
    const data = JSON.parse(report.data)
    setPreviewReport(data)
    setIsPreviewOpen(true)
  }

  // Удаление отчета
  const deleteReport = async (reportId: string) => {
    if (!confirm('Вы уверены, что хотите удалить этот отчет?')) return

    try {
      const response = await fetch(`/api/reports/${reportId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setReports(prev => prev.filter(report => report.id !== reportId))
        toast({
          title: "Отчет удален",
          description: "Отчет успешно удален",
        })
      } else {
        throw new Error('Ошибка удаления отчета')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка удаления отчета')
    }
  }

  // Получение статуса отчета
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <Badge variant="outline">Черновик</Badge>
      case 'sent':
        return <Badge variant="default">Отправлен</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  // Проверка, можно ли сгенерировать отчет
  const canGenerateReport = () => {
    const existingReport = reports.find(report => 
      report.period === selectedPeriod && report.type === selectedType
    )
    return !existingReport
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
      {/* Заголовок и генерация */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Отчёты</h2>
          <p className="text-gray-600">Формирование и отправка отчетных периодов</p>
        </div>
        <div className="flex space-x-2">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 12 }, (_, i) => {
                const date = subMonths(new Date(), i)
                return (
                  <SelectItem key={i} value={format(date, 'yyyy-MM')}>
                    {format(date, 'LLLL yyyy', { locale: ru })}
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>
          <Select value={selectedType} onValueChange={(value) => setSelectedType(value as any)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="advance">Аванс</SelectItem>
              <SelectItem value="salary">Зарплата</SelectItem>
            </SelectContent>
          </Select>
          <Button 
            onClick={generateReport} 
            disabled={isGenerating || !canGenerateReport()}
          >
            <FileText className="w-4 h-4 mr-2" />
            {isGenerating ? 'Генерация...' : 'Сгенерировать'}
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Список отчетов */}
      <Card>
        <CardHeader>
          <CardTitle>Сгенерированные отчеты</CardTitle>
          <CardDescription>
            Всего отчетов: {reports.length} | Отправлено: {reports.filter(r => r.status === 'sent').length}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Тип</TableHead>
                <TableHead>Период</TableHead>
                <TableHead>Дата создания</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead>Дата отправки</TableHead>
                <TableHead>Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reports.map((report) => (
                <TableRow key={report.id}>
                  <TableCell>
                    <Badge variant={report.type === 'advance' ? 'secondary' : 'default'}>
                      {report.type === 'advance' ? 'Аванс' : 'Зарплата'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {format(new Date(`${report.period}-01`), 'LLLL yyyy', { locale: ru })}
                  </TableCell>
                  <TableCell>
                    {format(new Date(report.createdAt), 'dd.MM.yyyy HH:mm')}
                  </TableCell>
                  <TableCell>{getStatusBadge(report.status)}</TableCell>
                  <TableCell>
                    {report.sentAt 
                      ? format(new Date(report.sentAt), 'dd.MM.yyyy HH:mm')
                      : '-'
                    }
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => previewReportData(report)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => exportToCSV(report)}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => exportToExcel(report)}
                      >
                        <FileText className="w-4 h-4" />
                      </Button>
                      {report.status === 'draft' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => sendReport(report.id)}
                          disabled={isSending}
                        >
                          <Send className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteReport(report.id)}
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

      {/* Диалог предпросмотра */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Предпросмотр отчета</DialogTitle>
            <DialogDescription>
              Данные отчета
            </DialogDescription>
          </DialogHeader>
          {previewReport && (
            <div className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Сотрудник</TableHead>
                    <TableHead>Должность</TableHead>
                    <TableHead>Рабочие часы</TableHead>
                    <TableHead>Сверхурочные</TableHead>
                    <TableHead>Больничные</TableHead>
                    <TableHead>Отпуск</TableHead>
                    <TableHead>Прогулы</TableHead>
                    <TableHead>Зарплата</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewReport.map((item: any, index: number) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{item.employee.name}</TableCell>
                      <TableCell>{item.employee.position}</TableCell>
                      <TableCell>{item.workHours}</TableCell>
                      <TableCell>{item.overtimeHours}</TableCell>
                      <TableCell>{item.sickDays}</TableCell>
                      <TableCell>{item.vacationDays}</TableCell>
                      <TableCell>{item.absentDays}</TableCell>
                      <TableCell className="font-medium">{item.totalSalary.toFixed(2)} руб.</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              {/* Итоги */}
              <div className="border-t pt-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Всего сотрудников</p>
                    <p className="text-lg font-semibold">{previewReport.length}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Всего часов</p>
                    <p className="text-lg font-semibold">
                      {previewReport.reduce((sum: number, item: any) => sum + item.workHours, 0)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Сверхурочные</p>
                    <p className="text-lg font-semibold">
                      {previewReport.reduce((sum: number, item: any) => sum + item.overtimeHours, 0)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Итого к выплате</p>
                    <p className="text-lg font-semibold">
                      {previewReport.reduce((sum: number, item: any) => sum + item.totalSalary, 0).toFixed(2)} руб.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPreviewOpen(false)}>
              Закрыть
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}