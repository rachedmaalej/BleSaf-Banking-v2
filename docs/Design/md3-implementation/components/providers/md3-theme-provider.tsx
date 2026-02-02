'use client'

import * as React from 'react'

type Theme = 'light' | 'dark' | 'system'

interface MD3ThemeContextValue {
  theme: Theme
  setTheme: (theme: Theme) => void
  actualTheme: 'light' | 'dark'
}

const MD3ThemeContext = React.createContext<MD3ThemeContextValue | undefined>(undefined)

interface MD3ThemeProviderProps {
  children: React.ReactNode
  defaultTheme?: Theme
  storageKey?: string
}

export function MD3ThemeProvider({
  children,
  defaultTheme = 'system',
  storageKey = 'md3-theme',
}: MD3ThemeProviderProps) {
  const [theme, setThemeState] = React.useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem(storageKey) as Theme) || defaultTheme
    }
    return defaultTheme
  })

  const [actualTheme, setActualTheme] = React.useState<'light' | 'dark'>('light')

  React.useEffect(() => {
    const root = window.document.documentElement
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light'

    const resolvedTheme = theme === 'system' ? systemTheme : theme

    root.classList.remove('light', 'dark')
    root.classList.add(resolvedTheme)
    setActualTheme(resolvedTheme)

    // Update meta theme-color
    const metaThemeColor = document.querySelector('meta[name="theme-color"]')
    if (metaThemeColor) {
      metaThemeColor.setAttribute(
        'content',
        resolvedTheme === 'dark' ? '#1C1B1F' : '#FFFBFE'
      )
    }
  }, [theme])

  React.useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

    const handleChange = () => {
      if (theme === 'system') {
        const systemTheme = mediaQuery.matches ? 'dark' : 'light'
        const root = window.document.documentElement
        root.classList.remove('light', 'dark')
        root.classList.add(systemTheme)
        setActualTheme(systemTheme)
      }
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [theme])

  const setTheme = React.useCallback(
    (newTheme: Theme) => {
      localStorage.setItem(storageKey, newTheme)
      setThemeState(newTheme)
    },
    [storageKey]
  )

  const value = React.useMemo(
    () => ({
      theme,
      setTheme,
      actualTheme,
    }),
    [theme, setTheme, actualTheme]
  )

  return <MD3ThemeContext.Provider value={value}>{children}</MD3ThemeContext.Provider>
}

export function useMD3Theme() {
  const context = React.useContext(MD3ThemeContext)
  if (context === undefined) {
    throw new Error('useMD3Theme must be used within a MD3ThemeProvider')
  }
  return context
}
