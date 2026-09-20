export async function requestNotifyPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!('Notification' in window)) return 'unsupported'
  if (Notification.permission !== 'default') return Notification.permission
  try {
    return await Notification.requestPermission()
  } catch {
    return Notification.permission
  }
}

/** Aviso de fim de fase do Pomodoro. Só dispara enquanto o app está vivo; com o app fechado exigiria Web Push. */
export async function notifyPhase(title: string, body: string) {
  navigator.vibrate?.([200, 100, 200])
  if (!('Notification' in window) || Notification.permission !== 'granted') return
  try {
    const reg = await navigator.serviceWorker?.ready
    if (reg) await reg.showNotification(title, { body, icon: '/pwa-192x192.png', tag: 'pomodoro' })
    else new Notification(title, { body })
  } catch {
    /* sem suporte a notificações neste contexto */
  }
}
