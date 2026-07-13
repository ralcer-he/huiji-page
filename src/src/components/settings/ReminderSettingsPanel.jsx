import { useState, useEffect } from 'react'
import {
  getReminderSettings,
  setReminderSettings,
  requestNotificationPermission,
  showNotification,
  getBackupReminderSettings,
  setBackupReminderSettings,
  formatLastBackupDate,
  recordBackupDate,
} from '../../utils/reminder'
import Toggle from '../ui/Toggle'
import Collapsible from '../ui/Collapsible'
import Icon from '../ui/Icon'

function ReminderSettingsPanel({ lastBackupDate, onLastBackupDateChange, onBackupNow, backingUp }) {
  const [reminderEnabled, setReminderEnabled] = useState(false)
  const [reminderTime, setReminderTime] = useState('21:00')
  const [reminderMessage, setReminderMessage] = useState('今天记录了吗？来慧记写点什么')
  const [notificationPermission, setNotificationPermission] = useState('default')
  const [testNotifStatus, setTestNotifStatus] = useState('')
  const [backupReminderEnabled, setBackupReminderEnabled] = useState(false)

  useEffect(() => {
    loadReminderSettings()
    loadBackupReminderSettings()
    checkNotificationPermission()
  }, [])

  const checkNotificationPermission = () => {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission)
    }
  }

  const loadReminderSettings = async () => {
    const settings = await getReminderSettings()
    setReminderEnabled(settings.enabled)
    setReminderTime(settings.time)
    setReminderMessage(settings.message)
  }

  const loadBackupReminderSettings = async () => {
    const settings = await getBackupReminderSettings()
    setBackupReminderEnabled(settings.enabled)
  }

  const handleToggleReminder = async (enabled) => {
    if (enabled) {
      if (notificationPermission === 'denied') {
        alert('通知权限已被拒绝，请在浏览器设置中手动开启通知权限')
        return
      }
      if (notificationPermission !== 'granted') {
        const hasPermission = await requestNotificationPermission()
        if (!hasPermission) {
          alert('请允许通知权限，才能开启每日提醒')
          return
        }
        setNotificationPermission('granted')
      }
    }
    setReminderEnabled(enabled)
    await setReminderSettings({ enabled })
  }

  const handleReminderTimeChange = async (time) => {
    setReminderTime(time)
    await setReminderSettings({ time })
  }

  const handleReminderMessageChange = async (message) => {
    setReminderMessage(message)
    await setReminderSettings({ message })
  }

  const handleTestReminder = async () => {
    if (!('Notification' in window)) {
      setTestNotifStatus('error')
      alert('您的浏览器不支持通知功能')
      return
    }

    if (Notification.permission === 'granted') {
      showNotification('慧记提醒测试', reminderMessage)
      setTestNotifStatus('success')
      setTimeout(() => setTestNotifStatus(''), 3000)
    } else if (Notification.permission === 'denied') {
      setTestNotifStatus('error')
      alert('通知权限已被拒绝，请在浏览器设置中开启通知权限')
    } else {
      const hasPermission = await requestNotificationPermission()
      if (hasPermission) {
        setNotificationPermission('granted')
        showNotification('慧记提醒测试', reminderMessage)
        setTestNotifStatus('success')
        setTimeout(() => setTestNotifStatus(''), 3000)
      } else {
        setTestNotifStatus('error')
        alert('需要通知权限才能发送提醒')
      }
    }
  }

  const handleToggleBackupReminder = async (enabled) => {
    await setBackupReminderSettings({ enabled })
    setBackupReminderEnabled(enabled)
  }

  const handleBackupNow = async () => {
    await recordBackupDate()
    if (onLastBackupDateChange) onLastBackupDateChange(new Date().toISOString())
    if (onBackupNow) onBackupNow()
  }

  return (
    <div>
      <h3 className="text-sm font-medium px-5 pt-5 pb-3" style={{ color: 'var(--ink)' }}>提醒通知</h3>

      {/* 每日提醒 - 独立 Collapsible */}
      <Collapsible
        title="每日提醒"
        iconName="bell"
        hint={reminderEnabled ? `已开启 · ${reminderTime}` : '未开启'}
      >
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-xl" style={{ backgroundColor: 'var(--bg)' }}>
            <div>
              <span className="text-sm" style={{ color: 'var(--ink)' }}>开启每日提醒</span>
              {notificationPermission !== 'granted' && reminderEnabled && (
                <p className="text-xs mt-0.5" style={{ color: '#f59e0b' }}>
                  <Icon name="alert" size={10} color="#f59e0b" className="inline mr-1" />
                  通知权限未开启
                </p>
              )}
            </div>
            <Toggle
              checked={reminderEnabled}
              onChange={(val) => handleToggleReminder(val)}
            />
          </div>

          {reminderEnabled && (
            <div className="p-3 rounded-xl space-y-3" style={{ backgroundColor: 'var(--bg)' }}>
              <div>
                <label className="text-xs block mb-2" style={{ color: 'var(--muted)' }}>提醒时间</label>
                <input
                  type="time"
                  value={reminderTime}
                  onChange={(e) => handleReminderTimeChange(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                  style={{ backgroundColor: 'var(--bg2)', color: 'var(--ink)', border: '1px solid var(--rule)' }}
                />
              </div>

              <div>
                <label className="text-xs block mb-2" style={{ color: 'var(--muted)' }}>提醒内容</label>
                <input
                  type="text"
                  value={reminderMessage}
                  onChange={(e) => handleReminderMessageChange(e.target.value)}
                  placeholder="输入提醒内容..."
                  className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                  style={{ backgroundColor: 'var(--bg2)', color: 'var(--ink)', border: '1px solid var(--rule)' }}
                />
              </div>

              <button
                onClick={handleTestReminder}
                className="w-full py-2 rounded-lg text-sm font-medium transition-all"
                style={{
                  backgroundColor: testNotifStatus === 'success' ? '#10b981' : testNotifStatus === 'error' ? '#ef4444' : 'var(--bg2)',
                  color: testNotifStatus ? 'white' : 'var(--accent)',
                  border: '1px solid var(--rule)',
                }}
              >
                {testNotifStatus === 'success' ? '通知已发送' : testNotifStatus === 'error' ? '发送失败' : '发送测试通知'}
              </button>
            </div>
          )}
        </div>
      </Collapsible>

      {/* 数据备份提醒 - 独立 Collapsible */}
      <Collapsible
        title="数据备份提醒"
        iconName="save"
        hint={`上次备份：${formatLastBackupDate(lastBackupDate)}`}
      >
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-xl" style={{ backgroundColor: 'var(--bg)' }}>
            <div>
              <span className="text-sm" style={{ color: 'var(--ink)' }}>开启备份提醒</span>
              <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>每7天提醒一次备份数据</p>
            </div>
            <Toggle
              checked={backupReminderEnabled}
              onChange={(val) => handleToggleBackupReminder(val)}
            />
          </div>

          <button
            onClick={handleBackupNow}
            disabled={backingUp}
            className="w-full py-3 rounded-xl text-sm font-medium transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: 'var(--accent)', color: 'white' }}
          >
            {backingUp ? '备份中...' : '立即备份数据'}
          </button>
        </div>
      </Collapsible>
    </div>
  )
}

export default ReminderSettingsPanel
