import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// DELETE /api/reports/[id] - Удалить отчет
export async function DELETE(
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

    await db.report.delete({
      where: { id }
    })

    return NextResponse.json({ message: 'Отчет удален' })
  } catch (error) {
    console.error('Error deleting report:', error)
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
}