import { useRef } from 'react'

const BUILT_IN = [
  { id: 'all', name: '全部' },
  { id: 'uncategorized', name: '未分类' },
]

function CategoryTabs({ categories = [], active = 'all', onChange }) {
  const scrollRef = useRef(null)

  const existingIds = new Set(categories.map(c => c.id))
  const allTabs = [
    ...BUILT_IN,
    ...categories
      .filter(c => !BUILT_IN.some(b => b.id === c.id))
      .map(c => ({ id: c.id, name: c.name, color: c.color })),
  ]

  return (
    <div
      ref={scrollRef}
      className="flex gap-2 overflow-x-auto pb-1 -mx-5 px-5"
      style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
    >
      {allTabs.map(tab => (
        <button
          key={tab.id}
          className="flex-shrink-0 px-4 py-1.5 text-[12px] font-medium rounded-full transition-colors"
          style={{
            backgroundColor: active === tab.id ? 'var(--accent)' : 'transparent',
            color: active === tab.id ? 'white' : 'var(--muted)',
            lineHeight: '1.6',
          }}
          onClick={() => onChange(tab.id)}
        >
          {tab.name}
        </button>
      ))}
    </div>
  )
}

export default CategoryTabs
