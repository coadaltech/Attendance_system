import { writable } from 'svelte/store'
import { browser } from '$app/environment'

type Theme = 'light' | 'dark'

function createThemeStore() {
  const { subscribe, set } = writable<Theme>('dark')

  function apply(theme: Theme) {
    if (!browser) return
    document.documentElement.classList.toggle('dark', theme === 'dark')
    localStorage.setItem('theme', theme)
    set(theme)
  }

  return {
    subscribe,
    init() {
      if (!browser) return
      const saved = (localStorage.getItem('theme') as Theme | null) ?? 'dark'
      apply(saved)
    },
    toggle() {
      if (!browser) return
      const isDark = document.documentElement.classList.contains('dark')
      apply(isDark ? 'light' : 'dark')
    },
  }
}

export const themeStore = createThemeStore()
