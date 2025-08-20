import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { useAuth } from '@/components/auth-provider'

// GET /api/employees - Получить всех сотрудников
export async function GET(request: NextRequest) {
  try {
    const employees = await db.employee.findMany({
      orderBy: [
        { status: 'asc' },
        { name: 'asc' }
      ]
    })

    return NextResponse.json(employees)
  } catch (error) {
    console.error('Error fetching employees:', error)
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
}

// POST /api/employees - Создать нового сотрудника
export async function POST(request: NextRequest) {
  try {
    const { name, position, status } = await request.json()

    if (!name || !position) {
      return NextResponse.json(
        { error: 'Имя и должность обязательны' },
        { status: 400 }
      )
    }

    // Получаем пользователя из токена
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Требуется авторизация' },
        { status: 401 }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    // В реальном приложении здесь должна быть проверка JWT токена
    // Для демо используем фиксированный user ID
    const userId = 'demo-user-id'

    const employee = await db.employee.create({
      data: {
        name,
        position,
        status: status || 'active',
        userId
      }
    })

    return NextResponse.json(employee)
  } catch (error) {
    console.error('Error creating employee:', error)
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
}