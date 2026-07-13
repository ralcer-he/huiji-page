import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

/**
 * @param {Object} props
 * @param {boolean} props.visible
 * @param {number} props.x
 * @param {number} props.y
 * @param {Function} props.onClose
 * @param {Array<{label: string, icon: string, color?: string, onClick: Function}>} props.items
 */
function ContextMenu({ visible, x, y, onClose, items }) {
  const menuRef = useRef(null)

  // 点击外部关闭
  useEffect(() => {
    if (!visible) return

    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose()
      }
    }

    // 延迟绑定，避免当前触发事件立即关闭
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('touchstart', handleClickOutside)
    }, 0)

    return () => {
      clearTimeout(timer)
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [visible, onClose])

  // Esc 关闭
  useEffect(() => {
    if (!visible) return
    function handleEsc(e) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [visible, onClose])

  if (!visible) return null

  // 处理边界溢出：先渲染再测量
  const menuWidth = 180
  const menuHeight = items.length * 44 + 12
  const vw = window.visualViewport?.width || window.innerWidth
  const vh = window.visualViewport?.height || window.innerHeight

  let posX = x
  let posY = y
  if (x + menuWidth > vw) posX = vw - menuWidth - 8
  if (y + menuHeight > vh) posY = vh - menuHeight - 8
  if (posX < 8) posX = 8
  if (posY < 8) posY = 8

  const menu = (
    <div
      ref={menuRef}
      className="fixed rounded-xl py-1.5"
      style={{
        left: posX,
        top: posY,
        zIndex: 200,
        backgroundColor: 'var(--bg-card)',
        boxShadow: 'var(--shadow-lg)',
        minWidth: menuWidth,
        animation: 'ctx-menu-in 0.15s ease-out',
      }}
      role="menu"
    >
      {items.map((item, index) => (
        <button
          key={index}
          className="flex items-center gap-3 w-full px-4 py-2.5 text-[14px] transition-colors duration-150"
          style={{
            color: item.color || 'var(--ink)',
            backgroundColor: 'transparent',
          }}
          onClick={(e) => {
            e.stopPropagation()
            item.onClick()
            onClose()
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--bg2)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent'
          }}
          role="menuitem"
        >
          <span className="flex-shrink-0" style={{ color: item.color || 'var(--muted)' }}>
            {item.icon}
          </span>
          <span>{item.label}</span>
        </button>
      ))}
    </div>
  )

  return createPortal(menu, document.body)
}

// 注入 keyframes（只需一次）
if (typeof document !== 'undefined' && !document.getElementById('ctx-menu-style')) {
  const style = document.createElement('style')
  style.id = 'ctx-menu-style'
  style.textContent = `
    @keyframes ctx-menu-in {
      from {
        opacity: 0;
        transform: scale(0.95);
      }
      to {
        opacity: 1;
        transform: scale(1);
      }
    }
  `
  document.head.appendChild(style)
}

export default ContextMenu
