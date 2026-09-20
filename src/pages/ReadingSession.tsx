import { useEffect, useRef, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { completeBook, discard, finish, pause, persistResolved, resume, skipBreakPhase, updateBook } from '../db/repo'
import { resolveSession, viewSession } from '../domain/session'
import type { Book } from '../domain/types'
import { useBook, useSession } from '../hooks/data'
import { useNow } from '../hooks/useNow'
import { notifyPhase } from '../lib/notify'
import { formatClock } from '../lib/time'
import { CircleButton } from '../components/CircleButton'
import { CompleteSheet } from '../components/CompleteSheet'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { CheckIcon, ChevronLeftIcon, PauseIcon, PlayIcon, SkipIcon, TrashIcon } from '../components/icons'
import { FinishSheet } from '../components/FinishSheet'
import { ProgressRing } from '../components/ProgressRing'
import { CoverImage } from '../components/CoverImage'

export default function ReadingSession() {
  const { id } = useParams()
  const navigate = useNavigate()
  const session = useSession(id)
  const book = useBook(session?.book_id)
  const running = session?.status === 'running'
  const now = useNow(running, 250)

  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const [finishOpen, setFinishOpen] = useState(false)
  const [completeFor, setCompleteFor] = useState<Book | null>(null)
  const handled = useRef(false)
  const lastResolved = useRef<unknown>(null)
  const lastKey = useRef<string | null>(null)

  // Persiste transições de fase do Pomodoro calculadas a partir dos timestamps (inclusive após o app ficar fechado).
  useEffect(() => {
    if (!session || session.status !== 'running') return
    const resolved = resolveSession(session, now)
    if (resolved !== session && lastResolved.current !== session) {
      lastResolved.current = session
      void persistResolved(resolved)
    }
  }, [session, now])

  const view = session ? viewSession(session, now) : null

  useEffect(() => {
    if (!view || session?.mode !== 'pomodoro') return
    const key = `${view.phase}:${view.awaitingNextFocus}`
    if (lastKey.current !== null && lastKey.current !== key) {
      if (view.phase === 'break') void notifyPhase('Hora da pausa', 'Foco concluído. Respire um pouco.')
      else if (view.awaitingNextFocus) void notifyPhase('Pausa concluída', 'Pronto para o próximo foco?')
    }
    lastKey.current = key
  }, [view, session?.mode])

  useEffect(() => {
    if (session && (session.status === 'finished' || session.status === 'discarded') && !handled.current) navigate('/', { replace: true })
  }, [session, navigate])

  if (session === null) return <Navigate to="/" replace />
  if (!session || !view || !book) return <div className="min-h-dvh bg-[#0f1a15]" />

  const isPomodoro = session.mode === 'pomodoro'
  const isRunning = view.status === 'running'
  const onBreak = isPomodoro && view.phase === 'break'
  const main = isPomodoro && view.phaseRemainingMs != null ? view.phaseRemainingMs : view.focusMs
  const ringProgress = isPomodoro && view.phaseLengthMs ? 1 - (view.phaseRemainingMs ?? 0) / view.phaseLengthMs : 0
  const statusLabel = onBreak ? 'Pausa' : isPomodoro ? 'Foco' : 'Leitura livre'

  const startFinish = async () => {
    await pause(session.id)
    setFinishOpen(true)
  }

  const submitFinish = async (progress: { page?: number; pct?: number } | null, totalPages: number | null) => {
    handled.current = true
    if (totalPages) await updateBook(book.id, { total_pages: totalPages })
    setFinishOpen(false)
    const { book: updated, completed } = await finish(session.id, progress)
    if (completed && updated) setCompleteFor(updated)
    else navigate(`/livro/${book.id}`, { replace: true })
  }

  const doDiscard = async () => {
    handled.current = true
    setConfirmDiscard(false)
    await discard(session.id)
    navigate('/', { replace: true })
  }

  const ringSize = isPomodoro ? 232 : 0

  return (
    <div className="fixed inset-0 overflow-y-auto bg-[#0f1a15] text-white">
      {/* Camadas de fundo: capa desfocada + véu em gradiente + brilho terracota */}
      <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
        {book.cover_url ? (
          <>
            <img src={book.cover_url} alt="" className="absolute inset-0 h-full w-full scale-150 object-cover opacity-70 blur-3xl saturate-150" />
            <img src={book.cover_url} alt="" className="absolute inset-0 h-full w-full scale-110 object-cover opacity-30 blur-2xl mix-blend-soft-light" />
          </>
        ) : (
          <div className="absolute inset-0 bg-[radial-gradient(70%_50%_at_30%_20%,#3f7d58_0%,transparent_70%),radial-gradient(60%_50%_at_80%_80%,#c2613f_0%,transparent_70%)] opacity-60" />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0f1a15]/45 via-[#0f1a15]/35 to-[#0f1a15]/90" />
        <motion.div
          className="absolute -bottom-40 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-[#c2613f]/25 blur-3xl"
          animate={{ opacity: onBreak ? 0.9 : 0.45, scale: isRunning ? [1, 1.08, 1] : 1 }}
          transition={{ duration: 6, repeat: Infinity }}
        />
      </div>

      <div className="safe-top safe-bottom relative mx-auto flex min-h-dvh max-w-md flex-col px-6 pb-8">
        <header className="flex items-center justify-between pt-5">
          <button onClick={() => navigate('/')} aria-label="Minimizar sessão" className="flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-white/10 backdrop-blur-md">
            <ChevronLeftIcon width={20} height={20} />
          </button>
          <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold tracking-wide backdrop-blur-md">
            {isPomodoro ? `Pomodoro · ${statusLabel}` : statusLabel}
          </span>
          <span className="h-11 w-11" />
        </header>

        <main className="flex flex-1 flex-col items-center justify-center gap-5 py-4">
          <motion.div layout style={{ width: isPomodoro ? 'clamp(84px, 16dvh, 124px)' : 'clamp(110px, 26dvh, 180px)' }}>
            <CoverImage url={book.cover_url} title={book.title} className="w-full" />
          </motion.div>

          <div className="text-center">
            <h1 className="line-clamp-2 font-display text-2xl font-semibold leading-tight">{book.title}</h1>
            <p className="mt-0.5 text-sm text-white/70">{book.author}</p>
          </div>

          {isPomodoro ? (
            <ProgressRing progress={ringProgress} size={ringSize} color={onBreak ? '#8fd0a3' : '#f0b59a'}>
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-white/70">{statusLabel}</span>
              <span data-testid="timer" className="font-display text-6xl font-medium tabular leading-none">
                {formatClock(main)}
              </span>
              <span className="mt-2 text-xs text-white/60 tabular">Lido: {formatClock(view.focusMs)}</span>
            </ProgressRing>
          ) : (
            <div className="text-center">
              <span data-testid="timer" className="font-display text-7xl font-medium tabular leading-none">
                {formatClock(main)}
              </span>
              <p className="mt-2 text-xs font-semibold uppercase tracking-[0.2em] text-white/60">{isRunning ? 'Lendo' : 'Pausado'}</p>
            </div>
          )}

          <AnimatePresence mode="wait">
            {view.awaitingNextFocus && (
              <motion.p key="await" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="rounded-2xl bg-white/10 px-4 py-2 text-center text-sm backdrop-blur-md">
                Pausa concluída. Pronto para o próximo foco?
              </motion.p>
            )}
            {onBreak && isRunning && (
              <motion.button key="skip" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => void skipBreakPhase(session.id)} className="flex items-center gap-1.5 rounded-full border border-white/25 px-4 py-2 text-sm font-medium text-white/90">
                <SkipIcon width={16} height={16} /> Pular pausa
              </motion.button>
            )}
          </AnimatePresence>
        </main>

        <footer className="flex items-end justify-center gap-8 pt-2">
          <CircleButton label="Descartar" onClick={() => setConfirmDiscard(true)}>
            <TrashIcon width={22} height={22} />
          </CircleButton>
          <CircleButton
            size="lg"
            label={isRunning ? 'Pausar' : view.awaitingNextFocus ? 'Próximo foco' : 'Retomar'}
            onClick={() => void (isRunning ? pause(session.id) : resume(session.id))}
            className="!bg-white/25"
          >
            {isRunning ? <PauseIcon width={32} height={32} /> : <PlayIcon width={32} height={32} />}
          </CircleButton>
          <CircleButton label="Finalizar" onClick={() => void startFinish()}>
            <CheckIcon width={24} height={24} />
          </CircleButton>
        </footer>
      </div>

      <ConfirmDialog
        open={confirmDiscard}
        title="Descartar esta sessão?"
        message="O tempo registrado nesta sessão será apagado e não contará no total do livro. Essa ação não pode ser desfeita."
        confirmLabel="Descartar"
        destructive
        onCancel={() => setConfirmDiscard(false)}
        onConfirm={() => void doDiscard()}
      />

      <FinishSheet
        open={finishOpen}
        book={book}
        focusMs={view.focusMs}
        onBack={() => {
          setFinishOpen(false)
          void resume(session.id)
        }}
        onSubmit={(p, t) => void submitFinish(p, t)}
      />

      <CompleteSheet
        book={completeFor}
        onClose={() => navigate(`/livro/${book.id}`, { replace: true })}
        onSave={async (data) => {
          await completeBook(book.id, data)
          navigate(`/livro/${book.id}`, { replace: true })
        }}
      />
    </div>
  )
}
