// Класс для работы с оффлайн-хранилищем
export class OfflineStorage {
  private static readonly PREFIX = 'hr_management_'
  private static readonly SYNC_QUEUE_KEY = `${this.PREFIX}sync_queue`
  private static readonly OFFLINE_DATA_KEY = `${this.PREFIX}offline_data`
  private static readonly SETTINGS_KEY = `${this.PREFIX}settings`

  // Сохранение данных в localStorage
  static setData(key: string, data: any): void {
    try {
      const serializedData = JSON.stringify(data)
      localStorage.setItem(`${this.PREFIX}${key}`, serializedData)
    } catch (error) {
      console.error('Error saving data to localStorage:', error)
    }
  }

  // Получение данных из localStorage
  static getData<T>(key: string, defaultValue: T): T {
    try {
      const item = localStorage.getItem(`${this.PREFIX}${key}`)
      return item ? JSON.parse(item) : defaultValue
    } catch (error) {
      console.error('Error reading data from localStorage:', error)
      return defaultValue
    }
  }

  // Удаление данных из localStorage
  static removeData(key: string): void {
    try {
      localStorage.removeItem(`${this.PREFIX}${key}`)
    } catch (error) {
      console.error('Error removing data from localStorage:', error)
    }
  }

  // Добавление операции в очередь синхронизации
  static addToSyncQueue(operation: SyncOperation): void {
    try {
      const queue = this.getSyncQueue()
      queue.push({
        ...operation,
        timestamp: Date.now(),
        id: this.generateId()
      })
      localStorage.setItem(this.SYNC_QUEUE_KEY, JSON.stringify(queue))
    } catch (error) {
      console.error('Error adding to sync queue:', error)
    }
  }

  // Получение очереди синхронизации
  static getSyncQueue(): SyncOperation[] {
    try {
      const item = localStorage.getItem(this.SYNC_QUEUE_KEY)
      return item ? JSON.parse(item) : []
    } catch (error) {
      console.error('Error reading sync queue:', error)
      return []
    }
  }

  // Удаление операции из очереди синхронизации
  static removeFromSyncQueue(operationId: string): void {
    try {
      const queue = this.getSyncQueue()
      const filteredQueue = queue.filter(op => op.id !== operationId)
      localStorage.setItem(this.SYNC_QUEUE_KEY, JSON.stringify(filteredQueue))
    } catch (error) {
      console.error('Error removing from sync queue:', error)
    }
  }

  // Очистка очереди синхронизации
  static clearSyncQueue(): void {
    try {
      localStorage.removeItem(this.SYNC_QUEUE_KEY)
    } catch (error) {
      console.error('Error clearing sync queue:', error)
    }
  }

  // Сохранение оффлайн-данных
  static saveOfflineData(data: OfflineData): void {
    try {
      const existingData = this.getOfflineData()
      const mergedData = {
        ...existingData,
        ...data,
        lastUpdated: Date.now()
      }
      localStorage.setItem(this.OFFLINE_DATA_KEY, JSON.stringify(mergedData))
    } catch (error) {
      console.error('Error saving offline data:', error)
    }
  }

  // Получение оффлайн-данных
  static getOfflineData(): OfflineData {
    try {
      const item = localStorage.getItem(this.OFFLINE_DATA_KEY)
      return item ? JSON.parse(item) : {
        employees: [],
        timeEntries: [],
        reports: [],
        positionRates: [],
        lastUpdated: null
      }
    } catch (error) {
      console.error('Error reading offline data:', error)
      return {
        employees: [],
        timeEntries: [],
        reports: [],
        positionRates: [],
        lastUpdated: null
      }
    }
  }

  // Сохранение настроек
  static saveSettings(settings: any): void {
    try {
      localStorage.setItem(this.SETTINGS_KEY, JSON.stringify(settings))
    } catch (error) {
      console.error('Error saving settings:', error)
    }
  }

  // Получение настроек
  static getSettings(defaultSettings: any): any {
    try {
      const item = localStorage.getItem(this.SETTINGS_KEY)
      return item ? JSON.parse(item) : defaultSettings
    } catch (error) {
      console.error('Error reading settings:', error)
      return defaultSettings
    }
  }

  // Проверка доступности сети
  static isOnline(): boolean {
    return navigator.onLine
  }

  // Генерация уникального ID
  private static generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2)
  }

  // Очистка всех данных
  static clearAll(): void {
    try {
      const keys = Object.keys(localStorage)
      keys.forEach(key => {
        if (key.startsWith(this.PREFIX)) {
          localStorage.removeItem(key)
        }
      })
    } catch (error) {
      console.error('Error clearing all data:', error)
    }
  }
}

// Типы данных
export interface SyncOperation {
  id: string
  type: 'create' | 'update' | 'delete'
  entity: 'employee' | 'timeEntry' | 'report' | 'positionRate'
  data: any
  timestamp: number
}

export interface OfflineData {
  employees: any[]
  timeEntries: any[]
  reports: any[]
  positionRates: any[]
  lastUpdated: number | null
}

// Сервис синхронизации
export class SyncService {
  private static isSyncing = false

  // Запуск синхронизации
  static async sync(): Promise<boolean> {
    if (this.isSyncing || !OfflineStorage.isOnline()) {
      return false
    }

    this.isSyncing = true
    const queue = OfflineStorage.getSyncQueue()
    const successfulOperations: string[] = []
    const failedOperations: string[] = []

    try {
      for (const operation of queue) {
        try {
          const success = await this.processOperation(operation)
          if (success) {
            successfulOperations.push(operation.id)
          } else {
            failedOperations.push(operation.id)
          }
        } catch (error) {
          console.error('Error processing operation:', error)
          failedOperations.push(operation.id)
        }
      }

      // Удаляем успешные операции из очереди
      successfulOperations.forEach(id => OfflineStorage.removeFromSyncQueue(id))

      return failedOperations.length === 0
    } catch (error) {
      console.error('Error during sync:', error)
      return false
    } finally {
      this.isSyncing = false
    }
  }

  // Обработка отдельной операции
  private static async processOperation(operation: SyncOperation): Promise<boolean> {
    const { type, entity, data } = operation

    try {
      switch (entity) {
        case 'employee':
          return await this.syncEmployee(type, data)
        case 'timeEntry':
          return await this.syncTimeEntry(type, data)
        case 'report':
          return await this.syncReport(type, data)
        case 'positionRate':
          return await this.syncPositionRate(type, data)
        default:
          return false
      }
    } catch (error) {
      console.error(`Error syncing ${entity}:`, error)
      return false
    }
  }

  // Синхронизация сотрудника
  private static async syncEmployee(type: string, data: any): Promise<boolean> {
    try {
      if (type === 'create') {
        const response = await fetch('/api/employees', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        })
        return response.ok
      } else if (type === 'update') {
        const response = await fetch(`/api/employees/${data.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        })
        return response.ok
      } else if (type === 'delete') {
        const response = await fetch(`/api/employees/${data.id}`, {
          method: 'DELETE'
        })
        return response.ok
      }
      return false
    } catch (error) {
      console.error('Error syncing employee:', error)
      return false
    }
  }

  // Синхронизация записи времени
  private static async syncTimeEntry(type: string, data: any): Promise<boolean> {
    try {
      if (type === 'create') {
        const response = await fetch('/api/time-entries', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        })
        return response.ok
      } else if (type === 'update') {
        const response = await fetch(`/api/time-entries/${data.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        })
        return response.ok
      } else if (type === 'delete') {
        const response = await fetch(`/api/time-entries/${data.id}`, {
          method: 'DELETE'
        })
        return response.ok
      }
      return false
    } catch (error) {
      console.error('Error syncing time entry:', error)
      return false
    }
  }

  // Синхронизация отчета
  private static async syncReport(type: string, data: any): Promise<boolean> {
    try {
      if (type === 'create') {
        const response = await fetch('/api/reports', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        })
        return response.ok
      } else if (type === 'delete') {
        const response = await fetch(`/api/reports/${data.id}`, {
          method: 'DELETE'
        })
        return response.ok
      }
      return false
    } catch (error) {
      console.error('Error syncing report:', error)
      return false
    }
  }

  // Синхронизация ставки
  private static async syncPositionRate(type: string, data: any): Promise<boolean> {
    try {
      if (type === 'create') {
        const response = await fetch('/api/position-rates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        })
        return response.ok
      } else if (type === 'update') {
        const response = await fetch(`/api/position-rates/${data.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        })
        return response.ok
      } else if (type === 'delete') {
        const response = await fetch(`/api/position-rates/${data.id}`, {
          method: 'DELETE'
        })
        return response.ok
      }
      return false
    } catch (error) {
      console.error('Error syncing position rate:', error)
      return false
    }
  }

  // Проверка наличия несинхронизированных данных
  static hasPendingSync(): boolean {
    return OfflineStorage.getSyncQueue().length > 0
  }

  // Получение количества несинхронизированных операций
  static getPendingSyncCount(): number {
    return OfflineStorage.getSyncQueue().length
  }
}

import { useState, useEffect } from 'react'

// Хук для работы с оффлайн-режимом
export function useOfflineStorage() {
  const [isOnline, setIsOnline] = useState(OfflineStorage.isOnline())
  const [pendingSyncCount, setPendingSyncCount] = useState(SyncService.getPendingSyncCount())

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      // Автоматическая синхронизация при восстановлении соединения
      SyncService.sync()
    }

    const handleOffline = () => {
      setIsOnline(false)
    }

    // Обновление счетчика при изменении очереди
    const updateSyncCount = () => {
      setPendingSyncCount(SyncService.getPendingSyncCount())
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    
    // Периодическая проверка очереди синхронизации
    const interval = setInterval(updateSyncCount, 1000)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      clearInterval(interval)
    }
  }, [])

  return {
    isOnline,
    pendingSyncCount,
    sync: SyncService.sync,
    hasPendingSync: SyncService.hasPendingSync
  }
}