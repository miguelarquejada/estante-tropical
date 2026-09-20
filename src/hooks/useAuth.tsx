import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import { resetForUser } from '../db/schema'
import { setCurrentUser } from '../db/repo'
import { startSyncEngine } from '../db/sync'

export interface AppUser {
  id: string
  email: string | null
}

interface AuthState {
  user: AppUser | null
  loading: boolean
  /** true quando o Supabase não está configurado e o app roda só neste aparelho. */
  localOnly: boolean
  signIn: (email: string, password: string) => Promise<string | null>
  signUp: (email: string, password: string) => Promise<string | null>
  signInWithGoogle: () => Promise<string | null>
  signOut: () => Promise<void>
}

const CACHE_KEY = 'estante:user'
const LOCAL_USER: AppUser = { id: 'local', email: null }

const Ctx = createContext<AuthState | null>(null)

function readCache(): AppUser | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    return raw ? (JSON.parse(raw) as AppUser) : null
  } catch {
    return null
  }
}

function writeCache(user: AppUser | null) {
  try {
    if (user) localStorage.setItem(CACHE_KEY, JSON.stringify(user))
    else localStorage.removeItem(CACHE_KEY)
  } catch {
    /* ignore */
  }
}

const translate = (msg: string) => {
  if (/invalid login credentials/i.test(msg)) return 'E-mail ou senha incorretos.'
  if (/already registered/i.test(msg)) return 'Este e-mail já está cadastrado.'
  if (/password should be at least/i.test(msg)) return 'A senha precisa ter pelo menos 6 caracteres.'
  if (/email not confirmed/i.test(msg)) return 'Confirme seu e-mail antes de entrar.'
  if (/failed to fetch|network/i.test(msg)) return 'Sem conexão. Tente novamente quando estiver online.'
  return msg
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!supabase) {
      void resetForUser(LOCAL_USER.id).then(() => {
        setCurrentUser(LOCAL_USER.id)
        setUser(LOCAL_USER)
        setLoading(false)
      })
      return
    }
    let alive = true
    const apply = async (u: AppUser | null) => {
      if (u) {
        await resetForUser(u.id)
        setCurrentUser(u.id)
      } else {
        setCurrentUser(null)
      }
      writeCache(u)
      if (alive) {
        setUser(u)
        setLoading(false)
      }
    }
    const toUser = (s: { user: { id: string; email?: string | null } } | null): AppUser | null =>
      s ? { id: s.user.id, email: s.user.email ?? null } : null

    supabase.auth
      .getSession()
      .then(({ data }) => apply(toUser(data.session)))
      .catch(() => apply(readCache()))
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      void apply(toUser(session))
    })
    return () => {
      alive = false
      sub.subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!user || !supabase) return
    return startSyncEngine(supabase, user.id)
  }, [user])

  const value = useMemo<AuthState>(
    () => ({
      user,
      loading,
      localOnly: !isSupabaseConfigured,
      signIn: async (email, password) => {
        const { error } = await supabase!.auth.signInWithPassword({ email, password })
        return error ? translate(error.message) : null
      },
      signUp: async (email, password) => {
        const { data, error } = await supabase!.auth.signUp({ email, password })
        if (error) return translate(error.message)
        return data.session ? null : 'Enviamos um link de confirmação para o seu e-mail.'
      },
      signInWithGoogle: async () => {
        const { error } = await supabase!.auth.signInWithOAuth({
          provider: 'google',
          options: { redirectTo: window.location.origin },
        })
        return error ? translate(error.message) : null
      },
      signOut: async () => {
        await supabase?.auth.signOut()
        writeCache(null)
      },
    }),
    [user, loading],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAuth() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useAuth fora do AuthProvider')
  return ctx
}
