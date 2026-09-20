import { useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { completeBook, deleteBook, moveBook, updateBook } from '../db/repo'
import type { Shelf } from '../domain/types'
import { useActiveSession, useBook, useBookSessions } from '../hooks/data'
import { formatDate, formatDuration, fromDateInput, toDateInput } from '../lib/time'
import { ActiveSessionBanner } from '../components/ActiveSessionBanner'
import { CompleteSheet } from '../components/CompleteSheet'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { CoverImage } from '../components/CoverImage'
import { EmptyState } from '../components/EmptyState'
import { ChevronLeftIcon, PlayIcon, TrashIcon } from '../components/icons'
import { SHELVES } from '../components/ShelfTabs'
import { StartSheet } from '../components/StartSheet'
import { Stars } from '../components/Stars'

export default function BookDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const book = useBook(id)
  const sessions = useBookSessions(id)
  const active = useActiveSession()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [startOpen, setStartOpen] = useState(false)
  const [completeOpen, setCompleteOpen] = useState(false)

  if (book === null) return <Navigate to="/" replace />
  if (!book) return null

  const totalMs = (sessions ?? []).reduce((sum, s) => sum + s.duration_ms, 0)
  const isActiveHere = active?.book_id === book.id

  const changeShelf = async (s: Shelf) => {
    if (s === book.status) return
    if (s === 'read') setCompleteOpen(true)
    else await moveBook(book.id, s)
  }

  const primary = () => {
    if (active) navigate(`/leitura/${active.id}`)
    else setStartOpen(true)
  }

  return (
    <div className="mx-auto min-h-dvh max-w-md pb-36">
      <header className="organic-header safe-top px-5 pb-6 pt-5">
        <div className="flex items-center justify-between">
          <button onClick={() => navigate(-1)} aria-label="Voltar" className="flex h-10 w-10 items-center justify-center rounded-full bg-surface shadow-card">
            <ChevronLeftIcon width={20} height={20} />
          </button>
          <button onClick={() => setConfirmDelete(true)} aria-label="Remover livro" className="flex h-10 w-10 items-center justify-center rounded-full bg-surface text-terra shadow-card">
            <TrashIcon width={19} height={19} />
          </button>
        </div>
        <div className="mt-5 flex gap-5">
          <CoverImage url={book.cover_url} title={book.title} className="w-32 shrink-0" />
          <div className="flex min-w-0 flex-col justify-end">
            <h1 className="font-display text-3xl font-semibold leading-tight">{book.title}</h1>
            <p className="mt-1 text-ink-2">{book.author || 'Autor desconhecido'}</p>
          </div>
        </div>
      </header>

      <main className="space-y-6 px-5">
        <section className="grid grid-cols-3 gap-2.5" aria-label="Resumo">
          <Stat label="Tempo lido" value={formatDuration(totalMs)} accent />
          <Stat label="Sessões" value={String(sessions?.length ?? 0)} />
          <Stat label="Progresso" value={book.progress_pct != null ? `${book.progress_pct}%` : '—'} />
        </section>

        <section>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-2">Estante</h2>
          <div role="radiogroup" aria-label="Mover para estante" className="flex rounded-2xl bg-surface-2 p-1">
            {SHELVES.map((s) => (
              <button
                key={s.id}
                role="radio"
                aria-checked={book.status === s.id}
                onClick={() => void changeShelf(s.id)}
                className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition ${book.status === s.id ? 'bg-surface text-ink shadow-card' : 'text-ink-2'}`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-3xl bg-surface p-4 shadow-card">
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-xs font-semibold uppercase tracking-wider text-ink-2">
              Início
              <input
                type="date"
                value={toDateInput(book.started_at)}
                onChange={(e) => void updateBook(book.id, { started_at: fromDateInput(e.target.value) })}
                className="mt-1 h-12 w-full rounded-xl bg-surface-2 px-3 text-base font-normal normal-case tracking-normal text-ink outline-none focus:ring-2 focus:ring-leaf"
              />
            </label>
            <label className="block text-xs font-semibold uppercase tracking-wider text-ink-2">
              Término
              <input
                type="date"
                value={toDateInput(book.finished_at)}
                onChange={(e) => void updateBook(book.id, { finished_at: fromDateInput(e.target.value) })}
                className="mt-1 h-12 w-full rounded-xl bg-surface-2 px-3 text-base font-normal normal-case tracking-normal text-ink outline-none focus:ring-2 focus:ring-leaf"
              />
            </label>
          </div>
          <label className="mt-3 block text-xs font-semibold uppercase tracking-wider text-ink-2">
            Total de páginas
            <input
              inputMode="numeric"
              defaultValue={book.total_pages ?? ''}
              key={book.total_pages ?? 'none'}
              onBlur={(e) => {
                const n = Number(e.target.value.replace(/\D/g, ''))
                if ((n || null) !== book.total_pages) void updateBook(book.id, { total_pages: n > 0 ? n : null })
              }}
              className="mt-1 h-12 w-full rounded-xl bg-surface-2 px-3 text-base font-normal normal-case tracking-normal text-ink outline-none focus:ring-2 focus:ring-leaf"
            />
          </label>
        </section>

        <section className="rounded-3xl bg-surface p-4 shadow-card">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-2">Avaliação</h2>
          {book.status === 'read' ? (
            <Stars value={book.rating} onChange={(rating) => void updateBook(book.id, { rating })} size={34} />
          ) : (
            <>
              <Stars value={null} size={28} />
              <p className="mt-2 text-sm text-ink-2">Você poderá avaliar quando concluir a leitura.</p>
              {book.status === 'reading' && (
                <button onClick={() => setCompleteOpen(true)} className="mt-3 h-11 rounded-xl bg-leaf-soft px-4 text-sm font-semibold text-leaf">
                  Marcar como concluído
                </button>
              )}
            </>
          )}
        </section>

        <section>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-2">Histórico de sessões</h2>
          {sessions && sessions.length === 0 ? (
            <EmptyState kind="sessions" />
          ) : (
            <ul className="space-y-2">
              {sessions?.map((s) => (
                <li key={s.id} className="flex items-center justify-between rounded-2xl bg-surface px-4 py-3 shadow-card">
                  <div>
                    <p className="font-semibold tabular">{formatDuration(s.duration_ms)}</p>
                    <p className="text-xs text-ink-2">
                      {formatDate(s.ended_at)} · {s.mode === 'pomodoro' ? 'Pomodoro' : 'Livre'}
                    </p>
                  </div>
                  {s.page_at_end != null && <span className="text-sm text-ink-2 tabular">até a pág. {s.page_at_end}</span>}
                </li>
              ))}
            </ul>
          )}
        </section>
        <Link to="/" className="block text-center text-sm text-ink-2">
          Voltar à estante
        </Link>
      </main>

      {book.status !== 'read' && !isActiveHere && !active && (
        <div className="safe-bottom fixed inset-x-0 bottom-0 z-20 bg-gradient-to-t from-bg via-bg/95 to-transparent px-5 pb-5 pt-8">
          <button onClick={primary} className="btn-primary mx-auto flex h-14 w-full max-w-md items-center justify-center gap-2 rounded-2xl text-base font-semibold shadow-cover">
            <PlayIcon width={20} height={20} /> Iniciar leitura
          </button>
        </div>
      )}
      <ActiveSessionBanner />

      <StartSheet book={startOpen ? book : null} onClose={() => setStartOpen(false)} onStarted={(sid) => navigate(`/leitura/${sid}`)} />
      <CompleteSheet
        book={completeOpen ? book : null}
        onClose={() => setCompleteOpen(false)}
        onSave={async (data) => {
          await completeBook(book.id, data)
          setCompleteOpen(false)
        }}
      />
      <ConfirmDialog
        open={confirmDelete}
        title="Remover este livro?"
        message="O livro e todas as sessões de leitura dele serão removidos da sua estante."
        confirmLabel="Remover"
        destructive
        onCancel={() => setConfirmDelete(false)}
        onConfirm={async () => {
          await deleteBook(book.id)
          navigate('/', { replace: true })
        }}
      />
    </div>
  )
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-2xl bg-surface p-3 text-center shadow-card">
      <p className={`font-display text-2xl font-semibold tabular ${accent ? 'text-leaf' : ''}`}>{value}</p>
      <p className="text-[11px] font-medium text-ink-2">{label}</p>
    </div>
  )
}
