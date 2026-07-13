import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import Icon from '../ui/Icon'
import { getTemplates } from '../../db/database'

const TYPE_ICON_MAP = {
  diary: 'diary',
  mood: 'mood',
  memo: 'memo',
  note: 'note',
}

function TemplatePicker({ visible, onClose, onSelect }) {
  const [templates, setTemplates] = useState([])
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const loadTemplates = useCallback(async () => {
    if (!visible) return
    const list = await getTemplates()
    setTemplates(list)
  }, [visible])

  useEffect(() => {
    loadTemplates()
  }, [loadTemplates])

  const handleSelect = (template) => {
    onSelect?.(template.content, template.title, template.type)
    onClose?.()
  }

  const handleBlank = () => {
    onSelect?.('', '', '')
    onClose?.()
  }

  // 获取内容纯文本预览（去掉 HTML 标签）
  const getPreview = (content) => {
    if (!content) return '自由书写'
    const text = content.replace(/<[^>]+>/g, '').trim()
    return text.length > 50 ? text.slice(0, 50) + '...' : text || '自由书写'
  }

  if (!mounted || !visible) return null

  const panel = (
    <div
      className="fixed inset-0 flex flex-col justify-end"
      style={{ zIndex: 100 }}
    >
      {/* 遮罩 */}
      <div
        className="absolute inset-0 transition-opacity duration-300"
        style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
        onClick={onClose}
      />

      {/* 底部面板 */}
      <div
        className="relative animate-slide-up safe-area-bottom"
        style={{
          backgroundColor: 'var(--bg-card)',
          borderRadius: '16px 16px 0 0',
          maxHeight: '70vh',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        {/* 标题栏 */}
        <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--rule)' }}>
          <h3 className="text-base font-medium" style={{ color: 'var(--ink-strong)' }}>
            选择模板
          </h3>
          <button
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: 'var(--muted)' }}
            onClick={onClose}
          >
            <Icon name="close" size={18} />
          </button>
        </div>

        {/* 模板列表 */}
        <div className="px-5 py-3 space-y-3 overflow-y-auto" style={{ maxHeight: 'calc(70vh - 120px)' }}>
          {templates.map((tpl) => (
            <button
              key={tpl.id}
              className="w-full flex items-center gap-3 p-4 rounded-xl transition-all text-left"
              style={{
                backgroundColor: 'var(--bg)',
                border: '1px solid var(--rule)',
              }}
              onClick={() => handleSelect(tpl)}
            >
              {/* 类型图标 */}
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: 'var(--accent3)' }}
              >
                <Icon
                  name={TYPE_ICON_MAP[tpl.type] || 'note'}
                  size={18}
                  color="var(--accent)"
                />
              </div>

              {/* 名称 + 预览 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium truncate" style={{ color: 'var(--ink)' }}>
                    {tpl.name}
                  </span>
                  {tpl.isSystem && (
                    <span
                      className="text-[11px] px-1.5 py-0.5 rounded-full flex-shrink-0"
                      style={{
                        backgroundColor: 'var(--bg2)',
                        color: 'var(--muted)',
                        lineHeight: '1.5',
                      }}
                    >
                      默认
                    </span>
                  )}
                </div>
                <p className="text-xs truncate" style={{ color: 'var(--muted)', lineHeight: '1.7' }}>
                  {getPreview(tpl.content)}
                </p>
              </div>

              {/* 箭头 */}
              <Icon name="chevron-right" size={16} color="var(--muted)" />
            </button>
          ))}
        </div>

        {/* 空白记录按钮 */}
        <div className="px-5 py-4" style={{ borderTop: '1px solid var(--rule)' }}>
          <button
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-colors"
            style={{
              backgroundColor: 'var(--bg2)',
              color: 'var(--ink)',
              lineHeight: '1.7',
            }}
            onClick={handleBlank}
          >
            <Icon name="write" size={16} color="var(--accent)" />
            <span>空白记录</span>
          </button>
        </div>
      </div>
    </div>
  )

  return createPortal(panel, document.body)
}

export default TemplatePicker
