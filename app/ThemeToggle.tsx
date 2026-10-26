
'use client'

import { useEffect, useState } from 'react'

export default function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light')

  useEffect(() => {
    const savedTheme = localStorage.getItem('cveat-theme')
    const initialTheme = savedTheme === 'dark' ? 'dark' : 'light'

    setTheme(initialTheme)
    document.documentElement.classList.toggle(
      'dark',
      initialTheme === 'dark'
    )
  }, [])

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark'

    setTheme(nextTheme)
    localStorage.setItem('cveat-theme', nextTheme)
    document.documentElement.classList.toggle(
      'dark',
      nextTheme === 'dark'
    )
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      aria-pressed={theme === 'dark'}
     
className="relative flex h-10 w-[76px] shrink-0 items-center justify-between rounded-full bg-white p-1 shadow-md ring-1 ring-white/30 transition-all duration-300 hover:shadow-lg cursor-pointer"
    >
      <span
        className={`absolute left-1 top-1 h-8 w-8 rounded-full shadow-sm transition-transform duration-300 ease-in-out ${       
theme === 'dark'
? 'translate-x-9 bg-indigo-600'
: 'translate-x-0 bg-indigo-100'
        }`}
      />

      <span className="relative z-10 flex h-8 w-8 items-center justify-center">
        <svg
          width="17"
          height="17"
          viewBox="0 0 24 24"
          fill="none"
          stroke={theme === 'light' ? '#4F46E5' : '#64748B'}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42M17.65 6.35l1.42-1.42" />
        </svg>
      </span>

      <span className="relative z-10 flex h-8 w-8 items-center justify-center">
        <svg
          width="17"
          height="17"
          viewBox="0 0 24 24"
          fill="none"
          stroke={theme === 'dark' ? '#FFFFFF' : '#94A3B8'}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M20.985 12.486A9 9 0 0 1 11.514 3.015a9 9 0 1 0 9.47 9.47Z" />
        </svg>
      </span>
    </button>
  )
}
