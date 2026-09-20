import type { ReactNode } from 'react'
import { motion } from 'framer-motion'

export type EmptyKind = 'reading' | 'want' | 'read' | 'search' | 'sessions'

function Art({ kind }: { kind: EmptyKind }) {
  return (
    <svg viewBox="0 0 160 120" className="h-32 w-40" aria-hidden>
      <ellipse cx="80" cy="108" rx="62" ry="6" fill="var(--line)" opacity=".6" />
      <rect x="22" y="100" width="116" height="6" rx="3" fill="var(--terra)" opacity=".85" />
      <rect x="34" y="52" width="16" height="48" rx="3" fill="var(--leaf)" opacity=".85" />
      <rect x="54" y="40" width="18" height="60" rx="3" fill="var(--terra)" />
      <rect x="76" y="60" width="14" height="40" rx="3" fill="var(--leaf)" opacity=".55" />
      <g transform={kind === 'search' ? 'rotate(-12 110 70)' : ''}>
        <rect x="94" y="46" width="16" height="54" rx="3" fill="var(--terra)" opacity=".55" />
      </g>
      <path d="M116 100c0-22 10-38 28-44-2 21-11 37-28 44Z" fill="var(--leaf)" />
      <path d="M116 100c2-14 8-24 18-32" stroke="var(--bg)" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <path d="M20 88c0-14 7-24 20-28-1 14-7 24-20 28Z" fill="var(--leaf)" opacity=".7" />
    </svg>
  )
}

const copy: Record<EmptyKind, { title: string; text: string }> = {
  reading: { title: 'Nenhuma leitura em andamento', text: 'Escolha um livro e comece uma sessão. O tempo dedicado a cada página vai ficando registrado aqui.' },
  want: { title: 'Sua lista de desejos está vazia', text: 'Guarde aqui os livros que você quer ler quando o próximo capítulo da vida permitir.' },
  read: { title: 'Ainda sem livros concluídos', text: 'Quando você terminar uma leitura, ela ganha data, tempo total e as suas estrelas.' },
  search: { title: 'Nada encontrado', text: 'Tente outro título, o nome do autor ou o ISBN. Se preferir, cadastre o livro manualmente.' },
  sessions: { title: 'Sem sessões ainda', text: 'Cada sessão de leitura finalizada aparece aqui com o tempo e a página em que você parou.' },
}

export function EmptyState({ kind, action }: { kind: EmptyKind; action?: ReactNode }) {
  const { title, text } = copy[kind]
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center px-8 py-12 text-center">
      <Art kind={kind} />
      <h3 className="mt-4 font-display text-2xl font-semibold">{title}</h3>
      <p className="mt-2 max-w-xs text-sm leading-relaxed text-ink-2">{text}</p>
      {action && <div className="mt-5">{action}</div>}
    </motion.div>
  )
}
