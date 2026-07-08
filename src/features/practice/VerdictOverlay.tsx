// Per-rep verdict (F3.3): judgment tier + signed ms + make/miss. Never
// color-only (§11.5/F8.3): shapes + text carry the meaning; respects
// prefers-reduced-motion via CSS (fade instead of flash).

import type { ShotVerdict } from '../../engine/types'

const LABELS: Record<string, string> = {
  GREEN: 'GREEN',
  SLIGHTLY_EARLY: 'SLIGHTLY EARLY',
  SLIGHTLY_LATE: 'SLIGHTLY LATE',
  EARLY: 'EARLY',
  LATE: 'LATE',
  VERY_EARLY: 'WAY EARLY',
  VERY_LATE: 'WAY LATE',
}

export function verdictText(v: ShotVerdict): string {
  const signed = `${v.deltaMs >= 0 ? '+' : '−'}${Math.abs(v.deltaMs).toFixed(0)}ms`
  return v.judgment === 'GREEN' ? `GREEN ${signed}` : `${signed} ${LABELS[v.judgment]}`
}

export function VerdictOverlay({ verdict }: { verdict: ShotVerdict | null }) {
  if (!verdict) {
    return (
      <div className="flex h-16 items-center justify-center text-xs uppercase tracking-widest text-chalk-dim">
        Hold SHOOT — release at the set point
      </div>
    )
  }
  const green = verdict.judgment === 'GREEN'
  return (
    <div className="flex h-16 flex-col items-center justify-center motion-safe:animate-[verdict-pop_250ms_ease-out] motion-reduce:animate-none">
      <div
        className={`font-display text-3xl font-black tabular-nums tracking-tight ${
          green ? 'text-green-signal' : 'text-chalk'
        }`}
      >
        {green ? '◆ ' : verdict.made ? '○ ' : '✕ '}
        {verdictText(verdict)}
      </div>
      <div className="text-[11px] uppercase tracking-widest text-chalk-dim">
        {verdict.made ? 'Bucket' : 'Miss'} · window {verdict.greenWindowMs.toFixed(0)}ms
      </div>
    </div>
  )
}
