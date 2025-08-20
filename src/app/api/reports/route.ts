import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/reports - Получить все отчеты
export async function GET(request: NextRequest) {
  try {
    const reports = await db.report.findMany({
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(reports)
  } catch (error) {
    console.error('Error fetching reports:', error)
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
}

// POST /api/reports - Создать новый отчет
export async function POST(request: NextRequest) {
  try {
    const { type, period, startDate, endDate, data } = await request.json()

    if (!type || !period || !startDate || !endDate || !data) {
      return NextResponse.json(
        { error: 'Все поля обязательны' },
        { status: 400 }
      )
    }

    // Для демо используем фиксированный user ID
    const userId = 'demo-user-id'

    const report = await db.report.create({
      data: {
        type,
        period,
        startDate,
        endDate,
        data,
        userId
      }
    })

    return NextResponse.json(report)
  } catch (error) {
    console.error('Error creating report:', error)
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
}