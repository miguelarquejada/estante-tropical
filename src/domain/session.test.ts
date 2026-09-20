import { describe, expect, it } from 'vitest'
import {
  createSession,
  discardSession,
  finishSession,
  focusElapsedMs,
  pauseSession,
  resolveSession,
  resumeSession,
  skipBreak,
  totalFocusMs,
  viewSession,
} from './session'

const MIN = 60_000
const T0 = 1_700_000_000_000
const base = { id: 's1', book_id: 'b1' }

describe('modo livre', () => {
  it('soma pausas e retomadas corretamente', () => {
    let s = createSession({ ...base, mode: 'free', now: T0 })
    s = pauseSession(s, T0 + 10 * MIN)
    s = resumeSession(s, T0 + 30 * MIN)
    s = finishSession(s, T0 + 35 * MIN, 120)
    expect(s.status).toBe('finished')
    expect(s.duration_ms).toBe(15 * MIN)
    expect(s.page_at_end).toBe(120)
  })

  it('continua contando com o app fechado (só timestamps)', () => {
    const s = createSession({ ...base, mode: 'free', now: T0 })
    expect(focusElapsedMs(s, T0 + 3 * 60 * MIN)).toBe(180 * MIN)
  })

  it('descartar não contribui com tempo', () => {
    let s = createSession({ ...base, mode: 'free', now: T0 })
    s = discardSession(s, T0 + 20 * MIN)
    expect(s.status).toBe('discarded')
    expect(totalFocusMs([s])).toBe(0)
  })

  it('relógio atrasado não gera tempo negativo', () => {
    let s = createSession({ ...base, mode: 'free', now: T0 })
    s = pauseSession(s, T0 - 5 * MIN)
    expect(focusElapsedMs(s, T0 - 5 * MIN)).toBe(0)
    expect(s.segments.every((seg) => (seg.end ?? 0) >= seg.start)).toBe(true)
  })
})

describe('modo pomodoro 25/5', () => {
  const start = () => createSession({ ...base, mode: 'pomodoro', now: T0 })

  it('pausa do pomodoro não entra no tempo total', () => {
    const s = finishSession(start(), T0 + 28 * MIN)
    // 25 min de foco + 3 min de pausa já em andamento
    expect(s.duration_ms).toBe(25 * MIN)
  })

  it('app fechado por 40 min: 25 de foco, pausa completa e espera o próximo foco', () => {
    const resolved = resolveSession(start(), T0 + 40 * MIN)
    expect(resolved.status).toBe('paused')
    expect(resolved.phase).toBe('focus')
    expect(focusElapsedMs(resolved, T0 + 40 * MIN)).toBe(25 * MIN)
    expect(viewSession(resolved, T0 + 40 * MIN).awaitingNextFocus).toBe(true)
  })

  it('fecha o segmento no instante exato do fim do foco', () => {
    const resolved = resolveSession(start(), T0 + 27 * MIN)
    expect(resolved.phase).toBe('break')
    expect(resolved.segments).toEqual([{ start: T0, end: T0 + 25 * MIN }])
    const v = viewSession(start(), T0 + 27 * MIN)
    expect(v.phaseRemainingMs).toBe(3 * MIN)
  })

  it('pausar durante o foco preserva o restante da fase', () => {
    let s = pauseSession(start(), T0 + 10 * MIN)
    s = resumeSession(s, T0 + 60 * MIN)
    expect(viewSession(s, T0 + 60 * MIN).phaseRemainingMs).toBe(15 * MIN)
    const after = resolveSession(s, T0 + 75 * MIN)
    expect(after.phase).toBe('break')
    expect(focusElapsedMs(after, T0 + 75 * MIN)).toBe(25 * MIN)
  })

  it('pular a pausa reabre o foco', () => {
    let s = resolveSession(start(), T0 + 26 * MIN)
    s = skipBreak(s, T0 + 26 * MIN)
    expect(s.phase).toBe('focus')
    expect(s.status).toBe('running')
    expect(focusElapsedMs(s, T0 + 31 * MIN)).toBe(30 * MIN)
  })

  it('pausar e retomar durante a pausa não conta como leitura', () => {
    let s = resolveSession(start(), T0 + 26 * MIN)
    s = pauseSession(s, T0 + 27 * MIN)
    s = resumeSession(s, T0 + 50 * MIN)
    expect(s.phase).toBe('break')
    expect(focusElapsedMs(s, T0 + 52 * MIN)).toBe(25 * MIN)
    expect(viewSession(s, T0 + 52 * MIN).phaseRemainingMs).toBe(1 * MIN)
  })
})

describe('totalFocusMs', () => {
  it('soma apenas sessões finalizadas', () => {
    const fin = finishSession(createSession({ ...base, mode: 'free', now: T0 }), T0 + 10 * MIN)
    const running = createSession({ ...base, id: 's2', mode: 'free', now: T0 })
    expect(totalFocusMs([fin, running])).toBe(10 * MIN)
  })
})
