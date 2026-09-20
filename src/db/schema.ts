import Dexie, { type EntityTable } from 'dexie'
import type { Book, ReadingSession } from '../domain/types'

export type SyncTable = 'books' | 'sessions'

export interface OutboxItem {
  seq?: number
  table: SyncTable
  rowId: string
}

export interface MetaRow {
  key: string
  value: unknown
}

class EstanteDB extends Dexie {
  books!: EntityTable<Book, 'id'>
  sessions!: EntityTable<ReadingSession, 'id'>
  outbox!: EntityTable<OutboxItem, 'seq'>
  meta!: EntityTable<MetaRow, 'key'>

  constructor() {
    super('estante-tropical')
    this.version(1).stores({
      books: 'id, status, updated_at, deleted_at',
      sessions: 'id, book_id, status, updated_at',
      outbox: '++seq, [table+rowId]',
      meta: 'key',
    })
  }
}

export const db = new EstanteDB()

export async function resetForUser(userId: string) {
  const current = (await db.meta.get('userId'))?.value
  if (current === userId) return
  await db.transaction('rw', db.books, db.sessions, db.outbox, db.meta, async () => {
    await Promise.all([db.books.clear(), db.sessions.clear(), db.outbox.clear(), db.meta.clear()])
    await db.meta.put({ key: 'userId', value: userId })
  })
}
