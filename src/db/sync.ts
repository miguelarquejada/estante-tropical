import type { SupabaseClient } from '@supabase/supabase-js'
import { db, type SyncTable } from './schema'
import { onLocalChange } from './repo'

const REMOTE: Record<SyncTable, string> = { books: 'books', sessions: 'reading_sessions' }
const TABLES: SyncTable[] = ['books', 'sessions']
const PAGE = 500

export type SyncStatus = 'idle' | 'syncing' | 'error' | 'offline'

let status: SyncStatus = 'idle'
const listeners = new Set<() => void>()
const setStatus = (s: SyncStatus) => {
  if (status === s) return
  status = s
  listeners.forEach((fn) => fn())
}
export const getSyncStatus = () => status
export const subscribeSyncStatus = (fn: () => void) => {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [head, body] = dataUrl.split(',')
  const mime = /data:([^;]+)/.exec(head)?.[1] ?? 'image/jpeg'
  const bin = atob(body)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return new Blob([bytes], { type: mime })
}

async function uploadPendingCover(client: SupabaseClient, userId: string, bookId: string, dataUrl: string) {
  const path = `${userId}/${bookId}.jpg`
  const { error } = await client.storage.from('covers').upload(path, dataUrlToBlob(dataUrl), { upsert: true, contentType: 'image/jpeg' })
  if (error) throw error
  const { data } = client.storage.from('covers').getPublicUrl(path)
  return `${data.publicUrl}?v=${Date.now()}`
}

async function push(client: SupabaseClient, userId: string) {
  const items = await db.outbox.orderBy('seq').toArray()
  // Livros antes das sessões: sessions.book_id referencia books.id.
  items.sort((a, b) => (a.table === b.table ? a.seq! - b.seq! : a.table === 'books' ? -1 : 1))
  for (const item of items) {
    const table = item.table === 'books' ? db.books : db.sessions
    const row = await table.get(item.rowId)
    if (row) {
      const payload: Record<string, unknown> = { ...row, user_id: userId }
      if (item.table === 'books' && typeof payload.cover_url === 'string' && payload.cover_url.startsWith('data:')) {
        const url = await uploadPendingCover(client, userId, row.id, payload.cover_url)
        payload.cover_url = url
        await db.books.update(row.id, { cover_url: url })
      }
      const { error } = await client.from(REMOTE[item.table]).upsert(payload, { onConflict: 'id' })
      if (error) throw error
    }
    await db.outbox.delete(item.seq!)
  }
}

async function pull(client: SupabaseClient) {
  for (const table of TABLES) {
    const cursorKey = `cursor:${table}`
    let cursor = ((await db.meta.get(cursorKey))?.value as number | undefined) ?? 0
    for (;;) {
      const { data, error } = await client
        .from(REMOTE[table])
        .select('*')
        .gt('updated_at', cursor)
        .order('updated_at', { ascending: true })
        .limit(PAGE)
      if (error) throw error
      if (!data?.length) break
      const local = table === 'books' ? db.books : db.sessions
      await db.transaction('rw', local, async () => {
        for (const remote of data as { id: string; updated_at: number }[]) {
          const existing = await local.get(remote.id)
          // Last-write-wins: mudança local ainda não enviada, mais nova, prevalece.
          if (!existing || remote.updated_at > existing.updated_at) await local.put(remote as never)
        }
      })
      cursor = (data[data.length - 1] as { updated_at: number }).updated_at
      await db.meta.put({ key: cursorKey, value: cursor })
      if (data.length < PAGE) break
    }
  }
}

let inflight: Promise<void> | null = null
let rerun = false

export function syncNow(client: SupabaseClient | null, userId: string | null): Promise<void> {
  if (!client || !userId) return Promise.resolve()
  if (!navigator.onLine) {
    setStatus('offline')
    return Promise.resolve()
  }
  if (inflight) {
    rerun = true
    return inflight
  }
  setStatus('syncing')
  inflight = (async () => {
    try {
      do {
        rerun = false
        await push(client, userId)
        await pull(client)
      } while (rerun)
      setStatus('idle')
    } catch (err) {
      console.warn('[sync] falhou, tentará novamente', err)
      setStatus(navigator.onLine ? 'error' : 'offline')
    } finally {
      inflight = null
    }
  })()
  return inflight
}

/** Liga os gatilhos de sync: login, volta da conexão, volta ao foco e mutações locais. */
export function startSyncEngine(client: SupabaseClient | null, userId: string | null) {
  if (!client || !userId) return () => {}
  let timer: ReturnType<typeof setTimeout> | undefined
  const run = () => void syncNow(client, userId)
  const debounced = () => {
    clearTimeout(timer)
    timer = setTimeout(run, 400)
  }
  const onVisible = () => document.visibilityState === 'visible' && run()
  const onOffline = () => setStatus('offline')
  window.addEventListener('online', run)
  window.addEventListener('offline', onOffline)
  document.addEventListener('visibilitychange', onVisible)
  const off = onLocalChange(debounced)
  run()
  return () => {
    clearTimeout(timer)
    window.removeEventListener('online', run)
    window.removeEventListener('offline', onOffline)
    document.removeEventListener('visibilitychange', onVisible)
    off()
  }
}
