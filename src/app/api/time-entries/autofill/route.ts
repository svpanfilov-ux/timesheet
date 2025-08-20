import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { format, subMonths, startOfMonth, endOfMonth, addDays } from 'date-fns'

// POST /api/time-entries/autofill - Автозаполнение из предыдущего месяца
export async function POST(request: NextRequest) {
  try {
    const { month } = await request.json()

    if (!month) {
      return NextResponse.json(
        { error: 'Месяц обязателен' },
        { status: 400 }
      )
    }

    // Получаем предыдущий месяц
    const currentDate = new Date(`${month}-01`)
    const previousMonth = subMonths(currentDate, 1)
    const previousMonthStr = format(previousMonth, 'yyyy-MM')

    // Получаем все записи из предыдущего месяца
    const previousEntries = await db.timeEntry.findMany({
      where: {
        date: {
          gte: format(startOfMonth(previousMonth), 'yyyy-MM-dd'),
          lte: format(endOfMonth(previousMonth), 'yyyy-MM-dd')
        }
      },
      include: {
        employee: true
      }
    })

    // Получаем всех активных сотрудников
    const activeEmployees = await db.employee.findMany({
      where: { status: 'active' }
    })

    // Группируем записи по сотрудникам
    const employeeEntries = new Map<string, typeof previousEntries>()
    previousEntries.forEach(entry => {
      if (!employeeEntries.has(entry.employeeId)) {
        employeeEntries.set(entry.employeeId, [])
      }
      employeeEntries.get(entry.employeeId)!.push(entry)
    })

    // Определяем даты текущего месяца
    const currentMonthStart = startOfMonth(currentDate)
    const currentMonthEnd = endOfMonth(currentDate)
    const currentDates = []
    let date = currentMonthStart
    while (date <= currentMonthEnd) {
      currentDates.push(date)
      date = addDays(date, 1)
    }

    // Создаем новые записи на основе предыдущего месяца
    const createdEntries = []
    
    for (const employee of activeEmployees) {
      const prevEntries = employeeEntries.get(employee.id) || []
      
      // Находим соответствующие даты в предыдущем месяце
      for (let i = 0; i < currentDates.length; i++) {
        const currentDateObj = currentDates[i]
        const dayOfWeek = currentDateObj.getDay()
        
        // Пропускаем выходные (суббота=6, воскресенье=0)
        if (dayOfWeek === 0 || dayOfWeek === 6) {
          continue
        }
        
        // Ищем соответствующую запись в предыдущем месяце
        const correspondingDate = new Date(previousMonth)
        correspondingDate.setDate(currentDateObj.getDate())
        
        // Проверяем, существует ли уже запись для этой даты
        const existingEntry = await db.timeEntry.findUnique({
          where: {
            employeeId_date: {
              employeeId: employee.id,
              date: format(currentDateObj, 'yyyy-MM-dd')
            }
          }
        })

        if (existingEntry) {
          continue // Пропускаем, если запись уже существует
        }

        // Ищем запись в предыдущем месяце для того же дня недели
        const prevEntry = prevEntries.find(entry => {
          const entryDate = new Date(entry.date)
          return entryDate.getDay() === dayOfWeek
        })

        if (prevEntry) {
          // Копируем данные из предыдущего месяца
          const newEntry = await db.timeEntry.create({
            data: {
              employeeId: employee.id,
              date: format(currentDateObj, 'yyyy-MM-dd'),
              hours: prevEntry.hours,
              dayType: prevEntry.dayType,
              score: prevEntry.score,
              comment: prevEntry.comment
            }
          })
          createdEntries.push(newEntry)
        } else {
          // Если нет соответствующей записи, создаем стандартную (8 часов)
          const newEntry = await db.timeEntry.create({
            data: {
              employeeId: employee.id,
              date: format(currentDateObj, 'yyyy-MM-dd'),
              hours: 8,
              dayType: 'work',
              score: 3
            }
          })
          createdEntries.push(newEntry)
        }
      }
    }

    return NextResponse.json({
      message: `Автозаполнение завершено. Создано ${createdEntries.length} записей`,
      entries: createdEntries
    })
  } catch (error) {
    console.error('Error in autofill:', error)
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
}