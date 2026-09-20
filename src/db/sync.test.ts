import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { db } from './schema'
import { addBook, finish, moveBook, setCurrentUser, startSession, updateBook } from './repo'
import { syncNow } from './sync'

vi.stubGlobal('navigator', { onLine: true })

type Row = Record<string, unknown>

function fakeClient(remote: Record<string, Row[]> = {}, opts: { failUpsert?: boolean } = {}) {
  const upserts: { table: string; row: Row }[] = []
  const uploads: string[] = []
  const client = {
    from: (table: string) => ({
      upsert: async (row: Row) => {
        if (opts.failUpsert) return { error: new Error('rede caiu') }
        upserts.push({ table, row })
        return { error: null }
      },
      select: () => {
        let cursor = 0
        const q = {
          gt: (_col: string, v: number) => ((cursor = v), q),
          order: () => q,
          limit: async () => ({ data: (remote[table] ?? []).filter((r) => (r.updated_at as number) > cursor), error: null }),
        }
        return q
      },
    }),
    storage: {
      from: () => ({
        upload: async (path: string) => (uploads.push(path), { error: null }),
        getPublicUrl: (path: string) => ({ data: { publicUrl: `https://cdn.test/${path}` } }),
      }),
    },
  } as unknown as SupabaseClient
  return { client, upserts, uploads }
}

beforeEach(async () => {
  await Promise.all([db.books.clear(), db.sessions.clear(), db.outbox.clear(), db.meta.clear()])
  setCurrentUser('user-1')
})

describe('outbox local-first', () => {
  it('coalesce várias mutações do mesmo registro em uma única entrada', async () => {
    const book = await addBook({ title: 'A', author: 'B' })
    await updateBook(book.id, { total_pages: 100 })
    await updateBook(book.id, { total_pages: 200 })
    expect(await db.outbox.count()).toBe(1)
  })

  it('envia livros antes das sessões e esvazia a fila', async () => {
    const book = await addBook({ title: 'A', author: 'B', total_pages: 100 })
    await startSession({ bookId: book.id, mode: 'free' })
    const { client, upserts } = fakeClient()
    await syncNow(client, 'user-1')
    expect(upserts.map((u) => u.table)).toEqual(['books', 'reading_sessions'])
    expect(upserts.every((u) => u.row.user_id === 'user-1')).toBe(true)
    expect(await db.outbox.count()).toBe(0)
  })

  it('mantém a fila quando o envio falha e reenvia depois (idempotente)', async () => {
    await addBook({ title: 'Offline', author: 'X' })
    const failing = fakeClient({}, { failUpsert: true })
    await syncNow(failing.client, 'user-1')
    expect(await db.outbox.count()).toBe(1)

    const ok = fakeClient()
    await syncNow(ok.client, 'user-1')
    expect(ok.upserts).toHaveLength(1)
    expect(await db.outbox.count()).toBe(0)
  })

  it('sobe capa enviada manualmente (data URL) e troca pela URL pública', async () => {
    const book = await addBook({ title: 'Capa', author: 'X', cover_url: 'data:image/jpeg;base64,/9j/4AAQ' })
    const { client, upserts, uploads } = fakeClient()
    await syncNow(client, 'user-1')
    expect(uploads).toEqual([`user-1/${book.id}.jpg`])
    expect(String(upserts[0].row.cover_url)).toContain(`https://cdn.test/user-1/${book.id}.jpg`)
    expect(String((await db.books.get(book.id))?.cover_url).startsWith('https://')).toBe(true)
  })
})

describe('pull com last-write-wins', () => {
  it('aplica linhas remotas novas e mais recentes, ignora as mais antigas que o local', async () => {
    const local = await addBook({ title: 'Local', author: 'X' })
    await db.outbox.clear()
    const newer = { ...local, id: 'r-new', title: 'Remoto novo', updated_at: local.updated_at + 1000 }
    const staleOfLocal = { ...local, title: 'Remoto velho', updated_at: local.updated_at - 5000 }
    const { client } = fakeClient({ books: [staleOfLocal, newer], reading_sessions: [] })
    await syncNow(client, 'user-1')
    expect((await db.books.get(local.id))?.title).toBe('Local')
    expect((await db.books.get('r-new'))?.title).toBe('Remoto novo')
    expect((await db.meta.get('cursor:books'))?.value).toBe(local.updated_at + 1000)
  })

  it('remoto mais novo sobrescreve o local', async () => {
    const local = await addBook({ title: 'Antigo', author: 'X' })
    await db.outbox.clear()
    const remote = { ...local, title: 'Editado em outro aparelho', updated_at: local.updated_at + 10 }
    const { client } = fakeClient({ books: [remote], reading_sessions: [] })
    await syncNow(client, 'user-1')
    expect((await db.books.get(local.id))?.title).toBe('Editado em outro aparelho')
  })
})

describe('regras de negócio no repositório', () => {
  it('só permite uma sessão ativa e move o livro para Lendo', async () => {
    const a = await addBook({ title: 'A', author: 'x' })
    const b = await addBook({ title: 'B', author: 'x' })
    const s1 = await startSession({ bookId: a.id, mode: 'free' })
    const s2 = await startSession({ bookId: b.id, mode: 'pomodoro' })
    expect(s2.id).toBe(s1.id)
    const moved = await db.books.get(a.id)
    expect(moved?.status).toBe('reading')
    expect(moved?.started_at).toBeTruthy()
  })

  it('finalizar com página calcula porcentagem e sinaliza conclusão em 100%', async () => {
    const book = await addBook({ title: 'A', author: 'x', total_pages: 200 })
    const s = await startSession({ bookId: book.id, mode: 'free' })
    const half = await finish(s.id, { page: 100 })
    expect(half.completed).toBe(false)
    expect((await db.books.get(book.id))?.progress_pct).toBe(50)

    const s2 = await startSession({ bookId: book.id, mode: 'free' })
    const done = await finish(s2.id, { page: 200 })
    expect(done.completed).toBe(true)
  })

  it('mover para Lidos define término e 100%', async () => {
    const book = await addBook({ title: 'A', author: 'x', total_pages: 50 })
    await moveBook(book.id, 'read')
    const b = await db.books.get(book.id)
    expect(b?.status).toBe('read')
    expect(b?.finished_at).toBeTruthy()
    expect(b?.progress_pct).toBe(100)
    expect(b?.current_page).toBe(50)
  })
})
