import { NextRequest, NextResponse } from 'next/server'

// GET /api/settings - Получить системные настройки
export async function GET(request: NextRequest) {
  try {
    // В реальном приложении настройки должны храниться в базе данных
    // Для демо возвращаем настройки по умолчанию
    const defaultSettings = {
      enableVolumeAccounting: false,
      enableNotifications: true,
      enableOfflineMode: true,
      reportDeadlineDays: 2
    }

    return NextResponse.json(defaultSettings)
  } catch (error) {
    console.error('Error fetching settings:', error)
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
}

// PUT /api/settings - Обновить системные настройки
export async function PUT(request: NextRequest) {
  try {
    const { enableVolumeAccounting, enableNotifications, enableOfflineMode, reportDeadlineDays } = await request.json()

    // В реальном приложении здесь должно сохранение в базу данных
    // Для демо просто имитируем сохранение
    
    console.log('Saving settings:', {
      enableVolumeAccounting,
      enableNotifications,
      enableOfflineMode,
      reportDeadlineDays
    })

    const updatedSettings = {
      enableVolumeAccounting,
      enableNotifications,
      enableOfflineMode,
      reportDeadlineDays
    }

    return NextResponse.json(updatedSettings)
  } catch (error) {
    console.error('Error updating settings:', error)
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
}