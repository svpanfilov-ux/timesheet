import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/position-rates - Получить все ставки должностей
export async function GET(request: NextRequest) {
  try {
    const rates = await db.positionRate.findMany({
      orderBy: { position: 'asc' }
    })

    return NextResponse.json(rates)
  } catch (error) {
    console.error('Error fetching position rates:', error)
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
}

// POST /api/position-rates - Создать новую ставку должности
export async function POST(request: NextRequest) {
  try {
    const { position, hourlyRate, areaNorm } = await request.json()

    if (!position || hourlyRate === undefined) {
      return NextResponse.json(
        { error: 'Должность и ставка обязательны' },
        { status: 400 }
      )
    }

    // Проверяем, существует ли уже ставка для этой должности
    const existingRate = await db.positionRate.findUnique({
      where: { position }
    })

    if (existingRate) {
      return NextResponse.json(
        { error: 'Ставка для этой должности уже существует' },
        { status: 400 }
      )
    }

    const rate = await db.positionRate.create({
      data: {
        position,
        hourlyRate: parseFloat(hourlyRate),
        areaNorm: areaNorm ? parseFloat(areaNorm) : null
      }
    })

    return NextResponse.json(rate)
  } catch (error) {
    console.error('Error creating position rate:', error)
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
}