// Vibration is Android-only on the web — iOS Safari has no vibration API (F8.2).
export const hapticsSupported = typeof navigator !== 'undefined' && 'vibrate' in navigator

export function buzz(pattern: number | number[]): void {
  if (hapticsSupported) navigator.vibrate(pattern)
}
