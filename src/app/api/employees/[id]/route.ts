import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// PUT /api/employees/[id] - Обновить сотрудника
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { name, position, status, terminationDate } = await request.json()
    const { id } = await params

    const existingEmployee = await db.employee.findUnique({
      where: { id }
    })

    if (!existingEmployee) {
      return NextResponse.json(
        { error: 'Сотрудник не найден' },
        { status: 404 }
      )
    }

    const updateData: any = {
      name,
      position,
      status
    }

    if (status === 'fired') {
      updateData.terminationDate = terminationDate || new Date().toISOString().split('T')[0]
    } else {
      updateData.terminationDate = null
    }

    // Validate termination date format
    if (updateData.terminationDate) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/
      if (!dateRegex.test(updateData.terminationDate)) {
        return NextResponse.json(
          { error: 'Неверный формат даты увольнения. Используйте формат ГГГГ-ММ-ДД' },
          { status: 400 }
        )
      }
    }

    const employee = await db.employee.update({
      where: { id },
      data: updateData
    })

    return NextResponse.json(employee)
  } catch (error) {
    console.error('Error updating employee:', error)
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
}

// DELETE /api/employees/[id] - Удалить сотрудника
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const existingEmployee = await db.employee.findUnique({
      where: { id }
    })

    if (!existingEmployee) {
      return NextResponse.json(
        { error: 'Сотрудник не найден' },
        { status: 404 }
      )
    }

    await db.employee.delete({
      where: { id }
    })

    return NextResponse.json({ message: 'Сотрудник удален' })
  } catch (error) {
    console.error('Error deleting employee:', error)
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
}