import { useState } from 'react'
import type { Book, SessionMode } from '../domain/types'
import { startSession } from '../db/repo'
import { requestNotifyPermission } from '../lib/notify'
import { Sheet } from './Sheet'

interface Props {
  book: Book | null
  onClose: () => void
  onStarted: (sessionId: string) => void
}

function Stepper({ label, value, min, max, step, onChange }: { label: string; value: number; min: number; max: number; step: number; onChange: (n: number) => void }) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-surface-2 px-4 py-3">
      <span className="text-sm font-medium">{label}</span>
      <div className="flex items-center gap-3">
        <button type="button" aria-label={`Diminuir ${label}`} onClick={() => onChange(Math.max(min, value - step))} className="h-9 w-9 rounded-full bg-surface text-lg shadow-card">
          −
        </button>
        <span className="w-16 text-center font-semibold tabular">{value} min</span>
        <button type="button" aria-label={`Aumentar ${label}`} onClick={() => onChange(Math.min(max, value + step))} className="h-9 w-9 rounded-full bg-surface text-lg shadow-card">
          +
        </button>
      </div>
    </div>
  )
}

export function StartSheet({ book, onClose, onStarted }: Props) {
  const [mode, setMode] = useState<SessionMode>('free')
  const [focus, setFocus] = useState(25)
  const [pause, setPause] = useState(5)
  const [busy, setBusy] = useState(false)

  const start = async () => {
    if (!book || busy) return
    setBusy(true)
    if (mode === 'pomodoro') void requestNotifyPermission()
    const s = await startSession({ bookId: book.id, mode, focusMin: focus, breakMin: pause })
    setBusy(false)
    onStarted(s.id)
  }

  return (
    <Sheet open={!!book} onClose={onClose} title="Iniciar leitura">
      {book && (
        <>
          <p className="-mt-2 mb-4 truncate text-sm text-ink-2">{book.title}</p>
          <div role="radiogroup" aria-label="Modo da sessão" className="grid grid-cols-2 gap-2">
            {(
              [
                ['free', 'Livre', 'Cronômetro progressivo'],
                ['pomodoro', 'Pomodoro', 'Ciclos de foco e pausa'],
              ] as const
            ).map(([id, name, hint]) => (
              <button
                key={id}
                role="radio"
                aria-checked={mode === id}
                onClick={() => setMode(id)}
                className={`rounded-2xl border-2 p-3 text-left transition ${mode === id ? 'border-leaf bg-leaf-soft' : 'border-transparent bg-surface-2'}`}
              >
                <span className="block font-semibold">{name}</span>
                <span className="block text-xs text-ink-2">{hint}</span>
              </button>
            ))}
          </div>

          {mode === 'pomodoro' && (
            <div className="mt-3 space-y-2">
              <Stepper label="Foco" value={focus} min={5} max={90} step={5} onChange={setFocus} />
              <Stepper label="Pausa" value={pause} min={1} max={30} step={1} onChange={setPause} />
              <p className="px-1 text-xs text-ink-2">O tempo de pausa não conta no total de leitura do livro.</p>
            </div>
          )}

          <button onClick={start} disabled={busy} className="btn-primary mt-5 h-14 w-full rounded-2xl text-base font-semibold shadow-card disabled:opacity-60">
            Começar
          </button>
        </>
      )}
    </Sheet>
  )
}
