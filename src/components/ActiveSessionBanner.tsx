import { Link } from 'react-router-dom'
import { useActiveSession, useBook } from '../hooks/data'
import { useNow } from '../hooks/useNow'
import { viewSession } from '../domain/session'
import { formatClock } from '../lib/time'
import { ClockIcon } from './icons'

/** Atalho persistente para a sessão em andamento (o tempo segue contando mesmo fora dela). */
export function ActiveSessionBanner() {
  const session = useActiveSession()
  const book = useBook(session?.book_id)
  const now = useNow(!!session, 1000)
  if (!session || !book) return null
  const v = viewSession(session, now)
  const label = v.status === 'running' ? (v.phase === 'break' ? 'Em pausa' : 'Lendo agora') : v.awaitingNextFocus ? 'Pausa concluída' : 'Sessão pausada'
  return (
    <Link
      to={`/leitura/${session.id}`}
      className="btn-primary safe-bottom fixed inset-x-4 bottom-4 z-30 mx-auto flex max-w-md items-center gap-3 rounded-2xl px-4 py-3 shadow-cover"
    >
      <ClockIcon width={22} height={22} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold">{book.title}</span>
        <span className="block text-xs opacity-80">{label}</span>
      </span>
      <span className="font-display text-xl font-semibold tabular">{formatClock(v.focusMs)}</span>
    </Link>
  )
}
