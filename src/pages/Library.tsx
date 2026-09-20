import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import type { Book, Shelf } from '../domain/types'
import { useActiveSession, useBooks, useBookTotals } from '../hooks/data'
import { formatDuration } from '../lib/time'
import { ActiveSessionBanner } from '../components/ActiveSessionBanner'
import { BookCard } from '../components/BookCard'
import { EmptyState } from '../components/EmptyState'
import { PlusIcon, SettingsIcon } from '../components/icons'
import { recallShelf, rememberShelf, ShelfTabs } from '../components/ShelfTabs'
import { OfflineBadge, ThemeToggle } from '../components/StatusBadges'
import { StartSheet } from '../components/StartSheet'

export default function Library() {
  const navigate = useNavigate()
  const books = useBooks()
  const totals = useBookTotals()
  const active = useActiveSession()
  const [shelf, setShelfState] = useState<Shelf>(recallShelf)
  const [startFor, setStartFor] = useState<Book | null>(null)

  const setShelf = (s: Shelf) => {
    setShelfState(s)
    rememberShelf(s)
  }

  const counts = useMemo(() => {
    const c: Record<Shelf, number> = { reading: 0, want: 0, read: 0 }
    books?.forEach((b) => c[b.status]++)
    return c
  }, [books])

  const list = useMemo(() => (books ?? []).filter((b) => b.status === shelf), [books, shelf])
  const grandTotal = useMemo(() => [...(totals?.values() ?? [])].reduce((a, b) => a + b, 0), [totals])

  const onStart = (book: Book) => {
    if (active) navigate(`/leitura/${active.id}`)
    else setStartFor(book)
  }

  return (
    <div className="mx-auto min-h-dvh max-w-md pb-32">
      <header className="organic-header safe-top px-5 pb-5 pt-5">
        <div className="flex items-center justify-between">
          <OfflineBadge />
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            <Link to="/ajustes" aria-label="Ajustes" className="flex h-10 w-10 items-center justify-center rounded-full bg-surface shadow-card">
              <SettingsIcon width={20} height={20} />
            </Link>
          </div>
        </div>
        <h1 className="mt-4 font-display text-4xl font-semibold tracking-tight">Estante Tropical</h1>
        <p className="mt-1 text-sm text-ink-2">
          {grandTotal > 0 ? (
            <>
              Você já investiu <strong className="text-leaf tabular">{formatDuration(grandTotal)}</strong> em leituras.
            </>
          ) : (
            'Seu tempo de leitura, bem cuidado.'
          )}
        </p>
      </header>

      <div className="sticky top-0 z-20 bg-bg/90 px-5 py-2 backdrop-blur">
        <ShelfTabs value={shelf} onChange={setShelf} counts={counts} />
      </div>

      <main id="shelf-panel" role="tabpanel" aria-labelledby={`tab-${shelf}`} className="px-5 pt-3">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={shelf} initial={{ opacity: 0, x: 14 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -14 }} transition={{ duration: 0.18 }}>
            {books === undefined ? null : list.length === 0 ? (
              <EmptyState
                kind={shelf}
                action={
                  <Link to={`/adicionar?estante=${shelf}`} className="btn-primary inline-flex h-12 items-center gap-2 rounded-2xl px-5 font-semibold shadow-card">
                    <PlusIcon width={18} height={18} /> Adicionar livro
                  </Link>
                }
              />
            ) : (
              <ul className="space-y-3">
                {list.map((b) => (
                  <BookCard key={b.id} book={b} totalMs={totals?.get(b.id) ?? 0} onStart={onStart} />
                ))}
              </ul>
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {list.length > 0 && (
        <Link
          to={`/adicionar?estante=${shelf}`}
          aria-label="Adicionar livro"
          className={`btn-primary fixed right-5 z-20 flex h-14 w-14 items-center justify-center rounded-full shadow-cover transition-all active:scale-90 ${active ? 'bottom-24' : 'bottom-6'}`}
        >
          <PlusIcon width={26} height={26} />
        </Link>
      )}

      <ActiveSessionBanner />
      <StartSheet book={startFor} onClose={() => setStartFor(null)} onStarted={(id) => navigate(`/leitura/${id}`)} />
    </div>
  )
}
