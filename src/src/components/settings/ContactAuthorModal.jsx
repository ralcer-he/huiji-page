import { useState } from 'react'
import { createPortal } from 'react-dom'
import Icon from '../ui/Icon'

export default function ContactAuthorModal({ onClose }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText('2487054344@qq.com')
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (e) {}
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.4)', animation: 'fade-in 0.2s ease-out' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm overflow-hidden mx-4"
        style={{
          backgroundColor: 'var(--bg)',
          borderRadius: '16px',
          animation: 'modal-pop-in 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: '1px solid var(--rule)' }}
        >
          <h2 className="text-[16px] font-semibold" style={{ color: 'var(--ink)' }}>联系作者</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
            style={{ backgroundColor: 'var(--bg2)' }}
          >
            <Icon name="close" size={16} color="var(--ink)" />
          </button>
        </div>

        {/* 内容 */}
        <div className="px-5 py-5 space-y-5">
          <div className="text-center py-3">
            <p className="text-[18px] font-bold" style={{ color: 'var(--ink)' }}>ralcer</p>
            <p className="text-[13px] mt-1" style={{ color: 'var(--muted)' }}>慧记开发者</p>
          </div>

          <div
            className="flex items-center gap-3 p-3 rounded-xl"
            style={{ backgroundColor: 'var(--bg2)' }}
          >
            <Icon name="mail" size={18} color="var(--muted)" />
            <div className="flex-1 min-w-0">
              <p className="text-[12px]" style={{ color: 'var(--muted)' }}>邮箱</p>
              <p className="text-[14px] truncate" style={{ color: 'var(--ink)' }}>2487054344@qq.com</p>
            </div>
            <button
              onClick={handleCopy}
              className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all hover:opacity-80"
              style={{ backgroundColor: 'var(--accent3)' }}
              title="复制邮箱"
            >
              <Icon name={copied ? 'check' : 'copy'} size={16} color={copied ? '#22c55e' : 'var(--accent)'} />
            </button>
          </div>

          <div className="text-center py-2 space-y-2">
            <p className="text-[13px]" style={{ color: 'var(--ink2)' }}>
              如果你在使用过程中遇到任何问题，或者有好的建议和想法
            </p>
            <p className="text-[13px]" style={{ color: 'var(--ink2)' }}>
              欢迎随时联系我 (◕ᴗ◕✿)
            </p>
            <p className="text-[13px] pt-1" style={{ color: 'var(--ink2)' }}>
              你的每一条反馈都是慧记变得更好的动力
            </p>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
