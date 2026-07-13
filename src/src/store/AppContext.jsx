import { createContext, useContext } from 'react'
import { useTheme } from '../hooks/useTheme'

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const { theme, setTheme, setAutoTheme } = useTheme()

  const value = {
    theme,
    setTheme,
    setAutoTheme,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error('useApp must be used within an AppProvider')
  }
  return context
}
