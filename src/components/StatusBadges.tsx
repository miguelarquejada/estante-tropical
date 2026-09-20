import { useSyncExternalStore } from 'react'
import { getSyncStatus, subscribeSyncStatus } from '../db/sync'
import { useOnline } from '../hooks/useOnline'
import { useTheme } from '../hooks/useTheme'
import { CloudOffIcon, MoonIcon, SunIcon } from './icons'
import { useAuth } from '../hooks/useAuth'

export function OfflineBadge() {
  const online = useOnline()
  const { localOnly } = useAuth()
  const status = useSyncExternalStore(subscribeSyncStatus, getSyncStatus)
  if (localOnly) return <Pill tone="neutral">Modo local</Pill>
  if (!online || status === 'offline') {
    return (
      <Pill tone="warn">
        <CloudOffIcon width={14} height={14} /> Offline
      </Pill>
    )
  }
  if (status === 'syncing') return <Pill tone="neutral">Sincronizando…</Pill>
  if (status === 'error') return <Pill tone="warn">Falha ao sincronizar</Pill>
  return null
}

function Pill({ tone, children }: { tone: 'warn' | 'neutral'; children: React.ReactNode }) {
  return (
    <span
      role="status"
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${tone === 'warn' ? 'bg-terra-soft text-terra' : 'bg-leaf-soft text-leaf'}`}
    >
      {children}
    </span>
  )
}

export function ThemeToggle() {
  const { pref, isDark, set } = useTheme()
  return (
    <button
      onClick={() => set(isDark ? 'light' : 'dark')}
      aria-label={isDark ? 'Ativar tema claro' : 'Ativar tema escuro'}
      data-pref={pref}
      className="flex h-10 w-10 items-center justify-center rounded-full bg-surface text-ink shadow-card transition-transform active:scale-90"
    >
      {isDark ? <SunIcon width={20} height={20} /> : <MoonIcon width={20} height={20} />}
    </button>
  )
}
