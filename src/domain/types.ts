export type Shelf = 'want' | 'reading' | 'read'
export type SessionMode = 'free' | 'pomodoro'
export type SessionStatus = 'running' | 'paused' | 'finished' | 'discarded'
export type Phase = 'focus' | 'break'

/** Todos os timestamps são epoch em milissegundos. */
export interface Segment {
  start: number
  end: number | null
}

export interface Book {
  id: string
  user_id: string | null
  title: string
  author: string
  cover_url: string | null
  isbn: string | null
  google_books_id: string | null
  total_pages: number | null
  status: Shelf
  current_page: number | null
  progress_pct: number | null
  started_at: number | null
  finished_at: number | null
  rating: number | null
  created_at: number
  updated_at: number
  deleted_at: number | null
}

export interface ReadingSession {
  id: string
  user_id: string | null
  book_id: string
  mode: SessionMode
  status: SessionStatus
  /** Apenas tempo de foco. Pausas do Pomodoro nunca geram segmentos. */
  segments: Segment[]
  focus_ms: number
  break_ms: number
  phase: Phase
  /** Início da execução corrente da fase (último iniciar/retomar). */
  phase_started_at: number
  /** Tempo da fase já consumido antes de phase_started_at (por pausas). */
  phase_elapsed_ms: number
  ended_at: number | null
  duration_ms: number
  page_at_end: number | null
  created_at: number
  updated_at: number
  deleted_at: number | null
}
