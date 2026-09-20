import { motion } from 'framer-motion'
import type { Shelf } from '../domain/types'

export const SHELVES: { id: Shelf; label: string }[] = [
  { id: 'reading', label: 'Lendo' },
  { id: 'want', label: 'Quero Ler' },
  { id: 'read', label: 'Lidos' },
]

const SHELF_KEY = 'estante:shelf'

export function rememberShelf(s: Shelf) {
  try {
    sessionStorage.setItem(SHELF_KEY, s)
  } catch {
    /* ignore */
  }
}

export function recallShelf(): Shelf {
  try {
    const v = sessionStorage.getItem(SHELF_KEY)
    return v === 'want' || v === 'read' ? v : 'reading'
  } catch {
    return 'reading'
  }
}

interface Props {
  value: Shelf
  onChange: (s: Shelf) => void
  counts: Record<Shelf, number>
}

export function ShelfTabs({ value, onChange, counts }: Props) {
  return (
    <div role="tablist" aria-label="Estantes" className="relative flex rounded-2xl bg-surface-2 p-1">
      {SHELVES.map((s) => {
        const active = value === s.id
        return (
          <button
            key={s.id}
            role="tab"
            id={`tab-${s.id}`}
            aria-selected={active}
            aria-controls="shelf-panel"
            onClick={() => onChange(s.id)}
            className={`relative z-10 flex-1 rounded-xl px-2 py-2.5 text-sm font-semibold transition-colors ${active ? 'text-ink' : 'text-ink-2'}`}
          >
            {active && (
              <motion.span
                layoutId="shelf-indicator"
                className="absolute inset-0 -z-10 rounded-xl bg-surface shadow-card"
                transition={{ type: 'spring', stiffness: 420, damping: 34 }}
              />
            )}
            {s.label}
            <span className={`ml-1.5 text-xs tabular ${active ? 'text-terra' : 'text-ink-2/70'}`}>{counts[s.id]}</span>
          </button>
        )
      })}
    </div>
  )
}
