import { useState, useEffect } from 'react'

export function useTheme() {
  const [theme, setThemeState] = useState(() => {
    if (typeof window === 'undefined') return 'light'
    const saved = localStorage.getItem('theme')
    if (saved === 'auto' || saved === 'system') return 'light'
    return saved || 'light'
  })

  const applyTheme = (mode) => {
    const root = document.documentElement
    if (mode === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
  }

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  const setTheme = (mode) => {
    setThemeState(mode)
    localStorage.setItem('theme', mode)
  }

  return { theme, setTheme }
}
