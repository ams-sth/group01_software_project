import { useEffect, useState } from 'react'
import { getStoredMode, resolveTheme, applyResolvedTheme, setThemeMode, type ThemeMode } from '../lib/theme'

const options: { mode: ThemeMode; label: string }[] = [
  { mode: 'light', label: 'Light mode' },
  { mode: 'dark', label: 'Dark mode' },
  { mode: 'system', label: 'Match system' },
]

function ThemeIcon({ mode }: { mode: ThemeMode }) {
  if (mode === 'light') {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4" aria-hidden="true">
        <circle cx="12" cy="12" r="4" />
        <path strokeLinecap="round" d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
      </svg>
    )
  }
  if (mode === 'dark') {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />
      </svg>
    )
  }
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4" aria-hidden="true">
      <rect x="3" y="4" width="18" height="12" rx="1.5" />
      <path strokeLinecap="round" d="M8 20h8M12 16v4" />
    </svg>
  )
}

function ThemeToggle() {
  const [mode, setMode] = useState<ThemeMode>('system')

  useEffect(() => {
    const stored = getStoredMode()
    setMode(stored)
    applyResolvedTheme(resolveTheme(stored))

    const media = window.matchMedia('(prefers-color-scheme: dark)')
    function handleSystemChange() {
      if (getStoredMode() === 'system') {
        applyResolvedTheme(resolveTheme('system'))
      }
    }
    media.addEventListener('change', handleSystemChange)
    return () => media.removeEventListener('change', handleSystemChange)
  }, [])

  function choose(next: ThemeMode) {
    setThemeMode(next)
    setMode(next)
  }

  return (
    <div
      role="radiogroup"
      aria-label="Theme"
      className="flex items-center gap-0.5 rounded-full border border-(--border) bg-(--surface) p-1"
    >
      {options.map((option) => (
        <button
          key={option.mode}
          type="button"
          role="radio"
          aria-checked={mode === option.mode}
          aria-label={option.label}
          title={option.label}
          onClick={() => choose(option.mode)}
          className={`cursor-pointer rounded-full p-1.5 transition ${
            mode === option.mode ? 'bg-(--accent) text-white' : 'text-(--text) hover:text-(--text-h)'
          }`}
        >
          <ThemeIcon mode={option.mode} />
        </button>
      ))}
    </div>
  )
}

export default ThemeToggle
