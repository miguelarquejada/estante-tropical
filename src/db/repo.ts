import { db, type SyncTable } from './schema'
import { newId } from '../lib/id'
import {
  createSession,
  discardSession,
  finishSession,
  pauseSession,
  resumeSession,
  skipBreak,
} from '../domain/session'
import type { Book, ReadingSession, SessionMode, Shelf } from '../domain/types'

let currentUserId: string | null = null
const syncListeners = new Set<() => void>()

export const setCurrentUser = (id: string | null) => {
  currentUserId = id
}
/** Chamado após cada mutação para o motor de sync tentar enviar. */
export const onLocalChange = (fn: () => void) => {
  syncListeners.add(fn)
  return () => syncListeners.delete(fn)
}

async function queue(table: SyncTable, rowId: string) {
  await db.outbox.where('[table+rowId]').equals([table, rowId]).delete()
  await db.outbox.add({ table, rowId })
}

async function saveBook(book: Book) {
  await db.transaction('rw', db.books, db.outbox, async () => {
    await db.books.put(book)
    await queue('books', book.id)
  })
  syncListeners.forEach((fn) => fn())
}

async function saveSession(session: ReadingSession) {
  await db.transaction('rw', db.sessions, db.outbox, async () => {
    await db.sessions.put(session)
    await queue('sessions', session.id)
  })
  syncListeners.forEach((fn) => fn())
}

export interface NewBookInput {
  title: string
  author: string
  cover_url?: string | null
  isbn?: string | null
  google_books_id?: string | null
  total_pages?: number | null
  status?: Shelf
}

export async function addBook(input: NewBookInput): Promise<Book> {
  const now = Date.now()
  const status = input.status ?? 'want'
  const book: Book = {
    id: newId(),
    user_id: currentUserId,
    title: input.title.trim(),
    author: input.author.trim(),
    cover_url: input.cover_url ?? null,
    isbn: input.isbn ?? null,
    google_books_id: input.google_books_id ?? null,
    total_pages: input.total_pages ?? null,
    status,
    current_page: null,
    progress_pct: null,
    started_at: status === 'reading' || status === 'read' ? now : null,
    finished_at: status === 'read' ? now : null,
    rating: null,
    created_at: now,
    updated_at: now,
    deleted_at: null,
  }
  await saveBook(book)
  return book
}

export async function updateBook(id: string, patch: Partial<Omit<Book, 'id' | 'user_id' | 'created_at'>>) {
  const book = await db.books.get(id)
  if (!book) return
  await saveBook({ ...book, ...patch, updated_at: Date.now() })
}

export async function moveBook(id: string, status: Shelf) {
  const book = await db.books.get(id)
  if (!book || book.status === status) return
  const now = Date.now()
  const patch: Partial<Book> = { status }
  if (status === 'reading') {
    patch.started_at = book.started_at ?? now
    patch.finished_at = null
  } else if (status === 'read') {
    patch.started_at = book.started_at ?? now
    patch.finished_at = book.finished_at ?? now
    patch.progress_pct = 100
    if (book.total_pages) patch.current_page = book.total_pages
  } else {
    patch.finished_at = null
  }
  await updateBook(id, patch)
}

export async function deleteBook(id: string) {
  const now = Date.now()
  const sessions = await db.sessions.where('book_id').equals(id).toArray()
  for (const s of sessions) await saveSession({ ...s, deleted_at: now, updated_at: now })
  await updateBook(id, { deleted_at: now })
}

export async function getActiveSession(): Promise<ReadingSession | undefined> {
  return db.sessions
    .where('status')
    .anyOf('running', 'paused')
    .filter((s) => !s.deleted_at)
    .first()
}

export interface StartSessionInput {
  bookId: string
  mode: SessionMode
  focusMin?: number
  breakMin?: number
}

/** Só existe uma sessão ativa por vez: se já houver, devolve a existente. */
export async function startSession(input: StartSessionInput): Promise<ReadingSession> {
  const existing = await getActiveSession()
  if (existing) return existing
  const now = Date.now()
  const session = createSession({
    id: newId(),
    book_id: input.bookId,
    user_id: currentUserId,
    mode: input.mode,
    focus_ms: input.focusMin ? input.focusMin * 60_000 : undefined,
    break_ms: input.breakMin ? input.breakMin * 60_000 : undefined,
    now,
  })
  await saveSession(session)
  const book = await db.books.get(input.bookId)
  if (book && book.status !== 'reading') {
    await updateBook(book.id, {
      status: 'reading',
      started_at: book.started_at ?? now,
      finished_at: null,
    })
  }
  return session
}

type Transition = (s: ReadingSession, now: number) => ReadingSession

async function transition(id: string, fn: Transition) {
  const s = await db.sessions.get(id)
  if (!s) return
  const now = Date.now()
  await saveSession({ ...fn(s, now), updated_at: now })
}

export const pause = (id: string) => transition(id, pauseSession)
export const resume = (id: string) => transition(id, resumeSession)
export const skipBreakPhase = (id: string) => transition(id, skipBreak)
export const discard = (id: string) => transition(id, discardSession)

/** Persiste transições de fase do Pomodoro calculadas pela UI ao voltar ao app. */
export async function persistResolved(session: ReadingSession) {
  await saveSession({ ...session, updated_at: Date.now() })
}

export interface Progress {
  page?: number | null
  pct?: number | null
}

export function computeProgress(progress: Progress, totalPages: number | null) {
  let page = progress.page ?? null
  let pct = progress.pct ?? null
  if (page != null && totalPages) pct = Math.min(100, Math.round((page / totalPages) * 100))
  else if (pct != null && totalPages) page = Math.round((pct / 100) * totalPages)
  if (pct != null) pct = Math.max(0, Math.min(100, pct))
  return { current_page: page, progress_pct: pct }
}

export async function finish(id: string, progress: Progress | null): Promise<{ book: Book | undefined; completed: boolean }> {
  const session = await db.sessions.get(id)
  if (!session) return { book: undefined, completed: false }
  const book = await db.books.get(session.book_id)
  const computed = progress ? computeProgress(progress, book?.total_pages ?? null) : null
  const now = Date.now()
  await saveSession({ ...finishSession(session, now, computed?.current_page ?? progress?.page ?? null), updated_at: now })
  if (book && computed && (computed.current_page != null || computed.progress_pct != null)) {
    await updateBook(book.id, computed)
  }
  const completed = Boolean(computed && computed.progress_pct != null && computed.progress_pct >= 100)
  return { book: await db.books.get(session.book_id), completed }
}

export async function completeBook(id: string, data: { rating: number | null; startedAt: number | null; finishedAt: number }) {
  const book = await db.books.get(id)
  if (!book) return
  await updateBook(id, {
    status: 'read',
    started_at: data.startedAt ?? book.started_at ?? data.finishedAt,
    finished_at: data.finishedAt,
    rating: data.rating,
    progress_pct: 100,
    current_page: book.total_pages ?? book.current_page,
  })
}
