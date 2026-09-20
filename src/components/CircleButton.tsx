import type { ButtonHTMLAttributes, ReactNode } from 'react'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string
  size?: 'md' | 'lg'
  children: ReactNode
  showLabel?: boolean
}

/** Botão circular minimalista da sessão imersiva (vidro fosco sobre a capa desfocada). */
export function CircleButton({ label, size = 'md', showLabel = true, children, className = '', ...rest }: Props) {
  const dim = size === 'lg' ? 'h-20 w-20' : 'h-14 w-14'
  return (
    <div className="flex flex-col items-center gap-2">
      <button
        aria-label={label}
        {...rest}
        className={`${dim} flex items-center justify-center rounded-full border border-white/25 bg-white/15 text-white backdrop-blur-md transition active:scale-95 hover:bg-white/25 ${className}`}
      >
        {children}
      </button>
      {showLabel && <span className="text-xs font-medium text-white/80">{label}</span>}
    </div>
  )
}
