import { useState, useRef, useCallback } from 'react'
import Icon from '../ui/Icon'
import ContextMenu from '../ui/ContextMenu'
import { updateRecordPrivacy, deleteRecord } from '../../db/database'
import { TYPE_ICONS } from '../../constants/types'

const TYPE_LABELS = {
  note: { label: '随笔', color: 'var(--type-note)' },
  mood: { label: '心情', color: 'var(--type-mood)' },
  memo: { label: '备忘', color: 'var(--type-memo)' },
  diary: { label: '日记', color: 'var(--type-diary)' },
}

const WEATHER_ICONS = {
  sunny: 'weather-sun',
  cloudy: 'weather-cloud',
  rainy: 'weather-rain',
  snowy: 'weather-snow',
  windy: 'weather-wind',
  foggy: 'weather-fog',
}

function DiaryCard({ record, onClick, onDeleted }) {
  const [menuVisible, setMenuVisible] = useState(false)
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 })
  const longPressTimer = useRef(null)
  const isLongPress = useRef(false)
  const touchStartPos = useRef(null)

  const typeInfo = TYPE_LABELS[record.type] || TYPE_LABELS.note
  const weatherIconName = record.weather ? WEATHER_ICONS[record.weather] : null
  const privacy = record.privacy || 'normal'

  const date = new Date(record.createdAt)
  const month = date.getMonth() + 1
  const day = date.getDate()
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  const weekDay = weekDays[date.getDay()]
  const timeStr = `${month}月${day}日 ${weekDay} ${hours}:${minutes}`

  const contentText = typeof record.content === 'string'
    ? record.content
    : record.contentHTML || ''

  const plainContent = contentText
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .trim()

  const preview = plainContent.slice(0, 100) + (plainContent.length > 100 ? '...' : '')

  // 构建菜单项
  const menuItems = [
    {
      label: '编辑',
      icon: <Icon name="edit" size={16} />,
      onClick: () => {
        onClick()
      },
    },
    {
      label: privacy === 'hidden' ? '取消隐藏' : '隐藏',
      icon: <Icon name={privacy === 'hidden' ? 'eye-off' : 'eye'} size={16} />,
      onClick: () => {
        updateRecordPrivacy(record.id, privacy === 'hidden' ? 'normal' : 'hidden')
      },
    },
    {
      label: privacy === 'blurred' ? '取消打码' : '打码',
      icon: <Icon name="shield-off" size={16} />,
      onClick: () => {
        updateRecordPrivacy(record.id, privacy === 'blurred' ? 'normal' : 'blurred')
      },
    },
    {
      label: '分享',
      icon: <Icon name="share" size={16} />,
      onClick: () => {
        // 预留分享功能
      },
    },
    {
      label: '删除',
      icon: <Icon name="trash" size={16} />,
      color: 'var(--color-danger)',
      onClick: () => {
        deleteRecord(record.id)
        if (onDeleted) onDeleted(record.id)
      },
    },
  ]

  const showMenu = useCallback((clientX, clientY) => {
    setMenuPos({ x: clientX, y: clientY })
    setMenuVisible(true)
  }, [])

  const closeMenu = useCallback(() => {
    setMenuVisible(false)
  }, [])

  // 清除长按计时器
  const clearLongPressTimer = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }, [])

  // 右键菜单（桌面端）
  const handleContextMenu = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    showMenu(e.clientX, e.clientY)
  }, [showMenu])

  // Touch 长按（移动端）
  const handleTouchStart = useCallback((e) => {
    isLongPress.current = false
    const touch = e.touches[0]
    touchStartPos.current = { x: touch.clientX, y: touch.clientY }

    longPressTimer.current = setTimeout(() => {
      isLongPress.current = true
      showMenu(touch.clientX, touch.clientY)
    }, 500)
  }, [showMenu])

  const handleTouchMove = useCallback((e) => {
    // 移动超过 10px 取消长按
    if (!touchStartPos.current) return
    const touch = e.touches[0]
    const dx = touch.clientX - touchStartPos.current.x
    const dy = touch.clientY - touchStartPos.current.y
    if (Math.sqrt(dx * dx + dy * dy) > 10) {
      clearLongPressTimer()
    }
  }, [clearLongPressTimer])

  const handleTouchEnd = useCallback(() => {
    clearLongPressTimer()
    // 如果是长按触发，阻止 click 事件
    if (isLongPress.current) {
      setTimeout(() => { isLongPress.current = false }, 300)
    }
  }, [clearLongPressTimer])

  const handleClick = useCallback((e) => {
    if (isLongPress.current) {
      e.preventDefault()
      e.stopPropagation()
      return
    }
    onClick()
  }, [onClick])

  const isBlurred = privacy === 'blurred'

  return (
    <>
      <div
        className="rounded-[14px] px-4 py-3.5 cursor-pointer transition-all duration-200 active:scale-[0.98]"
        style={{
          backgroundColor: 'var(--bg-card)',
        }}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* 类型标签 + 标题 */}
        <div className="flex items-center gap-2.5 mb-2.5">
          <span
            className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-0.5 rounded-full"
            style={{ backgroundColor: typeInfo.color + '18', color: typeInfo.color }}
          >
            <Icon name={TYPE_ICONS[record.type] || 'file'} size={12} strokeWidth={1.5} />
            {typeInfo.label}
          </span>
          {record.title && (
            <span className="text-[15px] font-medium truncate flex-1" style={{ color: 'var(--ink)', lineHeight: '1.5' }}>
              {record.title}
            </span>
          )}
        </div>

        {/* 内容摘要 */}
        {preview && (
          <p
            className="text-[13px] mb-3 line-clamp-2"
            style={{
              color: 'var(--muted)',
              lineHeight: '1.7',
              filter: isBlurred ? 'blur(5px)' : 'none',
              userSelect: isBlurred ? 'none' : 'auto',
              transition: 'filter 0.2s ease',
            }}
          >
            {preview}
          </p>
        )}

        {/* 底部信息 */}
        <div className="flex items-center gap-2 text-[11px]" style={{ color: 'var(--muted)', opacity: 0.5 }}>
          {record.mood && <span>{record.mood}</span>}
          <span>{timeStr}</span>
          {weatherIconName && (
            <Icon name={weatherIconName} size={12} strokeWidth={1.5} />
          )}
        </div>
      </div>

      <ContextMenu
        visible={menuVisible}
        x={menuPos.x}
        y={menuPos.y}
        onClose={closeMenu}
        items={menuItems}
      />
    </>
  )
}

export default DiaryCard
