import { useEffect, useState } from 'react'
import type { Book } from '../domain/types'
import { fromDateInput, toDateInput } from '../lib/time'
import { Sheet } from './Sheet'
import { Stars } from './Stars'

interface Props {
  book: Book | null
  onClose: () => void
  onSave: (data: { rating: number | null; startedAt: number | null; finishedAt: number }) => void
}

export function CompleteSheet({ book, onClose, onSave }: Props) {
  const [rating, setRating] = useState<number | null>(null)
  const [started, setStarted] = useState('')
  const [finished, setFinished] = useState('')

  useEffect(() => {
    if (!book) return
    setRating(book.rating)
    setStarted(toDateInput(book.started_at))
    setFinished(toDateInput(book.finished_at ?? Date.now()))
  }, [book])

  return (
    <Sheet open={!!book} onClose={onClose} title="Leitura concluída">
      {book && (
        <>
          <p className="-mt-2 mb-4 text-sm text-ink-2">Como foi ler “{book.title}”?</p>
          <div className="flex justify-center py-2">
            <Stars value={rating} onChange={setRating} size={40} />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <label className="block text-sm font-medium">
              Comecei em
              <input type="date" value={started} onChange={(e) => setStarted(e.target.value)} className="mt-1 h-12 w-full rounded-2xl bg-surface-2 px-3 outline-none focus:ring-2 focus:ring-leaf" />
            </label>
            <label className="block text-sm font-medium">
              Terminei em
              <input type="date" value={finished} onChange={(e) => setFinished(e.target.value)} className="mt-1 h-12 w-full rounded-2xl bg-surface-2 px-3 outline-none focus:ring-2 focus:ring-leaf" />
            </label>
          </div>
          <button
            onClick={() => onSave({ rating, startedAt: fromDateInput(started), finishedAt: fromDateInput(finished) ?? Date.now() })}
            className="btn-primary mt-5 h-14 w-full rounded-2xl text-base font-semibold shadow-card"
          >
            Mover para Lidos
          </button>
          <button onClick={onClose} className="mt-2 h-12 w-full rounded-2xl text-sm font-semibold text-ink-2">
            Ainda não terminei
          </button>
        </>
      )}
    </Sheet>
  )
}
