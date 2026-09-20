import { useEffect, useState } from 'react'
import type { Book } from '../domain/types'
import { formatDuration } from '../lib/time'
import { Sheet } from './Sheet'

interface Props {
  open: boolean
  book: Book | null
  focusMs: number
  onBack: () => void
  onSubmit: (progress: { page?: number; pct?: number } | null, totalPages: number | null) => void
}

export function FinishSheet({ open, book, focusMs, onBack, onSubmit }: Props) {
  const [kind, setKind] = useState<'page' | 'pct'>('page')
  const [value, setValue] = useState('')
  const [total, setTotal] = useState('')

  useEffect(() => {
    if (!open || !book) return
    setKind(book.total_pages || book.current_page ? 'page' : 'pct')
    setValue(String(book.current_page ?? ''))
    setTotal(book.total_pages ? String(book.total_pages) : '')
  }, [open, book])

  const n = Number(value)
  const totalN = Number(total) || null
  const effectiveTotal = book?.total_pages ?? totalN
  const valid = value !== '' && Number.isFinite(n) && n >= 0 && (kind === 'pct' ? n <= 100 : !effectiveTotal || n <= effectiveTotal)

  const submit = () => {
    if (!valid) return
    onSubmit(kind === 'page' ? { page: Math.round(n) } : { pct: Math.round(n) }, book?.total_pages ? null : totalN)
  }

  return (
    <Sheet open={open} onClose={onBack} title="Onde você parou?" locked>
      <p className="-mt-2 mb-4 text-sm text-ink-2">
        Você leu <strong className="text-ink tabular">{formatDuration(focusMs)}</strong> nesta sessão. Informe o progresso atual.
      </p>

      <div role="radiogroup" aria-label="Tipo de progresso" className="flex rounded-2xl bg-surface-2 p-1">
        {(
          [
            ['page', 'Página'],
            ['pct', 'Porcentagem'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            role="radio"
            aria-checked={kind === id}
            onClick={() => setKind(id)}
            className={`flex-1 rounded-xl py-2 text-sm font-semibold transition ${kind === id ? 'bg-surface text-ink shadow-card' : 'text-ink-2'}`}
          >
            {label}
          </button>
        ))}
      </div>

      <label className="mt-4 block">
        <span className="text-sm font-medium">{kind === 'page' ? 'Página atual' : 'Progresso (%)'}</span>
        <input
          inputMode="numeric"
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value.replace(/\D/g, ''))}
          placeholder={kind === 'page' ? 'Ex.: 128' : 'Ex.: 45'}
          className="mt-1 h-14 w-full rounded-2xl bg-surface-2 px-4 text-xl font-semibold tabular outline-none focus:ring-2 focus:ring-leaf"
        />
      </label>

      {kind === 'page' && !book?.total_pages && (
        <label className="mt-3 block">
          <span className="text-sm font-medium">Total de páginas (opcional)</span>
          <input
            inputMode="numeric"
            value={total}
            onChange={(e) => setTotal(e.target.value.replace(/\D/g, ''))}
            placeholder="Para calcular a porcentagem"
            className="mt-1 h-12 w-full rounded-2xl bg-surface-2 px-4 tabular outline-none focus:ring-2 focus:ring-leaf"
          />
        </label>
      )}

      <button onClick={submit} disabled={!valid} className="btn-primary mt-5 h-14 w-full rounded-2xl text-base font-semibold shadow-card disabled:opacity-50">
        Salvar sessão
      </button>
      <div className="mt-2 flex gap-2">
        <button onClick={() => onSubmit(null, null)} className="h-12 flex-1 rounded-2xl text-sm font-semibold text-ink-2">
          Pular
        </button>
        <button onClick={onBack} className="h-12 flex-1 rounded-2xl text-sm font-semibold text-ink-2">
          Voltar à leitura
        </button>
      </div>
    </Sheet>
  )
}
