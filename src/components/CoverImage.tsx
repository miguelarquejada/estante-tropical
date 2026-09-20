import { useState } from 'react'

interface Props {
  url: string | null
  title: string
  className?: string
}

const hues = ['from-leaf/70 to-terra/60', 'from-terra/70 to-leaf/50', 'from-leaf/60 to-leaf/30', 'from-terra/60 to-terra/30']

/** Capa 2:3; sem imagem (ou se falhar offline), mostra um placeholder orgânico com a inicial. */
export function CoverImage({ url, title, className = '' }: Props) {
  const [failed, setFailed] = useState(false)
  const showImage = url && !failed
  const hue = hues[(title.charCodeAt(0) || 0) % hues.length]

  return (
    <div className={`relative aspect-[2/3] overflow-hidden rounded-lg bg-surface-2 shadow-cover ${className}`}>
      {showImage ? (
        <img
          src={url}
          alt={`Capa de ${title}`}
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${hue} p-2`} role="img" aria-label={`Sem capa: ${title}`}>
          <span className="font-display text-4xl font-semibold text-white/90 drop-shadow-sm">{title.trim().charAt(0).toUpperCase() || '?'}</span>
        </div>
      )}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-1.5 bg-gradient-to-r from-black/15 to-transparent" />
    </div>
  )
}
