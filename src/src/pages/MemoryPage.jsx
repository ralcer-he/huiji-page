import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import TimelinePage from './TimelinePage'
import StrollPage from './StrollPage'
import Icon from '../components/ui/Icon'

const TABS = [
  { id: 'timeline', icon: 'clock' },
  { id: 'stroll', icon: 'sparkle' },
]

function MemoryPage() {
  const location = useLocation()
  const [activeTab, setActiveTab] = useState('timeline')

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const tab = params.get('tab')
    if (tab && TABS.find(t => t.id === tab)) {
      setActiveTab(tab)
    }
  }, [location.search])

  return (
    <div className="animate-fade-in">
      {/* Tab 切换 - 纯图标 */}
      <div className="flex items-center justify-center gap-6 py-3">
        {TABS.map(tab => (
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

      {/* 内容区 */}
      <div className="px-5">
        {activeTab === 'timeline' && <TimelinePage />}
        {activeTab === 'stroll' && <StrollPage />}
      </div>
    </div>
  )
}

export default MemoryPage
