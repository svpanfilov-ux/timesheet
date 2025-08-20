import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/time-entries - Получить записи времени с фильтрацией
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const month = searchParams.get('month')
    const employeeId = searchParams.get('employeeId')

    let whereClause: any = {}
    
    if (month) {
      const startDate = `${month}-01`
      const endDate = `${month}-31`
      whereClause.date = {
        gte: startDate,
        lte: endDate
      }
    }
    
    if (employeeId) {
      whereClause.employeeId = employeeId
    }

    const timeEntries = await db.timeEntry.findMany({
      where: whereClause,
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            position: true,
            status: true
          }
        }
      },
      orderBy: [
        { employee: { status: 'asc' } },
        { employee: { name: 'asc' } },
        { date: 'asc' }
      ]
    })

    return NextResponse.json(timeEntries)
  } catch (error) {
    console.error('Error fetching time entries:', error)
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
}

// POST /api/time-entries - Создать новую запись времени
export async function POST(request: NextRequest) {
  try {
    const { employeeId, date, hours, dayType, score, comment } = await request.json()

    if (!employeeId || !date) {
      return NextResponse.json(
        { error: 'Employee ID и дата обязательны' },
        { status: 400 }
      )
    }

    // Проверяем, существует ли сотрудник
    const employee = await db.employee.findUnique({
      where: { id: employeeId }
    })

    if (!employee) {
      return NextResponse.json(
        { error: 'Сотрудник не найден' },
        { status: 404 }
      )
    }

    // Проверяем, существует ли уже запись для этой даты
    const existingEntry = await db.timeEntry.findUnique({
      where: {
        employeeId_date: {
          employeeId,
          date
        }
      }
    })

    if (existingEntry) {
      return NextResponse.json(
        { error: 'Запись для этой даты уже существует' },
        { status: 400 }
      )
    }

    const timeEntry = await db.timeEntry.create({
      data: {
        employeeId,
        date,
        hours: hours || 0,
        dayType: dayType || 'work',
        score: score,
        comment: comment
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

    return NextResponse.json(timeEntry)
  } catch (error) {
    console.error('Error creating time entry:', error)
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
}