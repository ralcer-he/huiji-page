import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Icon from '../ui/Icon'

const TYPE_OPTIONS = [
  { type: 'note', label: '随笔', icon: 'edit' },
  { type: 'mood', label: '心情', icon: 'heart' },
  { type: 'memo', label: '备忘', icon: 'check' },
  { type: 'diary', label: '日记', icon: 'file' },
]

function FloatingActionButton() {
  const [expanded, setExpanded] = useState(false)
  const menuRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setExpanded(false)
      }
    }
    if (expanded) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [expanded])

  const handleNew = (type) => {
    setExpanded(false)
    navigate(`/write?type=${type}`)
  }

  const TYPE_COLORS = {
    note: 'var(--type-note)',
    mood: 'var(--type-mood)',
    memo: 'var(--type-memo)',
    diary: 'var(--type-diary)',
  }

  return (
    <div ref={menuRef} className="fixed bottom-20 right-4 z-20 lg:bottom-6 lg:right-6">
      {expanded && (
        <div
          className="absolute bottom-[72px] right-0 rounded-xl"
          style={{
            backgroundColor: 'var(--bg-card)',
            padding: '10px',
          }}
        >
          {TYPE_OPTIONS.map((opt, idx) => (
            <button
              key={opt.type}
              className="flex items-center rounded-lg transition-colors"
              style={{
                color: 'var(--ink)',
                whiteSpace: 'nowrap',
                padding: '12px 14px',
                gap: '12px',
              }}
              onClick={() => handleNew(opt.type)}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg2)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: (TYPE_COLORS[opt.type] || 'var(--accent)') + '15' }}
              >
                <Icon name={opt.icon} size={18} strokeWidth={1.5} color={TYPE_COLORS[opt.type] || 'var(--accent)'} />
              </div>
              <span className="text-[15px]" style={{ lineHeight: '1.4' }}>{opt.label}</span>
            </button>
          ))}
        </div>
      )}

      <button
        className="w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200 active:scale-95"
        style={{
          backgroundColor: 'var(--accent)',
          color: 'white',
          boxShadow: 'var(--shadow-lg)',
          transform: expanded ? 'rotate(45deg)' : 'rotate(0)',
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <Icon name="plus" size={24} color="white" strokeWidth={2} />
      </button>
    </div>
  )
}

export default FloatingActionButton
