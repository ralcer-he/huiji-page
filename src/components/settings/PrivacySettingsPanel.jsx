import { useState, useEffect } from 'react'
import { getSetting, saveSetting, deleteSetting } from '../../db/database'
import { PINSetupModal, PIN_TIMEOUT_OPTIONS } from '../PINLock'
import Toggle from '../ui/Toggle'
import Collapsible from '../ui/Collapsible'

function PrivacySettingsPanel() {
  const [pinEnabled, setPinEnabled] = useState(false)
  const [pinTimeout, setPinTimeout] = useState(0)
  const [showPINModal, setShowPINModal] = useState(false)

  useEffect(() => {
    loadPINSettings()
  }, [])

  const loadPINSettings = async () => {
    const enabled = await getSetting('pinEnabled')
    setPinEnabled(!!enabled)
    const timeout = await getSetting('pinTimeout')
    setPinTimeout(timeout || 0)
  }

  const handlePINSetup = async (pinHash) => {
    try {
      await saveSetting('pinHash', pinHash)
      await saveSetting('pinEnabled', true)
      setPinEnabled(true)
      setShowPINModal(false)
    } catch (err) {
      console.error('设置 PIN 失败:', err)
    }
  }

  const handleDisablePIN = async () => {
    if (!confirm('确定要关闭 PIN 码保护吗？')) return
    try {
      await deleteSetting('pinHash')
      await deleteSetting('pinEnabled')
      await deleteSetting('pinFailedAttempts')
      await deleteSetting('pinLockoutUntil')
      setPinEnabled(false)
    } catch (err) {
      console.error('关闭 PIN 失败:', err)
    }
  }

  const isTimeoutActive = (opt) => pinTimeout === opt.value || (pinTimeout === undefined && opt.value === 0)

  return (
    <div>
      <h3 className="text-sm font-medium px-5 pt-5 pb-3" style={{ color: 'var(--ink)' }}>隐私保护</h3>

      <Collapsible title="PIN 码保护" iconName="lock" hint={pinEnabled ? '已开启' : '未开启'}>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-xl" style={{ backgroundColor: 'var(--bg)' }}>
            <span className="text-sm" style={{ color: 'var(--ink)' }}>启用 PIN 码</span>
            <Toggle
              checked={pinEnabled}
              onChange={() => {
                if (pinEnabled) {
                  handleDisablePIN()
                } else {
                  setShowPINModal(true)
                }
              }}
            />
          </div>

          {pinEnabled && (
            <>
              <button
                onClick={() => setShowPINModal(true)}
                className="w-full p-3 rounded-xl text-sm font-medium transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                style={{ backgroundColor: 'var(--bg2)', color: 'var(--ink)', border: '1px solid var(--rule)' }}
              >
                修改 PIN 码
              </button>

              <div className="mt-3">
                <p className="text-xs mb-2 px-1" style={{ color: 'var(--muted)' }}>验证频率</p>
                <div className="grid grid-cols-2 gap-2">
                  {PIN_TIMEOUT_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={async () => {
                        await saveSetting('pinTimeout', opt.value)
                        setPinTimeout(opt.value)
                      }}
                      className="p-2 rounded-xl text-center transition-all duration-200 hover:scale-[1.02]"
                      style={{
                        backgroundColor: isTimeoutActive(opt) ? 'var(--accent)' : 'var(--bg)',
                        color: isTimeoutActive(opt) ? '#fff' : 'var(--ink)',
                      }}
                    >
                      <div className="text-sm font-medium">{opt.label}</div>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </Collapsible>

      <PINSetupModal
        isOpen={showPINModal}
        onClose={() => setShowPINModal(false)}
        onSetup={handlePINSetup}
      />
    </div>
  )
}

export default PrivacySettingsPanel
