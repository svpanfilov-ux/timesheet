import { OfflineStorage } from './offline-storage'

interface Notification {
  id: string
  type: 'deadline' | 'system' | 'employee' | 'sync'
  title: string
  message: string
  timestamp: number
  read: boolean
  actions?: NotificationAction[]
  data?: any
}

interface NotificationAction {
  label: string
  action: () => void
  primary?: boolean
}

interface NotificationSettings {
  enableNotifications: boolean
  deadlineReminderDays: number
  enableSound: boolean
  enableDesktop: boolean
  types: {
    deadline: boolean
    system: boolean
    employee: boolean
    sync: boolean
  }
}

export class NotificationService {
  private static readonly NOTIFICATIONS_KEY = 'hr_management_notifications'
  private static readonly SETTINGS_KEY = 'hr_management_notification_settings'
  private static permission: NotificationPermission = 'default'

  // Инициализация сервиса уведомлений
  static async init(): Promise<void> {
    // Запрос разрешения на уведомления
    if ('Notification' in window) {
      this.permission = await Notification.requestPermission()
    }

    // Проверка напоминаний при запуске
    this.checkDeadlines()
    
    // Проверка каждые 5 минут
    setInterval(() => this.checkDeadlines(), 5 * 60 * 1000)

    // Проверка восстановления сети
    window.addEventListener('online', () => {
      this.addNotification({
        type: 'sync',
        title: 'Соединение восстановлено',
        message: 'Данные будут синхронизированы автоматически',
        timestamp: Date.now(),
        read: false
      })
    })

    window.addEventListener('offline', () => {
      this.addNotification({
        type: 'sync',
        title: 'Нет соединения',
        message: 'Работа в офлайн-режиме. Данные будут синхронизированы при восстановлении соединения.',
        timestamp: Date.now(),
        read: false
      })
    })
  }

  // Получение настроек уведомлений
  static getSettings(): NotificationSettings {
    return OfflineStorage.getData(this.SETTINGS_KEY, {
      enableNotifications: true,
      deadlineReminderDays: 3,
      enableSound: true,
      enableDesktop: true,
      types: {
        deadline: true,
        system: true,
        employee: true,
        sync: true
      }
    })
  }

  // Сохранение настроек уведомлений
  static saveSettings(settings: Partial<NotificationSettings>): void {
    const currentSettings = this.getSettings()
    const newSettings = { ...currentSettings, ...settings }
    OfflineStorage.setData(this.SETTINGS_KEY, newSettings)
  }

  // Добавление уведомления
  static addNotification(notification: Omit<Notification, 'id'>): string {
    const notifications = this.getNotifications()
    const newNotification: Notification = {
      ...notification,
      id: this.generateId()
    }

    notifications.unshift(newNotification)
    
    // Ограничиваем количество уведомлений
    if (notifications.length > 50) {
      notifications.splice(50)
    }

    OfflineStorage.setData(this.NOTIFICATIONS_KEY, notifications)

    // Показываем уведомление если включено
    this.showNotification(newNotification)

    return newNotification.id
  }

  // Получение всех уведомлений
  static getNotifications(): Notification[] {
    return OfflineStorage.getData(this.NOTIFICATIONS_KEY, [])
  }

  // Получение непрочитанных уведомлений
  static getUnreadNotifications(): Notification[] {
    return this.getNotifications().filter(n => !n.read)
  }

  // Пометить уведомление как прочитанное
  static markAsRead(notificationId: string): void {
    const notifications = this.getNotifications()
    const notification = notifications.find(n => n.id === notificationId)
    
    if (notification) {
      notification.read = true
      OfflineStorage.setData(this.NOTIFICATIONS_KEY, notifications)
    }
  }

  // Пометить все уведомления как прочитанные
  static markAllAsRead(): void {
    const notifications = this.getNotifications()
    notifications.forEach(n => n.read = true)
    OfflineStorage.setData(this.NOTIFICATIONS_KEY, notifications)
  }

  // Удаление уведомления
  static removeNotification(notificationId: string): void {
    const notifications = this.getNotifications()
    const filtered = notifications.filter(n => n.id !== notificationId)
    OfflineStorage.setData(this.NOTIFICATIONS_KEY, filtered)
  }

  // Очистка всех уведомлений
  static clearNotifications(): void {
    OfflineStorage.setData(this.NOTIFICATIONS_KEY, [])
  }

  // Показ уведомления в браузере
  private static showNotification(notification: Notification): void {
    const settings = this.getSettings()
    
    if (!settings.enableNotifications || !settings.types[notification.type]) {
      return
    }

    // Звуковое уведомление
    if (settings.enableSound) {
      this.playSound()
    }

    // Desktop уведомление
    if (settings.enableDesktop && this.permission === 'granted' && 'Notification' in window) {
      new Notification(notification.title, {
        body: notification.message,
        icon: '/favicon.ico',
        tag: notification.id,
        requireInteraction: false
      })
    }
  }

  // Воспроизведение звука
  private static playSound(): void {
    try {
      const audio = new Audio('/notification.mp3')
      audio.play().catch(() => {
        // Игнорируем ошибки воспроизведения
      })
    } catch (error) {
      console.error('Error playing notification sound:', error)
    }
  }

  // Проверка сроков
  private static checkDeadlines(): void {
    const settings = this.getSettings()
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()
    
    // Проверка аванса
    const advanceDeadline = new Date(currentYear, currentMonth, 15)
    const daysToAdvance = Math.ceil((advanceDeadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    
    if (daysToAdvance > 0 && daysToAdvance <= settings.deadlineReminderDays) {
      const existingNotification = this.getNotifications().find(n => 
        n.type === 'deadline' && n.title.includes('аванс')
      )
      
      if (!existingNotification) {
        this.addNotification({
          type: 'deadline',
          title: 'Напоминание о закрытии аванса',
          message: `До закрытия аванса осталось ${daysToAdvance} дней`,
          timestamp: Date.now(),
          read: false,
          actions: [
            {
              label: 'Перейти к табелю',
              action: () => {
                // Навигация к табелю
                window.location.hash = '#timesheet'
              },
              primary: true
            }
          ]
        })
      }
    }

    // Проверка зарплаты
    const salaryDeadline = new Date(currentYear, currentMonth + 1, 1)
    const daysToSalary = Math.ceil((salaryDeadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    
    if (daysToSalary > 0 && daysToSalary <= settings.deadlineReminderDays) {
      const existingNotification = this.getNotifications().find(n => 
        n.type === 'deadline' && n.title.includes('зарплаты')
      )
      
      if (!existingNotification) {
        this.addNotification({
          type: 'deadline',
          title: 'Напоминание о закрытии зарплаты',
          message: `До закрытия зарплаты осталось ${daysToSalary} дней`,
          timestamp: Date.now(),
          read: false,
          actions: [
            {
              label: 'Перейти к отчетам',
              action: () => {
                // Навигация к отчетам
                window.location.hash = '#reports'
              },
              primary: true
            }
          ]
        })
      }
    }
  }

  // Напоминание о синхронизации
  static checkSyncStatus(): void {
    const syncQueue = OfflineStorage.getSyncQueue()
    
    if (syncQueue.length > 0) {
      const existingNotification = this.getNotifications().find(n => 
        n.type === 'sync' && n.title.includes('синхронизации')
      )
      
      if (!existingNotification) {
        this.addNotification({
          type: 'sync',
          title: 'Требуется синхронизация',
          message: `Есть ${syncQueue.length} несинхронизированных изменений`,
          timestamp: Date.now(),
          read: false,
          actions: [
            {
              label: 'Синхронизировать',
              action: () => {
                // Запуск синхронизации
                import('./offline-storage').then(({ SyncService }) => {
                  SyncService.sync()
                })
              },
              primary: true
            }
          ]
        })
      }
    }
  }

  // Уведомление о новом сотруднике
  static notifyNewEmployee(employeeName: string): void {
    this.addNotification({
      type: 'employee',
      title: 'Добавлен новый сотрудник',
      message: `Сотрудник ${employeeName} добавлен в систему`,
      timestamp: Date.now(),
      read: false,
      actions: [
        {
          label: 'Перейти к сотрудникам',
          action: () => {
            window.location.hash = '#employees'
          },
          primary: true
        }
      ]
    })
  }

  // Системное уведомление
  static notifySystem(title: string, message: string): void {
    this.addNotification({
      type: 'system',
      title,
      message,
      timestamp: Date.now(),
      read: false
    })
  }

  // Генерация уникального ID
  private static generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2)
  }
}

// Хук для работы с уведомлениями
import { useState, useEffect } from 'react'

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    // Инициализация сервиса
    NotificationService.init()

    // Загрузка уведомлений
    loadNotifications()

    // Периодическая проверка новых уведомлений
    const interval = setInterval(() => {
      loadNotifications()
      NotificationService.checkSyncStatus()
    }, 30000) // Каждые 30 секунд

    return () => clearInterval(interval)
  }, [])

  const loadNotifications = () => {
    const allNotifications = NotificationService.getNotifications()
    setNotifications(allNotifications)
    setUnreadCount(allNotifications.filter(n => !n.read).length)
  }

  const markAsRead = (notificationId: string) => {
    NotificationService.markAsRead(notificationId)
    loadNotifications()
  }

  const markAllAsRead = () => {
    NotificationService.markAllAsRead()
    loadNotifications()
  }

  const removeNotification = (notificationId: string) => {
    NotificationService.removeNotification(notificationId)
    loadNotifications()
  }

  const clearNotifications = () => {
    NotificationService.clearNotifications()
    loadNotifications()
  }

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearNotifications
  }
}