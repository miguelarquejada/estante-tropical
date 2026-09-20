import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

interface Props {
  open: boolean
  title: string
  message: string
  confirmLabel: string
  cancelLabel?: string
  destructive?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({ open, title, message, confirmLabel, cancelLabel = 'Cancelar', destructive, onConfirm, onCancel }: Props) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onCancel()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onCancel])

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-6">
          <motion.div className="absolute inset-0 bg-[#0c1410]/60" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onCancel} />
          <motion.div
            role="alertdialog"
            aria-modal="true"
            aria-label={title}
            className="relative w-full max-w-sm rounded-3xl bg-surface p-6 text-ink shadow-card"
            initial={{ opacity: 0, scale: 0.94, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96 }}
          >
            <h2 className="font-display text-2xl font-semibold">{title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-2">{message}</p>
            <div className="mt-6 flex gap-3">
              <button onClick={onCancel} className="h-12 flex-1 rounded-2xl bg-surface-2 font-semibold">
                {cancelLabel}
              </button>
              <button
                onClick={onConfirm}
                className={`h-12 flex-1 rounded-2xl font-semibold ${destructive ? 'bg-[#b4432d] text-white' : 'btn-primary'}`}
              >
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
