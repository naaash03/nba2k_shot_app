// Clock helpers. Judgments use input event timestamps (invariant #1);
// event.timeStamp shares the performance.now() clock in modern browsers.
// Feature-check at startup and fall back if a UA misbehaves (§8.7).

export const now = (): number => performance.now()

let eventTimestampsTrusted = true

/** Startup self-check: a synthetic event's timeStamp should sit on the performance clock. */
export function checkEventClock(): void {
  const e = new Event('check')
  // If timeStamp looks like epoch ms (huge) instead of time-origin-relative, don't trust it.
  eventTimestampsTrusted = Math.abs(e.timeStamp - performance.now()) < 60_000
}

/** Timestamp for an input event, honoring the startup clock check. */
export function eventTime(e: { timeStamp: number }): number {
  return eventTimestampsTrusted ? e.timeStamp : performance.now()
}

/** Measure rAF cadence for ~1s; resolves to approximate fps (§8.7 Low Power check). */
export function measureFrameRate(): Promise<number> {
  return new Promise((resolve) => {
    let frames = 0
    const start = performance.now()
    const tick = () => {
      frames++
      if (performance.now() - start >= 1000) resolve(frames)
      else requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  })
}
