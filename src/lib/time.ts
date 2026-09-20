export function formatDuration(ms: number): string {
  if (ms > 0 && ms < 60_000) return `${Math.max(1, Math.floor(ms / 1000))}s`
  const totalMin = Math.floor(Math.max(0, ms) / 60_000)
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  if (h === 0) return `${m}min`
  return m === 0 ? `${h}h` : `${h}h ${String(m).padStart(2, '0')}min`
}

export function formatClock(ms: number): string {
  const totalSec = Math.floor(Math.max(0, ms) / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  const mm = String(m).padStart(2, '0')
  const ss = String(s).padStart(2, '0')
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
}

const monthFmt = new Intl.DateTimeFormat('pt-BR', { month: 'short' })

export function formatDate(ts: number | null | undefined): string {
  if (!ts) return '—'
  const d = new Date(ts)
  return `${d.getDate()} ${monthFmt.format(d).replace('.', '')} ${d.getFullYear()}`
}

export function toDateInput(ts: number | null | undefined): string {
  if (!ts) return ''
  const d = new Date(ts)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

export function fromDateInput(value: string): number | null {
  if (!value) return null
  const [y, m, d] = value.split('-').map(Number)
  return new Date(y, m - 1, d, 12).getTime()
}
