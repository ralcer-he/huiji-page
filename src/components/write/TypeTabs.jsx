import Icon from '../ui/Icon'
import { RECORD_TYPES } from '../../constants/types'
import { useWritePageTypes } from '../../hooks/useAppSettings'

function TypeTabs({ activeType, onChange }) {
  const visibleTypes = useWritePageTypes()

  const orderedTypes = visibleTypes
    .map(id => RECORD_TYPES.find(t => t.id === id))
    .filter(Boolean)

  return (
    <div className="flex items-center gap-1 w-fit max-w-full overflow-x-auto scrollbar-hide">
      {orderedTypes.map((type) => {
        const active = activeType === type.id
        return (
          <button
            key={type.id}
            onClick={() => onChange(type.id)}
            className={`huiji-tab-pill flex items-center gap-1.5${active ? ' active' : ''}`}
          >
            <Icon
              name={type.iconName}
              size={15}
              color={active ? 'white' : 'var(--muted)'}
              strokeWidth={1.5}
            />
            <span>{type.label}</span>
          </button>
        )
      })}
    </div>
  )
}

export default TypeTabs
