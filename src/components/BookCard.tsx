import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import type { Book } from '../domain/types'
import { formatDate, formatDuration } from '../lib/time'
import { CoverImage } from './CoverImage'
import { ClockIcon, PlayIcon } from './icons'
import { Stars } from './Stars'

interface Props {
  book: Book
  totalMs: number
  onStart?: (book: Book) => void
}

export function BookCard({ book, totalMs, onStart }: Props) {
  return (
    <motion.li layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }} className="relative list-none">
      <Link
        to={`/livro/${book.id}`}
        className="flex gap-4 rounded-3xl bg-surface p-3.5 pr-4 shadow-card transition-transform active:scale-[0.99]"
      >
        <CoverImage url={book.cover_url} title={book.title} className="w-[84px] shrink-0" />
        <div className="flex min-w-0 flex-1 flex-col py-0.5">
          <h3 className="line-clamp-2 font-display text-xl font-semibold leading-tight">{book.title}</h3>
          <p className="mt-0.5 truncate text-sm text-ink-2">{book.author || 'Autor desconhecido'}</p>

          <div className="mt-2.5 flex items-center gap-1.5 text-sm font-semibold text-leaf">
            <ClockIcon width={16} height={16} />
            <span className="tabular">{formatDuration(totalMs)}</span>
            <span className="font-normal text-ink-2">lidos</span>
          </div>

          <p className="mt-1 text-xs leading-relaxed text-ink-2">
            Início <span className="text-ink">{formatDate(book.started_at)}</span>
            <br />
            Término <span className="text-ink">{formatDate(book.finished_at)}</span>
          </p>

          {book.status === 'read' && book.rating ? (
            <div className="mt-auto pt-2">
              <Stars value={book.rating} size={16} />
            </div>
          ) : book.progress_pct != null ? (
            <div className="mt-auto pt-2.5 pr-12">
              <div className="h-1.5 overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-valuenow={book.progress_pct} aria-valuemin={0} aria-valuemax={100}>
                <div className="h-full rounded-full bg-gradient-to-r from-leaf to-terra transition-all" style={{ width: `${book.progress_pct}%` }} />
              </div>
              <p className="mt-1 text-[11px] text-ink-2 tabular">
                {book.progress_pct}%{book.current_page && book.total_pages ? ` · pág. ${book.current_page}/${book.total_pages}` : ''}
              </p>
            </div>
          ) : null}
        </div>
      </Link>
      {onStart && book.status !== 'read' && (
        <button
          onClick={() => onStart(book)}
          aria-label={`Iniciar leitura de ${book.title}`}
          className="btn-primary absolute bottom-3.5 right-3.5 flex h-11 w-11 items-center justify-center rounded-full shadow-cover transition-transform active:scale-90"
        >
          <PlayIcon width={20} height={20} />
        </button>
      )}
    </motion.li>
  )
}
