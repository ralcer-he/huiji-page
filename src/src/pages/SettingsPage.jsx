import { useState } from 'react'
import ThemeSwitcher from '../components/ThemeSwitcher'
import Icon from '../components/ui/Icon'
import ProfileSettingsPanel from '../components/settings/ProfileSettingsPanel'
import AISettingsPanel from '../components/settings/AISettingsPanel'
import XiaohuiSettingsPanel from '../components/settings/XiaohuiSettingsPanel'
import PrivacySettingsPanel from '../components/settings/PrivacySettingsPanel'
import ReminderSettingsPanel from '../components/settings/ReminderSettingsPanel'
import ToolbarSettings from '../components/settings/ToolbarSettings'
import DataManagementModal from '../components/settings/DataManagementModal'
import AboutModal from '../components/settings/AboutModal'
import ContactAuthorModal from '../components/settings/ContactAuthorModal'
import { exportAllData } from '../db/database'
import { recordBackupDate } from '../utils/reminder'
import { saveOrShareFile } from '../utils/fileHelper'
import { CURRENT_VERSION, forceCheckUpdate } from '../utils/updateChecker'

function SettingsPage() {
  const [showDataModal, setShowDataModal] = useState(false)
  const [showAboutModal, setShowAboutModal] = useState(false)
  const [lastBackupDate, setLastBackupDate] = useState(null)
  const [backingUp, setBackingUp] = useState(false)
  const [updateChecking, setUpdateChecking] = useState(false)
  const [updateResult, setUpdateResult] = useState(null) // null | { hasUpdate, latest }
  const [showContactModal, setShowContactModal] = useState(false)

  const handleBackupNow = async () => {
    if (backingUp) return
    setBackingUp(true)
    try {
      const data = await exportAllData()
      const json = JSON.stringify(data, null, 2)
      await saveOrShareFile(json, `慧记数据_${new Date().toISOString().split('T')[0]}.json`, 'application/json', { title: '备份慧记数据' })
      await recordBackupDate()
      setLastBackupDate(new Date().toISOString())
    } catch (err) {
      console.error('备份失败:', err)
      alert('备份失败，请重试')
    }
    setBackingUp(false)
  }

  const handleCheckUpdate = async () => {
    // 如果已经有更新结果，点击直接跳转到更新页面
    if (updateResult?.hasUpdate) {
      window.open(updateResult.latest?.htmlUrl, '_blank')
      return
    }
    if (updateChecking) return
    setUpdateChecking(true)
    try {
      const result = await forceCheckUpdate()
      setUpdateResult(result)
    } catch {
      setUpdateResult(null)
    }
    setUpdateChecking(false)
  }

  const settingItems = [
    { iconName: 'save', label: '数据管理', desc: '导出/导入/清空', onClick: () => setShowDataModal(true) },
    { iconName: 'refresh', label: '检查更新', desc: updateChecking ? '检查中...' : (updateResult?.hasUpdate ? `发现新版本 ${updateResult.latest?.name}` : `当前版本 v${CURRENT_VERSION}`), onClick: handleCheckUpdate },
    { iconName: 'mail', label: '联系作者', desc: '建议与反馈', onClick: () => setShowContactModal(true) },
    { iconName: 'info', label: '关于慧记', desc: 'AI 情绪感知日记', onClick: () => setShowAboutModal(true) },
  ]

  return (
    <div className="w-full py-6 pb-24 animate-fade-in max-w-[800px] mx-auto">
      {/* 设置项容器 */}
      <div className="huiji-card overflow-hidden p-6">
        {/* 个人信息 */}
        <ProfileSettingsPanel />

        <div className="border-t" style={{ borderColor: 'var(--rule)' }} />

        {/* 外观设置 */}
        <div className="mb-4">
          <div className="text-sm font-medium" style={{ color: 'var(--ink)' }}>外观设置</div>
        </div>
        <div className="mb-6">
          <div className="flex items-center justify-between h-12 px-4 rounded-[8px]" style={{ backgroundColor: 'var(--bg)' }}>
            <div className="flex items-center gap-3">
              <Icon name="palette" size={18} color="var(--muted)" />
              <span className="text-sm" style={{ color: 'var(--ink)' }}>主题模式</span>
            </div>
            <ThemeSwitcher variant="inline" />
          </div>
        </div>

        <div className="border-t mb-6" style={{ borderColor: 'var(--rule)' }} />

        {/* AI 设置 */}
        <AISettingsPanel />

        <div className="border-t" style={{ borderColor: 'var(--rule)' }} />

        {/* 小慧 */}
        <XiaohuiSettingsPanel />

        <div className="border-t" style={{ borderColor: 'var(--rule)' }} />

        {/* 隐私保护 */}
        <PrivacySettingsPanel />

        <div className="border-t" style={{ borderColor: 'var(--rule)' }} />

        {/* 工具栏定制 */}
        <ToolbarSettings />

        <div className="border-t" style={{ borderColor: 'var(--rule)' }} />

        {/* 提醒通知 */}
        <ReminderSettingsPanel
          lastBackupDate={lastBackupDate}
          onLastBackupDateChange={setLastBackupDate}
          onBackupNow={handleBackupNow}
          backingUp={backingUp}
        />

        <div className="border-t my-6" style={{ borderColor: 'var(--rule)' }} />

        {/* 数据管理 / 关于 */}
        <div>
          <div className="mb-4">
            <div className="text-sm font-medium" style={{ color: 'var(--ink)' }}>数据与关于</div>
          </div>
          {settingItems.map((item, index) => (
            <button
              key={index}
              onClick={item.onClick || undefined}
              disabled={!item.onClick}
              className="w-full flex items-center gap-3 h-12 px-4 rounded-[8px] text-left transition-all duration-200 hover:bg-[var(--bg2)] group disabled:cursor-default disabled:hover:bg-transparent"
            >
              <Icon name={item.iconName} size={18} color="var(--muted)" />
              <div className="flex-1">
                <div className="text-sm" style={{ color: 'var(--ink)' }}>{item.label}</div>
                <div className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>{item.desc}</div>
              </div>
              {item.onClick && (
                <Icon name="chevron-right" size={16} color="var(--muted)" className="transition-transform duration-200 group-hover:translate-x-1" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* 底部版本号 */}
      <div className="mt-8 text-center">
        <p className="text-xs" style={{ color: 'var(--muted)' }}>慧记 v{CURRENT_VERSION}</p>
      </div>

      {/* 数据管理弹窗 */}
      {showDataModal && (
        <DataManagementModal
          onClose={() => setShowDataModal(false)}
          onRefresh={() => {}}
          onBackupComplete={setLastBackupDate}
        />
      )}

      {/* 关于慧记弹窗 */}
      {showAboutModal && (
        <AboutModal onClose={() => setShowAboutModal(false)} />
      )}

      {/* 联系作者弹窗 */}
      {showContactModal && (
        <ContactAuthorModal onClose={() => setShowContactModal(false)} />
      )}
    </div>
  )
}

export default SettingsPage
