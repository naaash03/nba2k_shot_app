// Feedback & stats (F6): session summary, lifetime dashboard, Δ histogram
// (watch your bell curve tighten), green% trend, bias → one-tap trim
// suggestion, per-move splits, court heat map. Charts are hand-rolled SVG —
// no chart library on a timing-critical bundle.

import { useMemo, useState } from 'react'
import { MOVE_PROFILES } from '../../engine/constants'
import type { MoveType } from '../../engine/types'
import { Button, Stat } from '../../components/ui'
import { useBuilds } from '../../store/builds'
import { recentBiasMs, useReps, type AggBucket } from '../../store/reps'
import { CourtSvg } from '../court/CourtScreen'

function pct(n: number, d: number): string {
  return d > 0 ? `${Math.round((n / d) * 100)}%` : '—'
}

function sigma(b: AggBucket): number {
  if (b.attempts < 2) return 0
  const mean = b.sumDelta / b.attempts
  return Math.sqrt(Math.max(b.sumDeltaSq / b.attempts - mean * mean, 0))
}

export function StatsScreen() {
  const reps = useReps()
  const builds = useBuilds()
  const [trimApplied, setTrimApplied] = useState(false)

  const lifetime = reps.lifetime
  const session = reps.session
  const bias = useMemo(() => recentBiasMs(50), [reps.reps.length]) // eslint-disable-line react-hooks/exhaustive-deps

  const suggestTrim = Math.abs(bias.bias) >= 8 && bias.count >= 15
  const trimAmount = -Math.round(bias.bias / 2) * 2 // e.g. −12ms early → +12? No: early bias → release later? see below

  const applyTrim = () => {
    // Bias −12ms means releases average 12ms early → shift the target 12ms
    // earlier (trim −12) so "feel" and target line up (F6.4). Reversible in
    // quick settings.
    const id = builds.activeBuildId
    builds.updateBuild(id, (b) => ({
      ...b,
      timing: { ...b.timing, userTrimMs: b.timing.userTrimMs + Math.round(bias.bias) },
    }))
    setTrimApplied(true)
  }

  if (lifetime.attempts === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-8 text-center">
        <p className="font-display text-xl font-bold uppercase tracking-wide">No reps yet</p>
        <p className="text-sm text-chalk-dim">
          Your bell curve appears after 10 reps. Go get shots up.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6 px-4 py-4">
      <h2 className="font-display text-xl font-black uppercase tracking-wide">Stats</h2>

      {session && session.attempts > 0 && (
        <section className="rounded-xl border border-green-signal/40 p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-green-signal">
            This session
          </p>
          <div className="grid grid-cols-4 gap-2">
            <Stat label="Reps" value={String(session.attempts)} />
            <Stat label="Green" value={pct(session.greens, session.attempts)} accent />
            <Stat
              label="Mean |Δ|"
              value={`${(session.sumAbsDelta / session.attempts).toFixed(0)}ms`}
            />
            <Stat label="Streak" value={String(session.bestStreak)} />
          </div>
        </section>
      )}

      <section>
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-chalk-dim">
          Lifetime · {lifetime.attempts} reps
        </p>
        <div className="grid grid-cols-4 gap-2">
          <Stat label="Green" value={pct(lifetime.greens, lifetime.attempts)} accent />
          <Stat label="Makes" value={pct(lifetime.makes, lifetime.attempts)} />
          <Stat label="σ consist." value={`${sigma(lifetime).toFixed(0)}ms`} />
          <Stat label="Best streak" value={String(reps.bestStreakEver)} />
        </div>
      </section>

      {/* Bias + one-tap suggestion (F6.4) */}
      <section className="rounded-xl border border-court-line p-4">
        <div className="flex items-baseline justify-between">
          <span className="text-xs font-semibold uppercase tracking-widest text-chalk-dim">
            Bias (last {bias.count})
          </span>
          <span className="font-display text-2xl font-black tabular-nums">
            {bias.bias >= 0 ? '+' : '−'}
            {Math.abs(bias.bias).toFixed(0)}ms {bias.bias >= 0 ? 'late' : 'early'}
          </span>
        </div>
        {suggestTrim && !trimApplied && (
          <div className="mt-3">
            <p className="mb-2 text-xs text-chalk-dim">
              You release {Math.abs(bias.bias).toFixed(0)}ms {bias.bias < 0 ? 'early' : 'late'} on
              average — nudge the target to match your rhythm? (Reversible in quick settings.)
            </p>
            <Button onClick={applyTrim}>
              Nudge timing {trimAmount >= 0 ? '' : ''}
              {Math.round(bias.bias)}ms
            </Button>
          </div>
        )}
        {trimApplied && (
          <p className="mt-2 text-xs text-green-signal">Trim applied to active build.</p>
        )}
      </section>

      <Histogram deltas={reps.reps.slice(-200).map((r) => r.deltaMs)} />
      <Trend sessions={reps.sessions.map((s) => (s.attempts > 0 ? s.greens / s.attempts : 0))} />
      <MoveSplits perMove={reps.perMove} />

      <section>
        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-chalk-dim">
          Shot chart · green rate
        </p>
        <CourtSvg activeZone={null} heat={reps.perZone} />
      </section>

      {session && session.attempts > 0 && (
        <Button variant="ghost" onClick={reps.closeSession} className="w-full">
          End session & archive summary
        </Button>
      )}
    </div>
  )
}

/** Δ distribution, 10ms bins across ±100ms — users should watch it tighten (F6.3). */
function Histogram({ deltas }: { deltas: number[] }) {
  if (deltas.length < 10) {
    return (
      <p className="text-xs text-chalk-dim">
        Δ histogram unlocks after 10 reps ({deltas.length}/10).
      </p>
    )
  }
  const BIN = 10
  const RANGE = 100
  const bins = new Array(Math.ceil((RANGE * 2) / BIN)).fill(0) as number[]
  for (const d of deltas) {
    const clamped = Math.max(-RANGE, Math.min(RANGE - 0.01, d))
    bins[Math.floor((clamped + RANGE) / BIN)]++
  }
  const max = Math.max(...bins, 1)
  const W = 300
  const H = 90
  const bw = W / bins.length
  return (
    <section>
      <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-chalk-dim">
        Δ distribution · last {deltas.length} reps
      </p>
      <svg viewBox={`0 0 ${W} ${H + 16}`} className="w-full">
        {bins.map((count, i) => {
          const h = (count / max) * H
          const mid = Math.abs(i * BIN - RANGE + BIN / 2) <= BIN // bins straddling zero
          return (
            <rect
              key={i}
              x={i * bw + 1}
              y={H - h}
              width={bw - 2}
              height={h}
              rx={2}
              fill={mid ? '#2eff6e' : 'rgba(232,236,233,0.35)'}
            />
          )
        })}
        <line
          x1={W / 2}
          y1={0}
          x2={W / 2}
          y2={H}
          stroke="#2eff6e"
          strokeDasharray="3 3"
          strokeWidth={1}
        />
        <text x={4} y={H + 12} fill="#9aa69d" fontSize={9}>
          −{RANGE}ms early
        </text>
        <text x={W - 4} y={H + 12} fill="#9aa69d" fontSize={9} textAnchor="end">
          +{RANGE}ms late
        </text>
      </svg>
    </section>
  )
}

function Trend({ sessions }: { sessions: number[] }) {
  if (sessions.length < 2) return null
  const recent = sessions.slice(-20)
  const W = 300
  const H = 70
  const step = W / Math.max(recent.length - 1, 1)
  const points = recent
    .map((r, i) => `${(i * step).toFixed(1)},${(H - r * H).toFixed(1)}`)
    .join(' ')
  return (
    <section>
      <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-chalk-dim">
        Green % by session
      </p>
      <svg viewBox={`0 0 ${W} ${H + 6}`} className="w-full">
        <line x1={0} y1={H} x2={W} y2={H} stroke="#2e3a31" strokeWidth={1} />
        <polyline
          points={points}
          fill="none"
          stroke="#2eff6e"
          strokeWidth={2}
          strokeLinejoin="round"
        />
        {recent.map((r, i) => (
          <circle key={i} cx={i * step} cy={H - r * H} r={2.5} fill="#2eff6e" />
        ))}
      </svg>
    </section>
  )
}

function MoveSplits({ perMove }: { perMove: Record<string, AggBucket> }) {
  const entries = (Object.keys(MOVE_PROFILES) as MoveType[])
    .map((m) => [m, perMove[m]] as const)
    .filter(([, b]) => b && b.attempts > 0)
  if (entries.length === 0) return null
  return (
    <section>
      <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-chalk-dim">
        Per-move splits
      </p>
      <div className="space-y-1.5">
        {entries.map(([move, b]) => (
          <div key={move} className="flex items-center gap-2 text-xs">
            <span className="w-24 shrink-0 text-chalk-dim">{move}</span>
            <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-court-800">
              <div
                className="h-full rounded-full bg-green-signal/70"
                style={{ width: `${(b!.greens / b!.attempts) * 100}%` }}
              />
            </div>
            <span className="w-20 shrink-0 text-right tabular-nums text-chalk">
              {pct(b!.greens, b!.attempts)} · {b!.attempts}
            </span>
          </div>
        ))}
      </div>
    </section>
  )
}
