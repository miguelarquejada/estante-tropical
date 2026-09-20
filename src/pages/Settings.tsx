import { useState, useSyncExternalStore } from 'react'
import { useNavigate } from 'react-router-dom'
import { getSyncStatus, subscribeSyncStatus, syncNow } from '../db/sync'
import { useAuth } from '../hooks/useAuth'
import { useTheme, type ThemePref } from '../hooks/useTheme'
import { requestNotifyPermission } from '../lib/notify'
import { supabase } from '../lib/supabase'
import { ChevronLeftIcon } from '../components/icons'
import { OfflineBadge } from '../components/StatusBadges'

const THEMES: { id: ThemePref; label: string }[] = [
  { id: 'system', label: 'Automático' },
  { id: 'light', label: 'Claro' },
  { id: 'dark', label: 'Escuro' },
]

const syncLabel = { idle: 'Tudo sincronizado', syncing: 'Sincronizando…', error: 'Falha na última tentativa', offline: 'Sem conexão: sincroniza ao reconectar' }

export default function Settings() {
  const navigate = useNavigate()
  const { user, localOnly, signOut } = useAuth()
  const { pref, set } = useTheme()
  const status = useSyncExternalStore(subscribeSyncStatus, getSyncStatus)
  const [notif, setNotif] = useState<string>('Notification' in window ? Notification.permission : 'unsupported')

  return (
    <div className="mx-auto min-h-dvh max-w-md px-5 pb-16">
      <header className="safe-top flex items-center gap-2 pb-4 pt-5">
        <button onClick={() => navigate(-1)} aria-label="Voltar" className="flex h-10 w-10 items-center justify-center rounded-full bg-surface shadow-card">
          <ChevronLeftIcon width={20} height={20} />
        </button>
        <h1 className="font-display text-3xl font-semibold">Ajustes</h1>
        <span className="ml-auto">
          <OfflineBadge />
        </span>
      </header>

      <div className="space-y-4">
        <Card title="Aparência">
          <div role="radiogroup" aria-label="Tema" className="flex rounded-2xl bg-surface-2 p-1">
            {THEMES.map((t) => (
              <button
                key={t.id}
                role="radio"
                aria-checked={pref === t.id}
                onClick={() => set(t.id)}
                className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition ${pref === t.id ? 'bg-surface text-ink shadow-card' : 'text-ink-2'}`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </Card>

        <Card title="Avisos do Pomodoro">
          <p className="text-sm text-ink-2">
            Receba um aviso quando o foco ou a pausa terminar. Com o app fechado, o tempo continua correto, mas o aviso só aparece ao reabrir.
          </p>
          <button
            disabled={notif === 'granted' || notif === 'denied' || notif === 'unsupported'}
            onClick={async () => setNotif(await requestNotifyPermission())}
            className="mt-3 h-11 rounded-xl bg-leaf-soft px-4 text-sm font-semibold text-leaf disabled:opacity-60"
          >
            {notif === 'granted' ? 'Avisos ativados' : notif === 'denied' ? 'Bloqueado no navegador' : notif === 'unsupported' ? 'Indisponível neste aparelho' : 'Ativar avisos'}
          </button>
        </Card>

        <Card title="Conta e sincronização">
          {localOnly ? (
            <p className="text-sm text-ink-2">
              Modo local: o Supabase não está configurado, então seus dados ficam apenas neste aparelho. Veja o README para ativar contas e sincronização.
            </p>
          ) : (
            <>
              <p className="text-sm">
                Conectado como <strong>{user?.email}</strong>
              </p>
              <p className="mt-1 text-sm text-ink-2">{syncLabel[status]}</p>
              <div className="mt-3 flex gap-2">
                <button onClick={() => void syncNow(supabase, user?.id ?? null)} className="h-11 flex-1 rounded-xl bg-surface-2 text-sm font-semibold">
                  Sincronizar agora
                </button>
                <button onClick={() => void signOut()} className="h-11 flex-1 rounded-xl bg-terra-soft text-sm font-semibold text-terra">
                  Sair
                </button>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl bg-surface p-4 shadow-card">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-ink-2">{title}</h2>
      {children}
    </section>
  )
}
