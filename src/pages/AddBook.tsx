import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import type { Shelf } from '../domain/types'
import { addBook } from '../db/repo'
import { BookSearchQuotaError, searchBooks, type BookSearchResult } from '../lib/googleBooks'
import { fileToCoverDataUrl } from '../lib/image'
import { useOnline } from '../hooks/useOnline'
import { CoverImage } from '../components/CoverImage'
import { EmptyState } from '../components/EmptyState'
import { CheckIcon, ChevronLeftIcon, SearchIcon } from '../components/icons'
import { rememberShelf, SHELVES } from '../components/ShelfTabs'

function parseShelf(v: string | null): Shelf {
  return v === 'reading' || v === 'read' ? v : 'want'
}

export default function AddBook() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [shelf, setShelf] = useState<Shelf>(parseShelf(params.get('estante')))
  const [tab, setTab] = useState<'search' | 'manual'>('search')

  return (
    <div className="mx-auto min-h-dvh max-w-md px-5 pb-16">
      <header className="safe-top flex items-center gap-2 pb-2 pt-5">
        <button onClick={() => navigate(-1)} aria-label="Voltar" className="flex h-10 w-10 items-center justify-center rounded-full bg-surface shadow-card">
          <ChevronLeftIcon width={20} height={20} />
        </button>
        <h1 className="font-display text-3xl font-semibold">Adicionar livro</h1>
      </header>

      <div className="mt-3">
        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-ink-2">Adicionar em</p>
        <div role="radiogroup" aria-label="Estante de destino" className="flex rounded-2xl bg-surface-2 p-1">
          {SHELVES.map((s) => (
            <button
              key={s.id}
              role="radio"
              aria-checked={shelf === s.id}
              onClick={() => setShelf(s.id)}
              className={`flex-1 rounded-xl py-2 text-sm font-semibold transition ${shelf === s.id ? 'bg-surface text-ink shadow-card' : 'text-ink-2'}`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div role="tablist" className="mt-5 flex gap-6 border-b border-line">
        {(
          [
            ['search', 'Buscar'],
            ['manual', 'Cadastro manual'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`-mb-px border-b-2 pb-2.5 text-sm font-semibold transition ${tab === id ? 'border-terra text-ink' : 'border-transparent text-ink-2'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'search' ? <SearchTab shelf={shelf} onManual={() => setTab('manual')} /> : <ManualTab shelf={shelf} onDone={() => navigate('/')} />}
    </div>
  )
}

function SearchTab({ shelf, onManual }: { shelf: Shelf; onManual: () => void }) {
  const online = useOnline()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<BookSearchResult[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [added, setAdded] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults(null)
      setError(null)
      return
    }
    const ctrl = new AbortController()
    const t = setTimeout(async () => {
      setLoading(true)
      setError(null)
      try {
        setResults(await searchBooks(query, ctrl.signal))
      } catch (e) {
        if (e instanceof BookSearchQuotaError) setError('A busca atingiu o limite diário da Google Books API. Tente mais tarde ou cadastre manualmente.')
        else if ((e as Error).name !== 'AbortError') setError('Não foi possível buscar agora. Verifique a conexão ou cadastre manualmente.')
      } finally {
        if (!ctrl.signal.aborted) setLoading(false)
      }
    }, 350)
    return () => {
      clearTimeout(t)
      ctrl.abort()
    }
  }, [query])

  const add = async (r: BookSearchResult) => {
    await addBook({
      title: r.title,
      author: r.author,
      cover_url: r.coverUrl,
      isbn: r.isbn,
      google_books_id: r.googleId,
      total_pages: r.totalPages,
      status: shelf,
    })
    rememberShelf(shelf)
    setAdded((prev) => new Set(prev).add(r.googleId))
  }

  return (
    <div className="pt-4">
      <label className="relative block">
        <span className="sr-only">Buscar por título, autor ou ISBN</span>
        <SearchIcon width={20} height={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-2" />
        <input
          autoFocus
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Título, autor ou ISBN"
          className="h-14 w-full rounded-2xl bg-surface pl-12 pr-4 shadow-card outline-none focus:ring-2 focus:ring-leaf"
        />
      </label>

      {!online && <p className="mt-3 rounded-xl bg-terra-soft px-3 py-2 text-sm text-terra">Você está offline. A busca precisa de internet, mas o cadastro manual funciona.</p>}
      {error && <p role="alert" className="mt-3 rounded-xl bg-terra-soft px-3 py-2 text-sm text-terra">{error}</p>}
      {loading && <p className="mt-6 text-center text-sm text-ink-2">Buscando na estante do mundo…</p>}

      {!loading && results && results.length === 0 && !error && (
        <EmptyState
          kind="search"
          action={
            <button onClick={onManual} className="h-12 rounded-2xl bg-surface px-5 font-semibold shadow-card">
              Cadastrar manualmente
            </button>
          }
        />
      )}

      {results && results.length > 0 && (
        <ul className="mt-4 space-y-2.5">
          {results.map((r) => {
            const done = added.has(r.googleId)
            return (
              <li key={r.googleId} className="flex items-center gap-3 rounded-2xl bg-surface p-3 shadow-card">
                <CoverImage url={r.coverUrl} title={r.title} className="w-14 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 font-display text-lg font-semibold leading-tight">{r.title}</p>
                  <p className="truncate text-sm text-ink-2">{r.author}</p>
                  {r.totalPages && <p className="text-xs text-ink-2">{r.totalPages} páginas</p>}
                </div>
                <button
                  onClick={() => add(r)}
                  disabled={done}
                  className={`flex h-10 shrink-0 items-center gap-1 rounded-xl px-3 text-sm font-semibold transition ${done ? 'bg-leaf-soft text-leaf' : 'btn-primary'}`}
                >
                  {done ? (
                    <>
                      <CheckIcon width={16} height={16} /> Adicionado
                    </>
                  ) : (
                    'Adicionar'
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {!results && !loading && !error && (
        <p className="mt-8 text-center text-sm text-ink-2">Digite ao menos duas letras ou um ISBN para começar.</p>
      )}
    </div>
  )
}

function ManualTab({ shelf, onDone }: { shelf: Shelf; onDone: () => void }) {
  const [title, setTitle] = useState('')
  const [author, setAuthor] = useState('')
  const [pages, setPages] = useState('')
  const [coverUrl, setCoverUrl] = useState('')
  const [cover, setCover] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onFile = async (file: File | undefined) => {
    if (!file) return
    try {
      setCover(await fileToCoverDataUrl(file))
      setCoverUrl('')
      setError(null)
    } catch {
      setError('Não foi possível ler essa imagem.')
    }
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    setBusy(true)
    await addBook({
      title,
      author,
      cover_url: cover ?? (coverUrl.trim() || null),
      total_pages: Number(pages) > 0 ? Number(pages) : null,
      status: shelf,
    })
    rememberShelf(shelf)
    onDone()
  }

  const preview = cover ?? (coverUrl.trim() || null)

  return (
    <form onSubmit={submit} className="space-y-4 pt-5">
      <div className="flex gap-4">
        <CoverImage url={preview} title={title || 'Livro'} className="w-24 shrink-0" />
        <div className="flex flex-1 flex-col justify-center gap-2">
          <label className="flex h-11 cursor-pointer items-center justify-center rounded-xl bg-surface text-sm font-semibold shadow-card">
            Enviar imagem
            <input type="file" accept="image/*" className="sr-only" onChange={(e) => onFile(e.target.files?.[0])} />
          </label>
          <input
            type="url"
            inputMode="url"
            placeholder="ou cole a URL da capa"
            value={coverUrl}
            onChange={(e) => {
              setCoverUrl(e.target.value)
              setCover(null)
            }}
            className="h-11 rounded-xl bg-surface px-3 text-sm shadow-card outline-none focus:ring-2 focus:ring-leaf"
          />
        </div>
      </div>

      <label className="block text-sm font-medium">
        Título *
        <input required value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1 h-14 w-full rounded-2xl bg-surface px-4 shadow-card outline-none focus:ring-2 focus:ring-leaf" />
      </label>
      <label className="block text-sm font-medium">
        Autor
        <input value={author} onChange={(e) => setAuthor(e.target.value)} className="mt-1 h-14 w-full rounded-2xl bg-surface px-4 shadow-card outline-none focus:ring-2 focus:ring-leaf" />
      </label>
      <label className="block text-sm font-medium">
        Total de páginas
        <input inputMode="numeric" value={pages} onChange={(e) => setPages(e.target.value.replace(/\D/g, ''))} className="mt-1 h-14 w-full rounded-2xl bg-surface px-4 shadow-card outline-none focus:ring-2 focus:ring-leaf" />
      </label>

      {error && <p role="alert" className="text-sm text-terra">{error}</p>}
      <button disabled={busy || !title.trim()} className="btn-primary h-14 w-full rounded-2xl text-base font-semibold shadow-card disabled:opacity-50">
        Salvar livro
      </button>
      <Link to="/" className="block text-center text-sm text-ink-2">
        Cancelar
      </Link>
    </form>
  )
}
