import Icon from './Icon'

function EmptyState({ iconName, title, hint }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <div
        className="w-12 h-12 rounded-full flex items-center justify-center mb-3"
        style={{ backgroundColor: 'var(--bg2)' }}
      >
        <Icon name={iconName || 'note'} size={24} color="var(--muted)" strokeWidth={1} />
      </div>
      <p className="text-sm font-medium mb-1" style={{ color: 'var(--ink)' }}>
        {title}
      </p>
      {hint && (
        <p className="text-xs text-center" style={{ color: 'var(--muted)' }}>
          {hint}
        </p>
      )}
    </div>
  )
}

export default EmptyState
