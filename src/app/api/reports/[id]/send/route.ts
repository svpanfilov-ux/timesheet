import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// POST /api/reports/[id]/send - Отправить отчет
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const existingReport = await db.report.findUnique({
      where: { id }
    })

    if (!existingReport) {
      return NextResponse.json(
        { error: 'Отчет не найден' },
        { status: 404 }
      )
    }

    if (existingReport.status === 'sent') {
      return NextResponse.json(
        { error: 'Отчет уже отправлен' },
        { status: 400 }
      )
    }

    // Обновляем статус отчета
    const report = await db.report.update({
      where: { id },
      data: {
        status: 'sent',
        sentAt: new Date()
      }
    })

    return NextResponse.json(report)
  } catch (error) {
    console.error('Error sending report:', error)
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
}