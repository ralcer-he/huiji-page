import { useState, useEffect } from 'react'
import Icon from '../ui/Icon'
import Toggle from '../ui/Toggle'
import { useApp } from '../../store/AppContext'
import { ACCENT_THEMES } from '../../hooks/useTheme'

const ACCENT_OPTIONS = [
  { key: 'blue',   label: '日系蓝', color: '#5DADE2', recommended: true },
  { key: 'teal',   label: '清新青', color: '#14B8A6' },
  { key: 'pink',   label: '温柔粉', color: '#F472B6' },
  { key: 'purple', label: '淡雅紫', color: '#A78BFA' },
  { key: 'green',  label: '活力绿', color: '#22C55E' },
]

const FONT_SIZE_OPTIONS = [
  { value: '13px', label: '小' },
  { value: '14px', label: '中' },
  { value: '16px', label: '大' },
]

export default function AppearanceSettings() {
  const { theme, setTheme, accentTheme, setAccentTheme } = useApp()

  // 字体大小
  const [fontSize, setFontSize] = useState(() => {
    return localStorage.getItem('font-size') || '14px'
  })

  // 行距
  const [lineHeight, setLineHeight] = useState(() => {
    const saved = localStorage.getItem('line-height')
    return saved ? parseFloat(saved) : 1.7
  })

  // 字体大小变化时同步应用到全局
  useEffect(() => {
    document.documentElement.style.setProperty('--font-size-base', fontSize)
    localStorage.setItem('font-size', fontSize)
  }, [fontSize])

  // 行距变化时同步应用到全局
  useEffect(() => {
    document.documentElement.style.setProperty('--line-height-base', String(lineHeight))
    localStorage.setItem('line-height', String(lineHeight))
  }, [lineHeight])

  const handleFontSizeChange = (value) => {
    setFontSize(value)
  }

  const handleLineHeightChange = (e) => {
    const val = parseFloat(e.target.value)
    setLineHeight(val)
  }

  const handleThemeToggle = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }

  return (
    <div className="px-5 py-5 flex flex-col gap-6">

      {/* 主题色选择 */}
      <section>
        <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--ink)' }}>
          主题色
        </h3>
        <div className="flex gap-4">
          {ACCENT_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              onClick={() => setAccentTheme(opt.key)}
              className="flex flex-col items-center gap-1.5"
              style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
            >
              <div
                className="relative flex items-center justify-center"
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  backgroundColor: opt.color,
                  border: accentTheme === opt.key ? '2.5px solid white' : '2.5px solid transparent',
                  boxShadow: accentTheme === opt.key ? `0 0 0 2px ${opt.color}` : 'none',
                  transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
                }}
              >
                {accentTheme === opt.key && (
                  <Icon name="check" size={16} color="white" strokeWidth={2.5} />
                )}
              </div>
              <span
                className="text-xs"
                style={{ color: 'var(--muted)' }}
              >
                {opt.label}
              </span>
              {opt.recommended && (
                <span
                  className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                  style={{ backgroundColor: 'var(--accent3)', color: 'var(--accent)' }}
                >
                  推荐
                </span>
              )}
            </button>
          ))}
        </div>
      </section>

      {/* 字体大小 */}
      <section>
        <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--ink)' }}>
          字体大小
        </h3>
        <div className="flex gap-2">
          {FONT_SIZE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => handleFontSizeChange(opt.value)}
              className="px-5 py-2.5 text-sm font-medium transition-all duration-200"
              style={{
                borderRadius: 'var(--radius-btn)',
                border: fontSize === opt.value ? '1px solid var(--accent)' : '1px solid var(--rule)',
                backgroundColor: fontSize === opt.value ? 'var(--accent3)' : 'var(--bg)',
                color: fontSize === opt.value ? 'var(--accent)' : 'var(--ink)',
                cursor: 'pointer',
              }}
            >
              {opt.label} ({opt.value})
            </button>
          ))}
        </div>
      </section>

      {/* 行距设置 */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
            行距
          </h3>
          <span className="text-sm tabular-nums" style={{ color: 'var(--accent)' }}>
            {lineHeight.toFixed(1)}
          </span>
        </div>
        <input
          type="range"
          min="1.4"
          max="2.0"
          step="0.1"
          value={lineHeight}
          onChange={handleLineHeightChange}
          className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
          style={{
            backgroundColor: 'var(--bg3)',
            outline: 'none',
            WebkitAppearance: 'none',
          }}
        />
        <style>{`
          input[type="range"]::-webkit-slider-thumb {
            -webkit-appearance: none;
            appearance: none;
            width: 18px;
            height: 18px;
            border-radius: 50%;
            background: var(--accent);
            cursor: pointer;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
            transition: transform 0.15s ease;
          }
          input[type="range"]::-webkit-slider-thumb:active {
            transform: scale(1.15);
          }
          input[type="range"]::-moz-range-thumb {
            width: 18px;
            height: 18px;
            border-radius: 50%;
            background: var(--accent);
            cursor: pointer;
            border: none;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
          }
        `}</style>
        <div className="flex justify-between mt-1">
          <span className="text-xs" style={{ color: 'var(--muted)' }}>紧凑</span>
          <span className="text-xs" style={{ color: 'var(--muted)' }}>宽松</span>
        </div>
      </section>

      {/* 暗色模式切换 */}
      <section>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="flex items-center justify-center"
              style={{
                width: 36,
                height: 36,
                borderRadius: 'var(--radius-btn)',
                backgroundColor: 'var(--bg2)',
              }}
            >
              <Icon
                name={theme === 'dark' ? 'moon' : 'sun'}
                size={18}
                color={theme === 'dark' ? 'var(--accent)' : 'var(--muted)'}
              />
            </div>
            <div>
              <h3 className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
                暗色模式
              </h3>
              <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
                {theme === 'dark' ? '已开启' : '已关闭'}
              </p>
            </div>
          </div>
          <Toggle checked={theme === 'dark'} onChange={handleThemeToggle} />
        </div>
      </section>

    </div>
  )
}
