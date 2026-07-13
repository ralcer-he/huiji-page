function SectionTitle({ children, level = 2 }) {
  const Tag = `h${level}`

  const sizeMap = {
    1: 'text-lg font-semibold tracking-tight',
    2: 'text-base font-medium tracking-tight',
    3: 'text-sm font-medium',
  }

  return (
    <Tag
      className={`${sizeMap[level] || sizeMap[2]} font-sans`}
      style={{ color: 'var(--ink)' }}
    >
      {children}
    </Tag>
  )
}

export default SectionTitle
