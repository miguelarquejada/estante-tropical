import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/schema'
import type { Book, ReadingSession } from '../domain/types'

export const useBooks = (): Book[] | undefined =>
  useLiveQuery(async () => (await db.books.toArray()).filter((b) => !b.deleted_at).sort((a, b) => b.updated_at - a.updated_at), [])

export const useBook = (id: string | undefined): Book | null | undefined =>
  useLiveQuery(async () => {
    if (!id) return null
    const b = await db.books.get(id)
    return b && !b.deleted_at ? b : null
  }, [id])

export const useBookSessions = (bookId: string | undefined): ReadingSession[] | undefined =>
  useLiveQuery(
    async () =>
      bookId
        ? (await db.sessions.where('book_id').equals(bookId).toArray())
            .filter((s) => s.status === 'finished' && !s.deleted_at)
            .sort((a, b) => (b.ended_at ?? 0) - (a.ended_at ?? 0))
        : [],
    [bookId],
  )

/** Tempo acumulado por livro (somente sessões finalizadas e não apagadas). */
export const useBookTotals = (): Map<string, number> | undefined =>
  useLiveQuery(async () => {
    const totals = new Map<string, number>()
    const finished = await db.sessions.where('status').equals('finished').toArray()
    for (const s of finished) if (!s.deleted_at) totals.set(s.book_id, (totals.get(s.book_id) ?? 0) + s.duration_ms)
    return totals
  }, [])

export const useSession = (id: string | undefined): ReadingSession | null | undefined =>
  useLiveQuery(async () => (id ? ((await db.sessions.get(id)) ?? null) : null), [id])

export const useActiveSession = (): ReadingSession | null | undefined =>
  useLiveQuery(
    async () =>
      (await db.sessions
        .where('status')
        .anyOf('running', 'paused')
        .filter((s) => !s.deleted_at)
        .first()) ?? null,
    [],
  )
