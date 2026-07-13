import { useState, useRef, useEffect } from 'react'
import { useApp } from '../store/AppContext'
import Icon from './ui/Icon'

function ThemeSwitcher({ variant = 'dropdown' }) {
  const { theme, setTheme } = useApp()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef(null)

  const themes = [
    {
      value: 'light',
      label: '浅色',
      icon: 'sun',
      description: '明亮模式'
    },
    {
      value: 'dark',
      label: '深色',
      icon: 'moon',
      description: '暗夜模式'
    },
  ]

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const getActualTheme = () => {
    return theme
  }

  if (variant === 'compact' || variant === 'inline') {
    return (
      <div className="flex gap-1.5">
        {themes.map((t) => (
          <button
            key={t.value}
            onClick={() => setTheme(t.value)}
            className="flex items-center justify-center w-9 h-9 rounded-lg transition-all duration-200"
            style={{
              backgroundColor: theme === t.value ? 'var(--accent)' : 'var(--bg2)',
              color: theme === t.value ? 'white' : 'var(--muted)',
            }}
            title={t.label}
          >
            <Icon name={t.icon} size={18} color={theme === t.value ? 'white' : 'var(--muted)'} strokeWidth={1.5} />
          </button>
        ))}
      </div>
    )
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 rounded-xl transition-colors duration-200"
        style={{
          backgroundColor: 'var(--bg2)',
          color: 'var(--ink)',
        }}
      >
        <Icon
          name={themes.find(t => t.value === theme)?.icon}
          size={16}
          color="currentColor"
          strokeWidth={1.5}
        />
        <span className="text-sm font-medium">
          {themes.find(t => t.value === theme)?.label}
        </span>
        <Icon
          name="chevron-down"
          size={14}
          color="currentColor"
          strokeWidth={1.5}
          className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      <div
        className={`absolute right-0 mt-2 w-56 rounded-xl overflow-hidden transition-all duration-300 ${
          isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none'
        }`}
        style={{
          backgroundColor: 'var(--bg)',
          boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
          border: '1px solid var(--rule)',
          zIndex: 50,
        }}
      >
        {themes.map((t, index) => (
          <button
            key={t.value}
            onClick={() => {
              setTheme(t.value)
              setIsOpen(false)
            }}
            className="w-full flex items-center gap-3 px-4 py-3 transition-colors duration-200"
            style={{
              backgroundColor: theme === t.value ? 'var(--bg2)' : 'transparent',
              borderBottom: index < themes.length - 1 ? '1px solid var(--rule)' : 'none',
            }}
          >
            <span
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{
                backgroundColor: theme === t.value ? 'var(--accent)' : 'var(--bg2)',
                color: theme === t.value ? 'white' : 'var(--muted)',
              }}
            >
              <Icon name={t.icon} size={16} color="currentColor" strokeWidth={1.5} />
            </span>
            <div className="text-left flex-1">
              <div
                className="text-sm font-medium"
                style={{ color: theme === t.value ? 'var(--accent)' : 'var(--ink)' }}
              >
                {t.label}
              </div>
              <div className="text-xs" style={{ color: 'var(--muted)' }}>
                {t.description}
              </div>
            </div>
            {theme === t.value && (
              <Icon
                name="check"
                size={18}
                color="var(--accent)"
                strokeWidth={2}
                className="ml-auto"
              />
            )}
          </button>
        ))}
      </div>
    </div>
  )
}

export default ThemeSwitcher
