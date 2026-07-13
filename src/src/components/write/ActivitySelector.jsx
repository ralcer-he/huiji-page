import { useState } from 'react'
import { ACTIVITY_TAGS } from '../../constants/tags'
import Icon from '../ui/Icon'

function ActivitySelector({ selectedActivities = [], onChange }) {
  const [expanded, setExpanded] = useState(false)

  const toggleActivity = (activityName) => {
    if (selectedActivities.includes(activityName)) {
      onChange(selectedActivities.filter(a => a !== activityName))
    } else {
      onChange([...selectedActivities, activityName])
    }
  }

  const displayActivities = expanded ? ACTIVITY_TAGS : ACTIVITY_TAGS.slice(0, 6)

  return (
    <div className="mt-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium flex items-center gap-1" style={{ color: 'var(--muted)' }}>
          <Icon name="check" size={14} color="var(--muted)" strokeWidth={1.5} />
          习惯活动
        </span>
        {!expanded && ACTIVITY_TAGS.length > 6 && (
          <button
            onClick={() => setExpanded(true)}
            className="text-xs px-2 py-0.5 rounded-full transition-all duration-200"
            style={{ 
              backgroundColor: 'var(--bg2)', 
              color: 'var(--accent)' 
            }}
          >
            更多 ↓
          </button>
        )}
      </div>
      
      <div className="flex flex-wrap gap-1.5">
        {displayActivities.map(activity => {
          const isSelected = selectedActivities.includes(activity.name)
          return (
            <button
              key={activity.name}
              onClick={() => toggleActivity(activity.name)}
              className="px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors duration-200 flex items-center gap-1"
              style={{
                backgroundColor: isSelected ? activity.color + '20' : 'var(--bg2)',
                color: isSelected ? activity.color : 'var(--ink)',
                boxShadow: isSelected ? `0 0 0 2px ${activity.color}` : 'none',
              }}
            >
              <Icon name={activity.iconName} size={14} color={isSelected ? activity.color : 'var(--ink)'} strokeWidth={1.5} />
              <span>{activity.name}</span>
            </button>
          )
        })}
      </div>

      {expanded && (
        <button
          onClick={() => setExpanded(false)}
          className="mt-2 text-xs w-full py-1 rounded transition-all duration-200"
          style={{ color: 'var(--muted)' }}
        >
          收起 ↑
        </button>
      )}

      {selectedActivities.length > 0 && (
        <div className="mt-2 flex items-center gap-2">
          <span className="text-xs" style={{ color: 'var(--muted)' }}>
            已选 {selectedActivities.length} 项
          </span>
          <button
            onClick={() => onChange([])}
            className="text-xs px-2 py-0.5 rounded transition-all duration-200"
            style={{ 
              backgroundColor: 'rgba(239, 68, 68, 0.1)', 
              color: '#ef4444' 
            }}
          >
            清除
          </button>
        </div>
      )}
    </div>
  )
}

export default ActivitySelector
