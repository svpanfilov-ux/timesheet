import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// POST /api/employees/import - Импорт сотрудников из CSV
export async function POST(request: NextRequest) {
  try {
    const { employees } = await request.json()

    if (!Array.isArray(employees)) {
      return NextResponse.json(
        { error: 'Неверный формат данных' },
        { status: 400 }
      )
    }

    // Валидация данных
    const validEmployees = employees.filter(emp => 
      emp.name && emp.position && 
      ['active', 'not_registered', 'fired'].includes(emp.status)
    )

    if (validEmployees.length === 0) {
      return NextResponse.json(
        { error: 'Нет валидных сотрудников для импорта' },
        { status: 400 }
      )
    }

    // Для демо используем фиксированный user ID
    const userId = 'demo-user-id'

    // Создаем сотрудников
    const createdEmployees = await Promise.all(
      validEmployees.map(emp => 
        db.employee.create({
          data: {
            name: emp.name,
            position: emp.position,
            status: emp.status || 'active',
            userId
          }
        })
      )
    )

    return NextResponse.json({
      message: `Успешно импортировано ${createdEmployees.length} сотрудников`,
      employees: createdEmployees
    })
  } catch (error) {
    console.error('Error importing employees:', error)
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
}