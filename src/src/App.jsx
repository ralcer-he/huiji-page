import { useState, useEffect, useRef, useCallback } from 'react'
import { Routes, Route, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import BottomNav from './components/layout/BottomNav'
import Sidebar from './components/layout/Sidebar'
import MobileSidebar from './components/layout/MobileSidebar'
import PINLock from './components/PINLock'
import Icon from './components/ui/Icon'
import WritePage from './pages/WritePage'
import TimelinePage from './pages/TimelinePage'
import CalendarPage from './pages/CalendarPage'
import SettingsPage from './pages/SettingsPage'
import StatsPage from './pages/StatsPage'
import XiaohuiPage from './pages/XiaohuiPage'
import { getSetting, cleanupLegacyData } from './db/database'
import { initReminder } from './utils/reminder'
import { checkAndGenerateLetters, cleanupTestLetters } from './utils/letterService'
import { Capacitor } from '@capacitor/core'
import { App as CapacitorApp } from '@capacitor/app'
import { StatusBar, Style } from '@capacitor/status-bar'
import { Keyboard } from '@capacitor/keyboard'
import XiaohuiFab from './components/XiaohuiFab'
import { checkForUpdate, CURRENT_VERSION } from './utils/updateChecker'

function DesktopContent() {
  const location = useLocation()
  const isEditor = location.pathname === '/write'
  const maxWidth = isEditor ? 'max-w-[900px]' : 'max-w-[1100px]'
  return (
    <div className={`w-full ${maxWidth} py-10 px-8 h-full`}>
      {location.pathname === '/xiaohui' ? (
        <XiaohuiPage />
      ) : (
        <Routes>
          <Route path="/write" element={<WritePage />} />
          <Route path="/timeline" element={<TimelinePage />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/stats" element={<StatsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/write" replace />} />
        </Routes>
      )}
    </div>
  )
}

function MobileDatePicker() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [showPicker, setShowPicker] = useState(false)
  const [viewMode, setViewMode] = useState('month') // 'month' | 'year'
  const [viewDate, setViewDate] = useState(() => {
    const dateParam = searchParams.get('date')
    const d = dateParam ? new Date(dateParam) : new Date()
    return isNaN(d.getTime()) ? new Date() : d
  })
  const pickerRef = useRef(null)

  const getSelectedDate = () => {
    const dateParam = searchParams.get('date')
    const date = dateParam ? new Date(dateParam) : new Date()
    return isNaN(date.getTime()) ? new Date() : date
  }

  const selectedDate = getSelectedDate()
  const formatShort = (d) => `${d.getMonth() + 1}月${d.getDate()}日`

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) {
        setShowPicker(false)
        setViewMode('month')
      }
    }
    if (showPicker) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showPicker])

  const selectDate = (y, m, d) => {
    const mm = String(m + 1).padStart(2, '0')
    const dd = String(d).padStart(2, '0')
    const sp = new URLSearchParams(searchParams)
    sp.set('date', `${y}-${mm}-${dd}`)
    setSearchParams(sp)
    setShowPicker(false)
    setViewMode('month')
  }

  const today = new Date()
  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()

  // 月视图数据
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstDay = new Date(year, month, 1).getDay()
  const prevMonthDays = new Date(year, month, 0).getDate()

  const cells = []
  for (let i = firstDay - 1; i >= 0; i--) {
    cells.push({ day: prevMonthDays - i, m: month === 0 ? 11 : month - 1, y: month === 0 ? year - 1 : year, current: false })
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, m: month, y: year, current: true })
  }
  const rem = 42 - cells.length
  for (let d = 1; d <= rem; d++) {
    cells.push({ day: d, m: month === 11 ? 0 : month + 1, y: month === 11 ? year + 1 : year, current: false })
  }

  // 年视图：12个月的小日历
  const MONTH_NAMES = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月']
  const WEEK_SHORT = ['日','一','二','三','四','五','六']

  const miniDays = (y, m) => {
    const count = new Date(y, m + 1, 0).getDate()
    const first = new Date(y, m, 1).getDay()
    const prevCount = new Date(y, m, 0).getDate()
    const arr = []
    for (let i = first - 1; i >= 0; i--) {
      arr.push({ day: prevCount - i, current: false })
    }
    for (let d = 1; d <= count; d++) {
      arr.push({ day: d, current: true })
    }
    while (arr.length < 42) {
      arr.push({ day: arr.length - count - first + 1, current: false })
    }
    return arr
  }

  const handleMonthClick = (m) => {
    setViewDate(new Date(year, m, 1))
    setViewMode('month')
  }

  return (
    <div ref={pickerRef}>
      <button
        onClick={() => {
          if (!showPicker) {
            setViewDate(selectedDate)
            setViewMode('month')
          }
          setShowPicker(!showPicker)
        }}
        className="flex items-center gap-1 px-2 py-1 rounded-lg font-medium text-[15px] hover:bg-white/10 transition-colors header-text"
        style={{ color: 'var(--header-text)' }}
      >
        {formatShort(selectedDate)}
        <Icon name={showPicker ? 'chevron-up' : 'chevron-down'} size={14} color="var(--header-text)" strokeWidth={2} />
      </button>
      {showPicker && (
        <div className="fixed top-[44px] left-0 right-0 z-50 shadow-lg animate-fade-in overflow-y-auto" style={{ backgroundColor: 'var(--header-bg)', maxHeight: '85vh' }}>
          {/* 标题栏：左箭头 + 中年月 + 右(今日+年视图+右箭头) */}
          <div className="flex items-center justify-between px-2 pt-3 pb-2 relative">
            <button onClick={() => setViewDate(new Date(year, month - 1, 1))} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10">
              <Icon name="chevron-left" size={22} color="var(--header-text)" strokeWidth={2} />
            </button>
            <span className="text-white font-medium text-[16px] absolute left-1/2 -translate-x-1/2">{year}年{month + 1}月</span>
            <div className="flex items-center">
              <button
                onClick={() => {
                  setViewDate(today)
                  selectDate(today.getFullYear(), today.getMonth(), today.getDate())
                }}
                className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10"
                title="今天"
              >
                <Icon name="calendar" size={20} color="white" strokeWidth={1.5} />
              </button>
              <button
                onClick={() => setViewMode(viewMode === 'month' ? 'year' : 'month')}
                className="text-white/90 text-[14px] font-medium hover:text-white transition-colors px-1"
              >
                {viewMode === 'month' ? '年视图' : '月视图'}
              </button>
              <button onClick={() => setViewDate(new Date(year, month + 1, 1))} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10">
                <Icon name="chevron-right" size={22} color="white" strokeWidth={2} />
              </button>
            </div>
          </div>

          {viewMode === 'month' ? (
            <>
              <div className="grid grid-cols-7 px-4 mb-1">
                {WEEK_SHORT.map(w => (
                  <div key={w} className="w-10 h-10 flex items-center justify-center text-white/70 text-[13px]">{w}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 px-4 pb-2">
                {cells.map((c, i) => {
                  const isToday = c.current && c.y === today.getFullYear() && c.m === today.getMonth() && c.day === today.getDate()
                  const isSel = c.current && c.y === selectedDate.getFullYear() && c.m === selectedDate.getMonth() && c.day === selectedDate.getDate()
                  return (
                    <button
                      key={i}
                      onClick={() => selectDate(c.y, c.m, c.day)}
                      className={`h-10 w-10 flex items-center justify-center rounded-full text-[15px] transition-all
                        ${!c.current ? 'text-white/30' : ''}
                        ${isToday && !isSel ? 'border-2 border-white text-white font-bold' : ''}
                        ${isSel && !isToday ? 'bg-white font-bold' : ''}
                        ${isToday && isSel ? 'bg-white font-bold' : ''}
                        ${c.current && !isToday && !isSel ? 'text-white hover:bg-white/15' : ''}`}
                      style={(isSel) ? { color: 'var(--header-bg)' } : {}}
                    >
                      {c.day}
                    </button>
                  )
                })}
              </div>
            </>
          ) : (
            /* 年视图：4x3 网格展示12个月 */
            <div className="px-3 pb-2 grid grid-cols-3 gap-2">
              {MONTH_NAMES.map((name, idx) => {
                const isCurrentMonth = idx === today.getMonth() && year === today.getFullYear()
                const isSelectedMonth = idx === selectedDate.getMonth() && year === selectedDate.getFullYear()
                const miniCells = miniDays(year, idx)
                return (
                  <button
                    key={idx}
                    onClick={() => handleMonthClick(idx)}
                    className={`rounded-xl p-2 transition-all hover:bg-white/15 ${isSelectedMonth ? 'bg-white/20' : ''}`}
                  >
                    <div className={`text-[11px] mb-1 font-medium text-center ${isCurrentMonth ? 'text-white font-bold' : 'text-white/80'}`}>
                      {name}
                    </div>
                    <div className="grid grid-cols-7">
                      {WEEK_SHORT.map(w => (
                        <div key={w} className="text-center text-white/40 text-[7px] leading-[10px]">{w[0]}</div>
                      ))}
                    </div>
                    <div className="grid grid-cols-7">
                      {miniCells.map((c, i) => {
                        const isT = c.current && idx === today.getMonth() && year === today.getFullYear() && c.day === today.getDate()
                        return (
                          <div
                            key={i}
                            className={`text-center text-[7px] leading-[10px] ${!c.current ? 'text-white/15' : isT ? 'text-white font-bold' : 'text-white/70'}`}
                          >
                            {c.current ? c.day : ''}
                          </div>
                        )
                      })}
                    </div>
                  </button>
                )
              })}
            </div>
          )}

          <div className="h-3" />
        </div>
      )}
    </div>
  )
}

function UpdateModal({ latest, onDismiss }) {
  if (!latest) return null
  const downloadUrl = latest.assets?.find(a => a.name.endsWith('.apk'))?.url
    || latest.assets?.find(a => a.name.endsWith('.exe'))?.url
    || latest.htmlUrl
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.4)', animation: 'fade-in 0.2s ease-out' }}
      onClick={onDismiss}
    >
      <div
        className="w-full max-w-sm overflow-hidden animate-slide-up"
        style={{ backgroundColor: 'var(--bg)', borderRadius: '16px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 pt-5 pb-4 text-center">
          <div
            className="w-14 h-14 rounded-full mx-auto mb-3 flex items-center justify-center"
            style={{ backgroundColor: '#E8F4FD' }}
          >
            <Icon name="refresh" size={24} color="#5DADE2" strokeWidth={2} />
          </div>
          <h3 className="text-[16px] font-semibold mb-1" style={{ color: 'var(--ink)' }}>
            发现新版本
          </h3>
          <p className="text-[13px] mb-1" style={{ color: 'var(--ink2)' }}>
            {latest.name}
          </p>
          <p className="text-[12px] mb-3" style={{ color: 'var(--muted)' }}>
            当前版本 v{CURRENT_VERSION}
          </p>
          {latest.body && (
            <div
              className="text-left text-[12px] leading-relaxed max-h-32 overflow-y-auto px-3 py-2.5 rounded-xl"
              style={{ backgroundColor: 'var(--bg2)', color: 'var(--ink2)' }}
            >
              {latest.body.split('\n').filter(l => l.trim()).slice(0, 8).map((line, i) => (
                <p key={i} className={i === 0 ? 'font-medium mb-1' : 'mb-0.5'} style={{ color: i === 0 ? 'var(--ink)' : undefined }}>
                  {line.replace(/^#+\s*/, '').replace(/^\*\*.*?\*\*/, m => m.replace(/\*\*/g, ''))}
                </p>
              ))}
            </div>
          )}
        </div>
        <div className="flex border-t" style={{ borderColor: 'var(--rule)' }}>
          <a
            href={downloadUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 py-3.5 text-center text-[15px] font-medium transition-opacity hover:opacity-80"
            style={{ color: '#5DADE2' }}
          >
            去更新
          </a>
          <div className="w-px" style={{ backgroundColor: 'var(--rule)' }} />
          <button
            onClick={onDismiss}
            className="flex-1 py-3.5 text-center text-[15px] transition-opacity hover:opacity-80"
            style={{ color: 'var(--muted)' }}
          >
            稍后再说
          </button>
        </div>
      </div>
    </div>
  )
}

function App() {
  const [pinEnabled, setPinEnabled] = useState(false)
  const [isUnlocked, setIsUnlocked] = useState(false)
  const [checkingPIN, setCheckingPIN] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [updateInfo, setUpdateInfo] = useState(null) // { hasUpdate, latest }
  const location = useLocation()
  const navigate = useNavigate()
  const lastBackPressRef = useRef(0)

  useEffect(() => {
    // 启动时清理旧 Service Worker 和缓存，确保加载最新代码
    ;(async () => {
      try {
        let hadSW = false
        if ('serviceWorker' in navigator) {
          const regs = await navigator.serviceWorker.getRegistrations()
          hadSW = regs.length > 0
          for (const r of regs) await r.unregister()
        }
        if ('caches' in window) {
          const keys = await caches.keys()
          for (const k of keys) await caches.delete(k)
        }
        if (hadSW) window.location.reload()
      } catch (e) {}
    })()

    checkPINStatus()
    initReminder()
    cleanupLegacyData()
    // 异步检查更新，不影响启动速度
    checkForUpdate().then(result => {
      if (result?.hasUpdate) setUpdateInfo(result)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    cleanupTestLetters().catch(() => {})
    checkAndGenerateLetters().catch(() => {})
  }, [])

  // Android 状态栏适配
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return
    StatusBar.setStyle({ style: Style.Light }).catch(() => {})
    StatusBar.setBackgroundColor({ color: '#7EC8E3' }).catch(() => {})
    // 状态栏不覆盖 WebView，避免遮挡顶部内容
    StatusBar.setOverlaysWebView({ overlay: false }).catch(() => {})
    // Capacitor 原生环境中禁用 Service Worker，避免 Workbox 缓存策略干扰网络请求
    navigator.serviceWorker?.getRegistrations().then(regs =>
      regs.forEach(r => r.unregister())
    ).catch(() => {})
  }, [])

  // 键盘事件：弹出/收起时调整布局
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return

    let showListener, hideListener
    Keyboard.addListener('keyboardWillShow', () => {
      document.body.classList.add('keyboard-open')
    }).then(h => { showListener = h })
    Keyboard.addListener('keyboardWillHide', () => {
      document.body.classList.remove('keyboard-open')
    }).then(h => { hideListener = h })

    return () => {
      showListener?.remove()
      hideListener?.remove()
    }
  }, [])

  // Android 返回键拦截
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return

    let listenerHandle = null

    const handleBackButton = () => {
      // 1. 如果侧边栏打开，先关闭
      if (sidebarOpen) {
        setSidebarOpen(false)
        return
      }

      // 2. 检查是否有弹出层打开（通过DOM检测）
      const overlays = document.querySelectorAll('[data-overlay="true"]')
      if (overlays.length > 0) {
        overlays.forEach(el => el.dispatchEvent(new CustomEvent('backbutton')))
        return
      }

      // 3. 检查是否有 modal/弹窗打开
      const modals = document.querySelectorAll('[data-modal-open="true"]')
      if (modals.length > 0) {
        modals.forEach(el => el.dispatchEvent(new CustomEvent('backbutton')))
        return
      }

      // 4. 如果有浏览历史，返回上一页
      if (window.history.length > 1) {
        navigate(-1)
        return
      }

      // 5. 已在首页，双击退出
      const now = Date.now()
      if (now - lastBackPressRef.current < 2000) {
        CapacitorApp.exitApp()
      } else {
        lastBackPressRef.current = now
        const toast = document.createElement('div')
        toast.textContent = '再按一次退出应用'
        toast.style.cssText = `
          position: fixed; bottom: 80px; left: 50%; transform: translateX(-50%);
          background: rgba(0,0,0,0.75); color: white; padding: 8px 20px;
          border-radius: 20px; font-size: 14px; z-index: 9999;
          animation: fade-in 0.2s ease;
        `
        document.body.appendChild(toast)
        setTimeout(() => toast.remove(), 2000)
      }
    }

    CapacitorApp.addListener('backButton', handleBackButton).then(h => {
      listenerHandle = h
    })

    return () => {
      listenerHandle?.remove()
    }
  }, [sidebarOpen, navigate])

  const checkPINStatus = async () => {
    const enabled = await getSetting('pinEnabled')
    setPinEnabled(!!enabled)
    if (!enabled) {
      setIsUnlocked(true)
    }
    setCheckingPIN(false)
  }

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && pinEnabled && isUnlocked) {
        setIsUnlocked(false)
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [pinEnabled, isUnlocked])

  const handleUnlock = () => {
    setIsUnlocked(true)
  }

  if (checkingPIN) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: 'var(--bg)', color: 'var(--ink)' }}
      >
        <div className="animate-pulse" style={{ color: 'var(--muted)' }}>加载中...</div>
      </div>
    )
  }

  if (pinEnabled && !isUnlocked) {
    return <PINLock onUnlock={handleUnlock} />
  }

  if (location.pathname === '/xiaohui') {
    return (
      <div
        className="min-h-screen flex flex-col overflow-x-hidden"
        style={{ backgroundColor: 'var(--bg)', color: 'var(--ink)' }}
      >
        {updateInfo?.hasUpdate && (
          <UpdateModal
            latest={updateInfo.latest}
            onDismiss={() => setUpdateInfo(null)}
          />
        )}
        <div className="hidden lg:block fixed left-0 top-0 bottom-0 z-10 h-full w-60">
          <Sidebar />
        </div>
        <div className="hidden md:flex lg:hidden">
          <Sidebar />
        </div>
        <header className="md:hidden sticky top-0 z-30 flex-shrink-0 w-full flex items-center overflow-hidden" style={{ backgroundColor: 'var(--header-bg)', height: '44px' }}>
          <div className="h-full flex items-center" style={{ paddingLeft: '20px' }}>
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors flex-shrink-0"
            >
              <Icon name="menu" size={22} color="var(--header-text)" strokeWidth={2} />
            </button>
          </div>
        </header>
        <main className="flex-1 flex flex-col overflow-hidden md:flex-1 lg:fixed lg:inset-0 lg:h-screen lg:pt-12"
          style={{ left: '15rem' }}
        >
          <div className="flex-1 flex flex-col overflow-hidden">
            <XiaohuiPage />
          </div>
        </main>
        <MobileSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <XiaohuiFab />
      </div>
    )
  }

  return (
    <div
      className="min-h-screen flex flex-col overflow-x-hidden"
      style={{ backgroundColor: 'var(--bg)', color: 'var(--ink)' }}
    >
      {updateInfo?.hasUpdate && (
        <UpdateBanner
          latest={updateInfo.latest}
          onDismiss={() => setUpdateInfo(null)}
        />
      )}
      {/* 桌面端布局 (lg+) */}
      <div className="hidden lg:flex flex-1">
        {/* 侧边栏 - fixed定位，脱离流式布局，不参与宽度计算 */}
        <div className="fixed left-0 top-0 bottom-0 z-10 h-full w-60">
          <Sidebar />
        </div>

        {/* 主内容区 - 全屏宽度，内容在整个屏幕中居中，左侧留出侧边栏空间 */}
        {location.pathname === '/xiaohui' ? (
          <main className="fixed inset-0 h-screen flex flex-col pt-12" style={{ left: '15rem' }}>
            <div className="w-full h-full flex justify-center overflow-hidden">
              <div className="w-full max-w-[1200px] flex-1 min-h-0 flex flex-col">
                <XiaohuiPage />
              </div>
            </div>
          </main>
        ) : (
          <main className="fixed inset-0 overflow-y-auto overflow-x-hidden pt-12" style={{ left: '15rem' }}>
            <div className="flex justify-center min-h-full">
              <DesktopContent />
            </div>
          </main>
        )}
      </div>

      {/* 平板端布局 (md-lg) */}
      <div className="hidden md:flex lg:hidden flex-1 min-h-0">
        {/* 侧边栏 - 窄版 */}
        <Sidebar />

        {/* 主内容区 */}
        {location.pathname === '/xiaohui' ? (
          <main className="flex-1 h-screen overflow-hidden flex flex-col">
            <XiaohuiPage />
          </main>
        ) : (
          <main className="flex-1 overflow-y-auto overflow-x-hidden">
            <div className="max-w-lg mx-auto px-8 py-8">
              <Routes>
                <Route path="/write" element={<WritePage />} />
                <Route path="/timeline" element={<TimelinePage />} />
                <Route path="/calendar" element={<CalendarPage />} />
                <Route path="/stats" element={<StatsPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="*" element={<Navigate to="/write" replace />} />
              </Routes>
            </div>
          </main>
        )}
      </div>

      {/* 移动端布局 (< md) */}
      <div className="md:hidden flex-1 min-h-0 flex flex-col">
        <header className="sticky top-0 z-30 flex-shrink-0 w-full flex items-center overflow-hidden" style={{ backgroundColor: 'var(--header-bg)', height: '44px' }}>
          <div className="h-full flex items-center" style={{ paddingLeft: '20px' }}>
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors flex-shrink-0"
            >
              <Icon name="menu" size={22} color="var(--header-text)" strokeWidth={2} />
            </button>
          </div>
          {location.pathname === '/write' && (
            <div style={{ marginLeft: '25px' }}>
              <MobileDatePicker />
            </div>
          )}
        </header>
        {location.pathname === '/xiaohui' ? (
          <main className="flex-1 h-0 overflow-hidden flex flex-col">
            <XiaohuiPage />
          </main>
        ) : (
          <main className="flex-1 overflow-y-auto overflow-x-hidden page-content">
            <Routes>
              <Route path="/write" element={<WritePage />} />
              <Route path="/timeline" element={<TimelinePage />} />
              <Route path="/calendar" element={<CalendarPage />} />
              <Route path="/stats" element={<StatsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="*" element={<Navigate to="/write" replace />} />
            </Routes>
          </main>
        )}
      </div>

      <MobileSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <XiaohuiFab />
    </div>
  )
}

export default App
