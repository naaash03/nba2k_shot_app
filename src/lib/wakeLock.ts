// Screen Wake Lock during practice sessions (F8.4). Feature-detected;
// iOS 16.4+ and Chromium support navigator.wakeLock.

import { useEffect } from 'react'

export function useWakeLock(active: boolean): void {
  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return
    let lock: WakeLockSentinel | null = null
    let released = false

    const request = async () => {
      try {
        lock = await navigator.wakeLock.request('screen')
      } catch {
        // Denied (e.g. low battery) — non-fatal.
      }
    }

    const onVisible = () => {
      if (!document.hidden && !released) void request()
    }

    void request()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      released = true
      document.removeEventListener('visibilitychange', onVisible)
      void lock?.release().catch(() => {})
    }
  }, [active])
}
