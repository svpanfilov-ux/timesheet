import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { format, startOfMonth, endOfMonth, parseISO } from 'date-fns'

// POST /api/reports/generate - Генерация отчета
export async function POST(request: NextRequest) {
  try {
    const { period, type } = await request.json()

    if (!period || !type) {
      return NextResponse.json(
        { error: 'Период и тип обязательны' },
        { status: 400 }
      )
    }

    // Определяем даты начала и окончания периода
    let startDate, endDate
    if (type === 'advance') {
      startDate = `${period}-01`
      endDate = `${period}-15`
    } else {
      startDate = `${period}-01`
      // Находим последний день месяца
      const date = new Date(`${period}-01`)
      const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0)
      endDate = `${period}-${lastDay.getDate().toString().padStart(2, '0')}`
    }

    // Получаем всех сотрудников
    const employees = await db.employee.findMany({
      orderBy: [
        { status: 'asc' },
        { name: 'asc' }
      ]
    })

    // Получаем записи времени за период
    const timeEntries = await db.timeEntry.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate
        }
      },
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            position: true,
            status: true
          }
        }
      }
    })

    // Группируем записи по сотрудникам
    const entriesByEmployee = timeEntries.reduce((acc, entry) => {
      if (!acc[entry.employeeId]) {
        acc[entry.employeeId] = []
      }
      acc[entry.employeeId].push(entry)
      return acc
    }, {} as Record<string, typeof timeEntries>)

    // Формируем данные отчета
    const reportData = {
      period,
      type,
      startDate,
      endDate,
      totalEmployees: employees.length,
      activeEmployees: employees.filter(emp => emp.status === 'active').length,
      employees: employees.map(employee => {
        const employeeEntries = entriesByEmployee[employee.id] || []
        const workEntries = employeeEntries.filter(entry => entry.dayType === 'work')
        
        const totalHours = workEntries.reduce((sum, entry) => sum + entry.hours, 0)
        const scores = workEntries.map(entry => entry.score).filter(score => score !== null && score !== undefined)
        const averageScore = scores.length > 0 
          ? scores.reduce((sum, score) => sum + score!, 0) / scores.length 
          : null

        return {
          id: employee.id,
          name: employee.name,
          position: employee.position,
          status: employee.status,
          totalHours,
          averageScore,
          workDays: workEntries.length,
          sickDays: employeeEntries.filter(entry => entry.dayType === 'sick').length,
          vacationDays: employeeEntries.filter(entry => entry.dayType === 'vacation').length,
          absentDays: employeeEntries.filter(entry => entry.dayType === 'absent').length
        }
      }),
      totalHours: timeEntries
        .filter(entry => entry.dayType === 'work')
        .reduce((sum, entry) => sum + entry.hours, 0),
      averageScore: (() => {
        const allScores = timeEntries
          .filter(entry => entry.dayType === 'work' && entry.score !== null && entry.score !== undefined)
          .map(entry => entry.score!)
        return allScores.length > 0 
          ? allScores.reduce((sum, score) => sum + score, 0) / allScores.length 
          : null
      })(),
      totalWorkDays: timeEntries.filter(entry => entry.dayType === 'work').length,
      totalSickDays: timeEntries.filter(entry => entry.dayType === 'sick').length,
      totalVacationDays: timeEntries.filter(entry => entry.dayType === 'vacation').length,
      totalAbsentDays: timeEntries.filter(entry => entry.dayType === 'absent').length
    }

    return NextResponse.json(reportData)
  } catch (error) {
    console.error('Error generating report:', error)
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
}