import Icon from './Icon'

function IconButton({ name, onClick, label, size = 18, variant = 'default' }) {
  const styles = {
    default: {
      backgroundColor: 'transparent',
      color: 'var(--muted)',
    },
    primary: {
      backgroundColor: 'var(--accent)',
      color: 'white',
    },
    danger: {
      backgroundColor: 'transparent',
      color: '#ef4444',
    },
    solid: {
      backgroundColor: 'var(--bg2)',
      color: 'var(--ink)',
    },
  }

  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="flex items-center justify-center w-9 h-9 rounded-lg transition-all duration-200 hover:bg-[var(--bg2)] active:scale-95"
      style={styles[variant]}
    >
      <Icon name={name} size={size} color={styles[variant].color} />
    </button>
  )
}

export default IconButton
