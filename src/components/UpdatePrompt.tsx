import { useRegisterSW } from 'virtual:pwa-register/react'

export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW()

  if (!needRefresh && !offlineReady) return null
  return (
    <div role="status" className="safe-bottom fixed inset-x-4 top-4 z-[70] mx-auto flex max-w-md items-center gap-3 rounded-2xl bg-surface p-3.5 pl-4 text-sm shadow-cover">
      <span className="flex-1">{needRefresh ? 'Há uma nova versão da Estante Tropical.' : 'Pronto! O app já funciona offline.'}</span>
      {needRefresh && (
        <button onClick={() => void updateServiceWorker(true)} className="btn-primary rounded-xl px-3 py-2 font-semibold">
          Atualizar
        </button>
      )}
      <button
        onClick={() => {
          setNeedRefresh(false)
          setOfflineReady(false)
        }}
        className="rounded-xl px-2 py-2 font-medium text-ink-2"
      >
        Fechar
      </button>
    </div>
  )
}
