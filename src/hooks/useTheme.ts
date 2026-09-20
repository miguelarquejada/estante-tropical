import { useCallback, useEffect, useState } from 'react'

export type ThemePref = 'system' | 'light' | 'dark'
const KEY = 'estante:theme'
const DARK_QUERY = '(prefers-color-scheme: dark)'

function read(): ThemePref {
  try {
    const v = localStorage.getItem(KEY)
    return v === 'light' || v === 'dark' ? v : 'system'
  } catch {
    return 'system'
  }
}

function systemPrefersDark() {
  return matchMedia(DARK_QUERY).matches
}

export function useTheme() {
  const [pref, setPref] = useState<ThemePref>(read)
  const [systemDark, setSystemDark] = useState(systemPrefersDark)

  useEffect(() => {
    const mq = matchMedia(DARK_QUERY)
    const onChange = () => setSystemDark(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  const isDark = pref === 'dark' || (pref === 'system' && systemDark)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark)
    document.querySelector('meta[name=theme-color]')?.setAttribute('content', isDark ? '#121816' : '#FDFBF7')
  }, [isDark])

  const set = useCallback((next: ThemePref) => {
    try {
      localStorage.setItem(KEY, next)
    } catch {
      /* armazenamento indisponível: vale só para a sessão */
    }
    setPref(next)
  }, [])

  return { pref, isDark, set }
}
