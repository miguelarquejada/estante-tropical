export interface BookSearchResult {
  googleId: string
  title: string
  author: string
  coverUrl: string | null
  isbn: string | null
  totalPages: number | null
}

/** A cota anônima da Google Books API é compartilhada e costuma esgotar; uma chave própria resolve. */
export class BookSearchQuotaError extends Error {
  constructor() {
    super('Cota da Google Books API esgotada')
    this.name = 'BookSearchQuotaError'
  }
}

const ISBN_RE =/^(\d{9}[\dXx]|\d{13})$/

export function buildQuery(input: string): string {
  const trimmed = input.trim()
  const compact = trimmed.replace(/[-\s]/g, '')
  return ISBN_RE.test(compact) ? `isbn:${compact}` : trimmed
}

interface VolumeInfo {
  title?: string
  subtitle?: string
  authors?: string[]
  pageCount?: number
  imageLinks?: { thumbnail?: string; smallThumbnail?: string }
  industryIdentifiers?: { type: string; identifier: string }[]
}

export function normalizeCover(url?: string): string | null {
  if (!url) return null
  return url.replace(/^http:/, 'https:').replace('&edge=curl', '')
}

export function mapVolume(item: { id: string; volumeInfo?: VolumeInfo }): BookSearchResult {
  const v = item.volumeInfo ?? {}
  const ids = v.industryIdentifiers ?? []
  const isbn = (ids.find((i) => i.type === 'ISBN_13') ?? ids.find((i) => i.type === 'ISBN_10'))?.identifier ?? null
  return {
    googleId: item.id,
    title: v.title ?? 'Sem título',
    author: v.authors?.join(', ') ?? 'Autor desconhecido',
    coverUrl: normalizeCover(v.imageLinks?.thumbnail ?? v.imageLinks?.smallThumbnail),
    isbn,
    totalPages: v.pageCount && v.pageCount > 0 ? v.pageCount : null,
  }
}

export async function searchBooks(input: string, signal?: AbortSignal): Promise<BookSearchResult[]> {
  const q = buildQuery(input)
  if (q.length < 2) return []
  const params = new URLSearchParams({ q, maxResults: '20', printType: 'books' })
  const key = import.meta.env.VITE_GOOGLE_BOOKS_KEY
  if (key) params.set('key', key)
  const res = await fetch(`https://www.googleapis.com/books/v1/volumes?${params}`, { signal })
  if (res.status === 429) throw new BookSearchQuotaError()
  if (!res.ok) throw new Error(`Google Books respondeu ${res.status}`)
  const data = (await res.json()) as { items?: { id: string; volumeInfo?: VolumeInfo }[] }
  return (data.items ?? []).map(mapVolume)
}
