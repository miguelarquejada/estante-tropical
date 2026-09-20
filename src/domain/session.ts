import type { Phase, ReadingSession, SessionMode } from './types'

type Timing = Pick<
  ReadingSession,
  'mode' | 'status' | 'segments' | 'focus_ms' | 'break_ms' | 'phase' | 'phase_started_at' | 'phase_elapsed_ms'
>

export interface NewSessionInput {
  id: string
  book_id: string
  user_id?: string | null
  mode: SessionMode
  focus_ms?: number
  break_ms?: number
  now: number
}

export const DEFAULT_FOCUS_MS = 25 * 60_000
export const DEFAULT_BREAK_MS = 5 * 60_000

export function createSession(input: NewSessionInput): ReadingSession {
  const { now } = input
  return {
    id: input.id,
    user_id: input.user_id ?? null,
    book_id: input.book_id,
    mode: input.mode,
    status: 'running',
    segments: [{ start: now, end: null }],
    focus_ms: Math.max(60_000, input.focus_ms ?? DEFAULT_FOCUS_MS),
    break_ms: Math.max(60_000, input.break_ms ?? DEFAULT_BREAK_MS),
    phase: 'focus',
    phase_started_at: now,
    phase_elapsed_ms: 0,
    ended_at: null,
    duration_ms: 0,
    page_at_end: null,
    created_at: now,
    updated_at: now,
    deleted_at: null,
  }
}

const isActive = (s: Pick<ReadingSession, 'status'>) => s.status === 'running' || s.status === 'paused'

function closeOpenSegment(segments: ReadingSession['segments'], at: number) {
  return segments.map((seg) => (seg.end === null ? { start: seg.start, end: Math.max(at, seg.start) } : seg))
}

function openSegment(segments: ReadingSession['segments'], at: number) {
  return segments.some((seg) => seg.end === null) ? segments : [...segments, { start: at, end: null }]
}

/**
 * Aplica as transições de fase do Pomodoro que já deveriam ter ocorrido até `now`,
 * usando o instante exato de cada fim de fase (e não o momento em que o app foi reaberto).
 * Foco → pausa continua sozinho; pausa → foco espera o usuário (status 'paused'),
 * para que horas de app esquecido não virem tempo de leitura fictício.
 */
export function resolveSession<T extends Timing>(session: T, now: number): T {
  if (session.mode !== 'pomodoro' || session.status !== 'running') return session
  let s = session
  for (let guard = 0; guard < 8; guard++) {
    const len = s.phase === 'focus' ? s.focus_ms : s.break_ms
    const phaseEnd = s.phase_started_at + (len - s.phase_elapsed_ms)
    if (now < phaseEnd) break
    if (s.phase === 'focus') {
      s = {
        ...s,
        segments: closeOpenSegment(s.segments, phaseEnd),
        phase: 'break' as Phase,
        phase_started_at: phaseEnd,
        phase_elapsed_ms: 0,
      }
    } else {
      s = { ...s, phase: 'focus' as Phase, status: 'paused', phase_started_at: phaseEnd, phase_elapsed_ms: 0 }
      break
    }
  }
  return s
}

/** Tempo de leitura (foco) acumulado. Nunca negativo, mesmo com relógio do aparelho alterado. */
export function focusElapsedMs(session: Pick<ReadingSession, 'segments'>, now: number): number {
  return session.segments.reduce((sum, seg) => sum + Math.max(0, (seg.end ?? now) - seg.start), 0)
}

export function pauseSession(session: ReadingSession, now: number): ReadingSession {
  const s = resolveSession(session, now)
  if (s.status !== 'running') return s
  return {
    ...s,
    status: 'paused',
    segments: closeOpenSegment(s.segments, now),
    phase_elapsed_ms: s.phase_elapsed_ms + Math.max(0, now - s.phase_started_at),
  }
}

export function resumeSession(session: ReadingSession, now: number): ReadingSession {
  const s = resolveSession(session, now)
  if (s.status !== 'paused') return s
  return {
    ...s,
    status: 'running',
    phase_started_at: now,
    segments: s.phase === 'focus' ? openSegment(s.segments, now) : s.segments,
  }
}

export function skipBreak(session: ReadingSession, now: number): ReadingSession {
  const s = resolveSession(session, now)
  if (s.mode !== 'pomodoro' || s.phase !== 'break' || !isActive(s)) return s
  return {
    ...s,
    phase: 'focus',
    status: 'running',
    phase_started_at: now,
    phase_elapsed_ms: 0,
    segments: openSegment(s.segments, now),
  }
}

export function finishSession(session: ReadingSession, now: number, pageAtEnd: number | null = null): ReadingSession {
  const s = resolveSession(session, now)
  if (!isActive(s)) return s
  const segments = closeOpenSegment(s.segments, now)
  return {
    ...s,
    status: 'finished',
    segments,
    ended_at: now,
    duration_ms: focusElapsedMs({ segments }, now),
    page_at_end: pageAtEnd,
  }
}

export function discardSession(session: ReadingSession, now: number): ReadingSession {
  if (!isActive(session)) return session
  return {
    ...session,
    status: 'discarded',
    segments: closeOpenSegment(session.segments, now),
    ended_at: now,
    duration_ms: 0,
  }
}

export interface SessionView {
  status: ReadingSession['status']
  phase: Phase
  focusMs: number
  /** Tempo restante da fase (apenas Pomodoro); null no modo livre. */
  phaseRemainingMs: number | null
  phaseLengthMs: number | null
  /** true quando o foco terminou e o app aguarda o usuário iniciar o próximo. */
  awaitingNextFocus: boolean
}

export function viewSession(session: ReadingSession, now: number): SessionView {
  const s = resolveSession(session, now)
  const focusMs = focusElapsedMs(s, now)
  if (s.mode === 'free') {
    return { status: s.status, phase: 'focus', focusMs, phaseRemainingMs: null, phaseLengthMs: null, awaitingNextFocus: false }
  }
  const len = s.phase === 'focus' ? s.focus_ms : s.break_ms
  const consumed = s.phase_elapsed_ms + (s.status === 'running' ? Math.max(0, now - s.phase_started_at) : 0)
  return {
    status: s.status,
    phase: s.phase,
    focusMs,
    phaseRemainingMs: Math.max(0, len - consumed),
    phaseLengthMs: len,
    awaitingNextFocus: s.status === 'paused' && s.phase === 'focus' && s.phase_elapsed_ms === 0,
  }
}

export function totalFocusMs(sessions: Pick<ReadingSession, 'status' | 'duration_ms' | 'deleted_at'>[]): number {
  return sessions.reduce((sum, s) => (s.status === 'finished' && !s.deleted_at ? sum + s.duration_ms : sum), 0)
}
