import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { hashPIN, verifyPIN, MAX_ATTEMPTS, LOCKOUT_DURATION_MS } from '../utils/security'
import { getSetting, saveSetting } from '../db/database'
import Icon from './ui/Icon'

// PIN 锁超时选项（毫秒）
export const PIN_TIMEOUT_OPTIONS = [
  { value: 0, label: '每次都验证', desc: '每次打开应用都需要验证' },
  { value: 300000, label: '5 分钟', desc: '5分钟后需重新验证' },
  { value: 900000, label: '15 分钟', desc: '15分钟后需重新验证' },
  { value: 1800000, label: '30 分钟', desc: '30分钟后需重新验证' },
  { value: 3600000, label: '1 小时', desc: '1小时后需重新验证' },
]

function PINLock({ onUnlock }) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [failedAttempts, setFailedAttempts] = useState(0)
  const [lockoutUntil, setLockoutUntil] = useState(null)
  const [pinHash, setPinHash] = useState('')
  const [loading, setLoading] = useState(true)
  const [shake, setShake] = useState(false)
  const [pinTimeout, setPinTimeout] = useState(0) // 超时时间（毫秒）

  const isLocked = lockoutUntil && new Date(lockoutUntil) > new Date()

  useEffect(() => {
    loadLockState()
  }, [])

  const loadLockState = async () => {
    const hash = await getSetting('pinHash')
    const attempts = await getSetting('pinFailedAttempts') || 0
    const lockout = await getSetting('pinLockoutUntil')
    const timeout = await getSetting('pinTimeout') || 0
    const lastUnlock = await getSetting('pinLastUnlockTime')
    
    setPinHash(hash)
    setFailedAttempts(attempts)
    setPinTimeout(timeout)
    
    // 检查是否在超时时间内
    if (lastUnlock && timeout > 0) {
      const lastUnlockTime = new Date(lastUnlock).getTime()
      const now = Date.now()
      if (now - lastUnlockTime < timeout) {
        // 在超时时间内，直接解锁
        onUnlock?.()
        setLoading(false)
        return
      }
    }
    
    if (lockout && new Date(lockout) > new Date()) {
      setLockoutUntil(lockout)
    }
    
    setLoading(false)
  }

  const handleKeyPress = useCallback((num) => {
    if (pin.length >= 4 || isLocked) return
    const newPin = pin + num
    setPin(newPin)
    setError('')
    
    if (newPin.length === 4) {
      verifyAndUnlock(newPin)
    }
  }, [pin, isLocked])

  const handleDelete = useCallback(() => {
    if (pin.length > 0) {
      setPin(pin.slice(0, -1))
      setError('')
    }
  }, [pin])

  const handleClear = useCallback(() => {
    setPin('')
    setError('')
  }, [])

  const verifyAndUnlock = async (pinToVerify) => {
    const isValid = await verifyPIN(pinToVerify, pinHash)
    
    if (isValid) {
      await saveSetting('pinFailedAttempts', 0)
      await saveSetting('pinLockoutUntil', null)
      await saveSetting('pinLastUnlockTime', new Date().toISOString())
      setFailedAttempts(0)
      setLockoutUntil(null)
      onUnlock?.()
    } else {
      const newAttempts = failedAttempts + 1
      setFailedAttempts(newAttempts)
      await saveSetting('pinFailedAttempts', newAttempts)
      
      setShake(true)
      setTimeout(() => setShake(false), 500)
      
      if (newAttempts >= MAX_ATTEMPTS) {
        const lockoutTime = new Date(Date.now() + LOCKOUT_DURATION_MS).toISOString()
        setLockoutUntil(lockoutTime)
        await saveSetting('pinLockoutUntil', lockoutTime)
        setError(`尝试次数过多，请 ${Math.ceil(LOCKOUT_DURATION_MS / 60000)} 分钟后再试`)
      } else {
        setError(`PIN 码错误，还剩 ${MAX_ATTEMPTS - newAttempts} 次机会`)
      }
      
      setTimeout(() => setPin(''), 300)
    }
  }

  const getLockoutRemaining = () => {
    if (!isLocked) return ''
    const remaining = new Date(lockoutUntil) - new Date()
    const minutes = Math.floor(remaining / 60000)
    const seconds = Math.floor((remaining % 60000) / 1000)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const [, setTick] = useState(0)
  useEffect(() => {
    if (!isLocked) return
    const timer = setInterval(() => setTick(t => t + 1), 1000)
    return () => clearInterval(timer)
  }, [isLocked])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg)' }}>
        <div className="animate-pulse" style={{ color: 'var(--muted)' }}>加载中...</div>
      </div>
    )
  }

  return (
    <div 
      className="min-h-screen flex flex-col items-center justify-center px-6 animate-fade-in"
      style={{ backgroundColor: 'var(--bg)' }}
    >
      <div className={`w-full max-w-xs ${shake ? 'animate-shake' : ''}`}>
        <div className="text-center mb-7">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-2xl font-bold mx-auto mb-5"
            style={{
              backgroundColor: 'var(--accent)',
            }}
          >
            慧
          </div>
          <h1 className="text-xl font-bold mb-1" style={{ color: 'var(--ink)' }}>
            欢迎回来
          </h1>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>
            请输入 PIN 码解锁
          </p>
        </div>

        <div className="flex justify-center gap-6 mb-5">
          {[0, 1, 2, 3].map(i => (
            <div
              key={i}
              className="w-3 h-3 rounded-full transition-all duration-200"
              style={{
                backgroundColor: i < pin.length ? 'var(--accent)' : 'transparent',
                border: `2px solid ${i < pin.length ? 'var(--accent)' : 'var(--rule)'}`,
              }}
            />
          ))}
        </div>

        <div className="h-5 text-center mb-3">
          {error && (
            <p className="text-xs animate-fade-in font-medium" style={{ color: '#ef4444' }}>
              {isLocked ? `已锁定，${getLockoutRemaining()} 后解锁` : error}
            </p>
          )}
        </div>

        <div className="px-4">
          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
              <button
                key={num}
                onClick={() => handleKeyPress(num.toString())}
                disabled={isLocked}
                className="w-14 h-14 rounded-xl text-xl font-medium transition-colors duration-150 disabled:opacity-40"
                style={{
                  backgroundColor: 'var(--bg2)',
                  color: 'var(--ink)',
                }}
              >
                {num}
              </button>
            ))}
            
            <button
              onClick={handleClear}
              disabled={isLocked || pin.length === 0}
              className="w-14 h-14 rounded-xl text-xs font-medium transition-colors duration-150 disabled:opacity-30"
              style={{
                backgroundColor: 'var(--bg2)',
                color: 'var(--muted)',
              }}
            >
              清空
            </button>
            
            <button
              onClick={() => handleKeyPress('0')}
              disabled={isLocked}
              className="w-14 h-14 rounded-xl text-xl font-medium transition-colors duration-150 disabled:opacity-40"
              style={{
                backgroundColor: 'var(--bg2)',
                color: 'var(--ink)',
              }}
            >
              0
            </button>
            
            <button
              onClick={handleDelete}
              disabled={isLocked || pin.length === 0}
              className="w-14 h-14 rounded-xl text-xl transition-colors duration-150 disabled:opacity-30 flex items-center justify-center"
              style={{ 
                backgroundColor: 'var(--bg2)',
                color: 'var(--muted)',
              }}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l6.5-6.5A2 2 0 0110.914 5H20a2 2 0 012 2v10a2 2 0 01-2 2H10.914a2 2 0 01-1.414-.586L3 12z" />
              </svg>
            </button>
          </div>
        </div>

        <div className="mt-6 text-center">
          <p className="text-xs" style={{ color: 'var(--muted)' }}>
            忘记 PIN 码？需清空数据后重新设置
          </p>
        </div>
      </div>
    </div>
  )
}

function PINSetupModal({ isOpen, onClose, onSetup }) {
  const [step, setStep] = useState('new')
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (isOpen) {
      setStep('new')
      setNewPin('')
      setConfirmPin('')
      setError('')
    }
  }, [isOpen])

  const handleKeyPress = (num) => {
    setError('')
    if (step === 'new') {
      if (newPin.length >= 4) return
      const nextPin = newPin + num
      setNewPin(nextPin)
      if (nextPin.length === 4) {
        setTimeout(() => {
          setStep('confirm')
        }, 300)
      }
    } else {
      if (confirmPin.length >= 4) return
      const nextPin = confirmPin + num
      setConfirmPin(nextPin)
      if (nextPin.length === 4) {
        handleConfirm(nextPin)
      }
    }
  }

  const handleDelete = () => {
    setError('')
    if (step === 'new' && newPin.length > 0) {
      setNewPin(newPin.slice(0, -1))
    } else if (step === 'confirm' && confirmPin.length > 0) {
      setConfirmPin(confirmPin.slice(0, -1))
    }
  }

  const handleClear = () => {
    setError('')
    if (step === 'new') {
      setNewPin('')
    } else {
      setConfirmPin('')
    }
  }

  const handleConfirm = async (pin) => {
    if (pin !== newPin) {
      setError('两次输入不一致，请重新设置')
      setTimeout(() => {
        setStep('new')
        setNewPin('')
        setConfirmPin('')
      }, 1500)
      return
    }
    
    const hash = await hashPIN(pin)
    onSetup?.(hash)
  }

  if (!isOpen) return null

  return typeof document !== 'undefined' ? createPortal(
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center animate-fade-in"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
      onClick={(e) => e.target === e.currentTarget && onClose?.()}
    >
      <div 
        className="w-72 rounded-3xl overflow-hidden animate-slide-up"
        style={{ backgroundColor: 'var(--bg)' }}
      >
        <div className="text-center pt-8 pb-5">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4"
            style={{
              backgroundColor: 'var(--accent)',
            }}
          >
            <Icon name="lock" size={22} color="white" strokeWidth={1.5} />
          </div>
          <h3 className="text-lg font-bold mb-1" style={{ color: 'var(--ink)' }}>
            {step === 'new' ? '设置 PIN 码' : '确认 PIN 码'}
          </h3>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>
            {step === 'new' ? '请输入 4 位数字' : '请再次输入确认'}
          </p>
        </div>

        <div className="flex justify-center gap-6 mb-6">
          {[0, 1, 2, 3].map(i => {
            const currentLength = step === 'new' ? newPin.length : confirmPin.length
            return (
              <div
                key={i}
                className="w-3 h-3 rounded-full transition-all duration-200"
                style={{
                  backgroundColor: i < currentLength ? 'var(--accent)' : 'transparent',
                  border: `2px solid ${i < currentLength ? 'var(--accent)' : 'var(--rule)'}`,
                }}
              />
            )
          })}
        </div>

        <div className="h-5 text-center px-6 mb-4">
          {error && (
            <p className="text-xs animate-fade-in font-medium" style={{ color: '#ef4444' }}>
              {error}
            </p>
          )}
        </div>

        <div className="px-6 pb-6 flex justify-center">
          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
              <button
                key={num}
                onClick={() => handleKeyPress(num.toString())}
                className="w-14 h-14 rounded-xl text-xl font-medium transition-colors duration-150"
                style={{
                  backgroundColor: 'var(--bg2)',
                  color: 'var(--ink)',
                }}
              >
                {num}
              </button>
            ))}
            
            <button
              onClick={handleClear}
              disabled={(step === 'new' ? newPin.length : confirmPin.length) === 0}
              className="w-14 h-14 rounded-xl text-xs font-medium transition-colors duration-150 disabled:opacity-30"
              style={{
                backgroundColor: 'var(--bg2)',
                color: 'var(--muted)',
              }}
            >
              清空
            </button>
            
            <button
              onClick={() => handleKeyPress('0')}
              className="w-14 h-14 rounded-xl text-xl font-medium transition-colors duration-150"
              style={{
                backgroundColor: 'var(--bg2)',
                color: 'var(--ink)',
              }}
            >
              0
            </button>
            
            <button
              onClick={handleDelete}
              disabled={(step === 'new' ? newPin.length : confirmPin.length) === 0}
              className="w-14 h-14 rounded-xl text-xl transition-colors duration-150 disabled:opacity-30 flex items-center justify-center"
              style={{ 
                backgroundColor: 'var(--bg2)',
                color: 'var(--muted)',
              }}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l6.5-6.5A2 2 0 0110.914 5H20a2 2 0 012 2v10a2 2 0 01-2 2H10.914a2 2 0 01-1.414-.586L3 12z" />
              </svg>
            </button>
          </div>
        </div>

        <div className="px-6 pb-6">
          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl text-sm font-medium transition-colors duration-200"
            style={{ 
              backgroundColor: 'var(--accent)',
              color: 'white',
            }}
          >
            取消
          </button>
        </div>
      </div>
    </div>,
    document.body
  ) : null
}

export { PINLock, PINSetupModal }
export default PINLock
