import { useState } from 'react'
import Icon from '../components/ui/Icon'

function StrollPage() {
  const [activeTab, setActiveTab] = useState('random')

  return (
    <div>
      <div className="flex items-center justify-center gap-4 p-1.5 mb-5 rounded-full mx-auto" style={{ width: 'fit-content', backgroundColor: 'var(--bg-card)' }}>
        {[
          { id: 'random', icon: 'shuffle' },
          { id: 'memory', icon: 'calendar' },
        ].map(tab => (
          <button
            key={tab.id}
            className="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200"
            style={{
              backgroundColor: activeTab === tab.id ? 'var(--accent)' : 'transparent',
            }}
            onClick={() => setActiveTab(tab.id)}
          >
            <Icon
              name={tab.icon}
              size={20}
              color={activeTab === tab.id ? 'white' : 'var(--muted)'}
              strokeWidth={1.5}
            />
          </button>
        ))}
      </div>

      {activeTab === 'random' ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 mx-auto mb-5 rounded-2xl flex items-center justify-center" style={{ backgroundColor: 'var(--accent3)' }}>
            <Icon name="shuffle" size={24} strokeWidth={1.5} color="var(--accent)" />
          </div>
          <p className="text-[15px] font-medium mb-1.5" style={{ color: 'var(--ink)' }}>随机回顾你的旧时光</p>
          <p className="text-[13px] leading-[1.6]" style={{ color: 'var(--muted)' }}>记录更多日记来解锁这个功能</p>
        </div>
      ) : (
        <div className="text-center py-16">
          <div className="w-16 h-16 mx-auto mb-5 rounded-2xl flex items-center justify-center" style={{ backgroundColor: 'var(--accent3)' }}>
            <Icon name="calendar" size={24} strokeWidth={1.5} color="var(--accent)" />
          </div>
          <p className="text-[15px] font-medium mb-1.5" style={{ color: 'var(--ink)' }}>重拾往年的今天</p>
          <p className="text-[13px] leading-[1.6]" style={{ color: 'var(--muted)' }}>查看过去同一日期的记录</p>
        </div>
      )}
    </div>
  )
}

export default StrollPage
