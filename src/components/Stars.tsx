import { StarIcon } from './icons'

interface Props {
  value: number | null
  onChange?: (v: number) => void
  size?: number
}

export function Stars({ value, onChange, size = 24 }: Props) {
  return (
    <div className="inline-flex gap-0.5" role={onChange ? 'radiogroup' : 'img'} aria-label={value ? `Avaliação: ${value} de 5 estrelas` : 'Sem avaliação'}>
      {[1, 2, 3, 4, 5].map((n) => {
        const on = (value ?? 0) >= n
        const icon = <StarIcon width={size} height={size} filled={on} />
        return onChange ? (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n} ${n === 1 ? 'estrela' : 'estrelas'}`}
            onClick={() => onChange(n)}
            className={`rounded-md p-0.5 transition-transform active:scale-90 ${on ? 'text-terra' : 'text-ink-2/50'}`}
          >
            {icon}
          </button>
        ) : (
          <span key={n} className={on ? 'text-terra' : 'text-ink-2/40'}>
            {icon}
          </span>
        )
      })}
    </div>
  )
}
