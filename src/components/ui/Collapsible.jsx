import { useState } from 'react'
import Icon from './Icon'

function Collapsible({ title, children, defaultOpen = false, iconName, hint, buttonStyle }) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 text-left transition-colors duration-200 hover:bg-[var(--bg2)]"
        style={buttonStyle}
      >
        <div className="flex items-center gap-3">
          {iconName && <Icon name={iconName} size={18} color="var(--muted)" />}
          <div>
            <div className="text-sm font-medium" style={{ color: 'var(--ink)' }}>
              {title}
            </div>
            {hint && (
              <div className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
                {hint}
              </div>
            )}
          </div>
        </div>
        <Icon
          name="chevron-down"
          size={16}
          color="var(--muted)"
          className={`transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <div className="animate-fade-in px-5 pb-4">
          {children}
        </div>
      )}
    </div>
  )
}

export default Collapsible
