function Toggle({ checked, onChange, disabled = false }) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation()
        if (!disabled) onChange(!checked)
      }}
      disabled={disabled}
      className="relative inline-flex items-center w-11 h-6 rounded-full transition-colors duration-300 flex-shrink-0 active:scale-95"
      style={{
        backgroundColor: checked
          ? 'var(--accent)'
          : 'var(--rule)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <span
        className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-all duration-300"
        style={{ left: checked ? '22px' : '2px' }}
      />
    </button>
  )
}

export default Toggle
