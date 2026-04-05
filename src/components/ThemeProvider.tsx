'use client'
import { useEffect } from 'react'

export default function ThemeProvider() {
  useEffect(() => {
    // Apply saved theme
    const theme = localStorage.getItem('theme') ?? 'dark'
    document.documentElement.setAttribute('data-theme', theme)

    // Apply saved font size
    const font = localStorage.getItem('fontsize') ?? 'middel'
    document.documentElement.classList.remove('font-klein', 'font-middel', 'font-groot')
    document.documentElement.classList.add(`font-${font}`)
  }, [])

  return null
}
