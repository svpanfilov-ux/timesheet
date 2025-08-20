import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// PUT /api/time-entries/[id] - Обновить запись времени
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { hours, dayType, score, comment } = await request.json()
    const { id } = await params

    const existingEntry = await db.timeEntry.findUnique({
      where: { id }
    })

    if (!existingEntry) {
      return NextResponse.json(
        { error: 'Запись не найдена' },
        { status: 404 }
      )
    }

    const updateData: any = {}
    
    if (hours !== undefined) updateData.hours = hours
    if (dayType !== undefined) updateData.dayType = dayType
    if (score !== undefined) updateData.score = score
    if (comment !== undefined) updateData.comment = comment

    const timeEntry = await db.timeEntry.update({
      where: { id },
      data: updateData,
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
    console.error('Error updating time entry:', error)
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
}

// DELETE /api/time-entries/[id] - Удалить запись времени
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const existingEntry = await db.timeEntry.findUnique({
      where: { id }
    })

    if (!existingEntry) {
      return NextResponse.json(
        { error: 'Запись не найдена' },
        { status: 404 }
      )
    }

    await db.timeEntry.delete({
      where: { id }
    })

    return NextResponse.json({ message: 'Запись удалена' })
  } catch (error) {
    console.error('Error deleting time entry:', error)
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
}