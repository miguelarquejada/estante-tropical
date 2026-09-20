import { useState, type FormEvent } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '../hooks/useAuth'
import { LeafIcon } from '../components/icons'

export default function Login() {
  const { signIn, signUp, signInWithGoogle } = useAuth()
  const [mode, setMode] = useState<'in' | 'up'>('in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setMessage(null)
    const err = mode === 'in' ? await signIn(email.trim(), password) : await signUp(email.trim(), password)
    setBusy(false)
    if (err) setMessage(err)
  }

  return (
    <main className="organic-header safe-top flex min-h-dvh flex-col justify-center px-6 py-10">
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="mx-auto w-full max-w-sm">
        <div className="flex items-center gap-2 text-leaf">
          <LeafIcon width={28} height={28} />
          <span className="text-sm font-semibold uppercase tracking-widest">Estante Tropical</span>
        </div>
        <h1 className="mt-4 font-display text-4xl font-semibold leading-tight">
          Cada página, <em className="text-terra">um tempo bem vivido.</em>
        </h1>
        <p className="mt-3 text-ink-2">Organize suas leituras e descubra quanto tempo você investe em cada livro.</p>

        <form onSubmit={submit} className="mt-8 space-y-3">
          <label className="block">
            <span className="sr-only">E-mail</span>
            <input
              type="email"
              required
              autoComplete="email"
              placeholder="E-mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-14 w-full rounded-2xl bg-surface px-4 shadow-card outline-none focus:ring-2 focus:ring-leaf"
            />
          </label>
          <label className="block">
            <span className="sr-only">Senha</span>
            <input
              type="password"
              required
              minLength={6}
              autoComplete={mode === 'in' ? 'current-password' : 'new-password'}
              placeholder="Senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-14 w-full rounded-2xl bg-surface px-4 shadow-card outline-none focus:ring-2 focus:ring-leaf"
            />
          </label>
          {message && (
            <p role="alert" className="rounded-xl bg-terra-soft px-3 py-2 text-sm text-terra">
              {message}
            </p>
          )}
          <button disabled={busy} className="btn-primary h-14 w-full rounded-2xl text-base font-semibold shadow-card disabled:opacity-60">
            {busy ? 'Aguarde…' : mode === 'in' ? 'Entrar' : 'Criar conta'}
          </button>
        </form>

        <div className="my-5 flex items-center gap-3 text-xs text-ink-2">
          <span className="h-px flex-1 bg-line" /> ou <span className="h-px flex-1 bg-line" />
        </div>

        <button
          onClick={async () => {
            const err = await signInWithGoogle()
            if (err) setMessage(err)
          }}
          className="h-14 w-full rounded-2xl bg-surface font-semibold shadow-card"
        >
          Continuar com Google
        </button>

        <button onClick={() => setMode(mode === 'in' ? 'up' : 'in')} className="mt-6 w-full text-center text-sm text-ink-2">
          {mode === 'in' ? 'Ainda não tem conta? ' : 'Já tem conta? '}
          <span className="font-semibold text-terra">{mode === 'in' ? 'Cadastre-se' : 'Entrar'}</span>
        </button>
      </motion.div>
    </main>
  )
}
