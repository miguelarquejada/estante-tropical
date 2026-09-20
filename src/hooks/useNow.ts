import { useEffect, useState } from 'react'

/** Re-renderiza a cada `interval` ms e imediatamente ao voltar ao app. Não acumula tempo: só lê o relógio. */
export function useNow(active = true, interval = 250) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!active) return
    const tick = () => setNow(Date.now())
    tick()
    const id = setInterval(tick, interval)
    document.addEventListener('visibilitychange', tick)
    window.addEventListener('focus', tick)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', tick)
      window.removeEventListener('focus', tick)
    }
  }, [active, interval])

  return now
}
