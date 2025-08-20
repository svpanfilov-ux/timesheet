import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// PUT /api/position-rates/[id] - Обновить ставку
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { position, hourlyRate, areaNorm } = await request.json()
    const { id } = await params

    const existingRate = await db.positionRate.findUnique({
      where: { id }
    })

    if (!existingRate) {
      return NextResponse.json(
        { error: 'Ставка не найдена' },
        { status: 404 }
      )
    }

    // Проверяем, не занята ли должность другой ставкой
    if (position !== existingRate.position) {
      const duplicateRate = await db.positionRate.findUnique({
        where: { position }
      })

      if (duplicateRate) {
        return NextResponse.json(
          { error: 'Ставка для этой должности уже существует' },
          { status: 400 }
        )
      }
    }

    const updateData: any = {
      position,
      hourlyRate: parseFloat(hourlyRate)
    }

    if (areaNorm !== undefined) {
      updateData.areaNorm = areaNorm ? parseFloat(areaNorm) : null
    }

    const rate = await db.positionRate.update({
      where: { id },
      data: updateData
    })

    return NextResponse.json(rate)
  } catch (error) {
    console.error('Error updating position rate:', error)
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
}

// DELETE /api/position-rates/[id] - Удалить ставку
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const existingRate = await db.positionRate.findUnique({
      where: { id }
    })

    if (!existingRate) {
      return NextResponse.json(
        { error: 'Ставка не найдена' },
        { status: 404 }
      )
    }

    await db.positionRate.delete({
      where: { id }
    })

    return NextResponse.json({ message: 'Ставка удалена' })
  } catch (error) {
    console.error('Error deleting position rate:', error)
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
}