import { useRef } from 'react'
import Icon from '../ui/Icon'

function CategorySelector({ categories = [], selected = null, onChange }) {
  const scrollRef = useRef(null)

  const handleSelect = (id) => {
    onChange?.(id)
  }

  return (
    <div
      ref={scrollRef}
      className="flex gap-3 overflow-x-auto pb-1 -mx-5 px-5"
      style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
    >
      {/* 未分类（默认选中） */}
      <button
        className="flex-shrink-0 flex items-center gap-1.5 px-5 py-2 text-[14px] font-medium rounded-full transition-colors"
        style={{
          backgroundColor: selected === null ? 'var(--accent)' : 'var(--bg-card)',
          color: selected === null ? 'white' : 'var(--muted)',
          boxShadow: selected === null ? 'var(--shadow-sm)' : 'none',
          lineHeight: '1.6',
        }}
        onClick={() => handleSelect(null)}
      >
        <Icon
          name="tag"
          size={14}
          color={selected === null ? 'white' : 'var(--muted)'}
          strokeWidth={1.5}
        />
        <span>未分类</span>
      </button>

      {/* 各分类 */}
      {categories.map((cat) => {
        const active = selected === cat.id
        return (
          <button
            key={cat.id}
            className="flex-shrink-0 flex items-center gap-1.5 px-5 py-2 text-[14px] font-medium rounded-full transition-colors"
            style={{
              backgroundColor: active ? cat.color : 'var(--bg-card)',
              color: active ? 'white' : 'var(--muted)',
              boxShadow: active ? 'var(--shadow-sm)' : 'none',
              lineHeight: '1.6',
            }}
            onClick={() => handleSelect(cat.id)}
          >
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{
                backgroundColor: active ? 'white' : cat.color,
              }}
            />
            <span>{cat.name}</span>
          </button>
        )
      })}
    </div>
  )
}

export default CategorySelector
