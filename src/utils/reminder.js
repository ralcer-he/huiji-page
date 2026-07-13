import { getSetting, saveSetting } from '../db/database'
import { Capacitor } from '@capacitor/core'

export const REMINDER_ENABLED_KEY = 'reminderEnabled'
export const REMINDER_TIME_KEY = 'reminderTime'
export const REMINDER_MESSAGE_KEY = 'reminderMessage'
export const BACKUP_REMINDER_ENABLED_KEY = 'backupReminderEnabled'
export const LAST_BACKUP_DATE_KEY = 'lastBackupDate'

const DEFAULT_REMINDER_TIME = '21:00'
const DEFAULT_REMINDER_MESSAGE = '今天记录心情了吗？来慧记写点什么吧~'
const BACKUP_REMINDER_DAYS = 7 // 每7天提醒一次备份

let reminderTimer = null

export async function getReminderSettings() {
  const enabled = await getSetting(REMINDER_ENABLED_KEY)
  const time = await getSetting(REMINDER_TIME_KEY)
  const message = await getSetting(REMINDER_MESSAGE_KEY)
  
  return {
    enabled: !!enabled,
    time: time || DEFAULT_REMINDER_TIME,
    message: message || DEFAULT_REMINDER_MESSAGE,
  }
}

export async function setReminderSettings(settings) {
  if (settings.enabled !== undefined) {
    await saveSetting(REMINDER_ENABLED_KEY, settings.enabled)
  }
  if (settings.time !== undefined) {
    await saveSetting(REMINDER_TIME_KEY, settings.time)
  }
  if (settings.message !== undefined) {
    await saveSetting(REMINDER_MESSAGE_KEY, settings.message)
  }
  
  if (settings.enabled !== undefined) {
    if (settings.enabled) {
      startReminder()
    } else {
      stopReminder()
    }
  } else if (reminderTimer) {
    const currentSettings = await getReminderSettings()
    if (currentSettings.enabled) {
      startReminder()
    }
  }
}

export async function requestNotificationPermission() {
  // Capacitor 原生环境：使用 local-notifications 插件
  if (Capacitor.isNativePlatform()) {
    try {
      const { LocalNotifications } = await import('@capacitor/local-notifications')
      const perm = await LocalNotifications.requestPermissions()
      return perm.display === 'granted'
    } catch (err) {
      console.warn('LocalNotifications 权限请求失败:', err)
      return false
    }
  }

  // Web 环境
  if (!('Notification' in window)) {
    return false
  }
  
  if (Notification.permission === 'granted') {
    return true
  }
  
  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission()
    return permission === 'granted'
  }
  
  return false
}

export function showNotification(title, body) {
  // Capacitor 原生环境
  if (Capacitor.isNativePlatform()) {
    showLocalNotification(title, body)
    return true
  }

  // Web 环境
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return false
  }
  
  try {
    new Notification(title, {
      body,
      icon: '/favicon.png',
      badge: '/favicon.png',
    })
    return true
  } catch (error) {
    console.error('通知发送失败:', error)
    return false
  }
}

async function showLocalNotification(title, body) {
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications')
    await LocalNotifications.schedule({
      notifications: [{
        title,
        body,
        id: Date.now() % 2147483647,
        schedule: { at: new Date(Date.now() + 1000) },
      }]
    })
  } catch (err) {
    console.error('本地通知发送失败:', err)
  }
}

async function scheduleNativeReminder(timeStr, message) {
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications')
    // 先取消已有提醒
    await LocalNotifications.cancel({ notifications: [{ id: 1001 }] })

    const now = new Date()
    const [hours, minutes] = timeStr.split(':').map(Number)
    const nextTime = new Date()
    nextTime.setHours(hours, minutes, 0, 0)
    if (nextTime <= now) {
      nextTime.setDate(nextTime.getDate() + 1)
    }

    await LocalNotifications.schedule({
      notifications: [{
        title: '慧记提醒',
        body: message,
        id: 1001,
        schedule: { at: nextTime, repeats: true, every: 'day' },
      }]
    })
  } catch (err) {
    console.error('本地定时提醒设置失败:', err)
  }
}

function getNextReminderTime(timeStr) {
  const now = new Date()
  const [hours, minutes] = timeStr.split(':').map(Number)
  
  const nextTime = new Date()
  nextTime.setHours(hours, minutes, 0, 0)
  
  if (nextTime <= now) {
    nextTime.setDate(nextTime.getDate() + 1)
  }
  
  return nextTime
}

export async function startReminder() {
  stopReminder()
  
  const settings = await getReminderSettings()
  if (!settings.enabled) return
  
  const hasPermission = await requestNotificationPermission()
  if (!hasPermission) {
    return
  }
  
  // Capacitor 原生环境：使用 local-notifications 每日定时
  if (Capacitor.isNativePlatform()) {
    await scheduleNativeReminder(settings.time, settings.message)
    return
  }
  
  // Web 环境：setTimeout 定时器
  const scheduleNextReminder = async () => {
    const currentSettings = await getReminderSettings()
    if (!currentSettings.enabled) return
    
    const nextTime = getNextReminderTime(currentSettings.time)
    const delay = nextTime.getTime() - Date.now()
    
    reminderTimer = setTimeout(() => {
      showNotification('慧记提醒', currentSettings.message)
      scheduleNextReminder()
    }, delay)
  }
  
  scheduleNextReminder()
}

export function stopReminder() {
  if (reminderTimer) {
    clearTimeout(reminderTimer)
    reminderTimer = null
  }
}

export function initReminder() {
  getReminderSettings().then(settings => {
    if (settings.enabled) {
      startReminder()
    }
  })
}

// 获取备份提醒设置
export async function getBackupReminderSettings() {
  const enabled = await getSetting(BACKUP_REMINDER_ENABLED_KEY)
  const lastBackup = await getSetting(LAST_BACKUP_DATE_KEY)
  
  return {
    enabled: !!enabled,
    lastBackupDate: lastBackup || null,
    daysSinceBackup: lastBackup ? Math.floor((Date.now() - new Date(lastBackup).getTime()) / (1000 * 60 * 60 * 24)) : null,
  }
}

// 保存备份提醒设置
export async function setBackupReminderSettings(settings) {
  if (settings.enabled !== undefined) {
    await saveSetting(BACKUP_REMINDER_ENABLED_KEY, settings.enabled)
  }
  if (settings.updateLastBackup) {
    await saveSetting(LAST_BACKUP_DATE_KEY, new Date().toISOString())
  }
}

// 检查是否需要备份提醒
export async function checkBackupReminder() {
  const settings = await getBackupReminderSettings()
  
  if (!settings.enabled) return false
  
  // 如果从未备份过，或者距离上次备份超过7天
  if (!settings.lastBackupDate || (settings.daysSinceBackup !== null && settings.daysSinceBackup >= BACKUP_REMINDER_DAYS)) {
    return true
  }
  
  return false
}

// 记录当前备份时间
export async function recordBackupDate() {
  await saveSetting(LAST_BACKUP_DATE_KEY, new Date().toISOString())
}

// 格式化备份日期显示
export function formatLastBackupDate(dateStr) {
  if (!dateStr) return '从未备份'
  
  const date = new Date(dateStr)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
  
  if (diffDays === 0) return '今天'
  if (diffDays === 1) return '昨天'
  if (diffDays < 7) return `${diffDays}天前`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}周前`
  return `${Math.floor(diffDays / 30)}个月前`
}

export default {
  getReminderSettings,
  setReminderSettings,
  requestNotificationPermission,
  showNotification,
  startReminder,
  stopReminder,
  initReminder,
  getBackupReminderSettings,
  setBackupReminderSettings,
  checkBackupReminder,
  recordBackupDate,
  formatLastBackupDate,
}
