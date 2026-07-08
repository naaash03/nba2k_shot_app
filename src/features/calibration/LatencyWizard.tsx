// Device latency calibration (F7.1): 100 BPM visual metronome for 24 beats,
// tap in rhythm, first 4 taps discarded, offset = median(tapTs − beatTs).
// Judged releases subtract this offset so touch lag doesn't poison timing.

import { useEffect, useRef, useState } from 'react'
import type { DeviceProfile } from '../../engine/types'
import { eventTime } from '../../lib/time'
import { Button } from '../../components/ui'
import { useDevice } from '../../store/device'

const BPM = 100
const BEAT_MS = 60_000 / BPM // 600ms
const TOTAL_BEATS = 24
const DISCARD = 4

type Stage = 'intro' | 'running' | 'done'

export function LatencyWizard({ onDone }: { onDone: () => void }) {
  const device = useDevice()
  const [stage, setStage] = useState<Stage>('intro')
  const [tapCount, setTapCount] = useState(0)
  const [result, setResult] = useState<{ offset: number; jitter: number } | null>(null)

  const startRef = useRef(0)
  const tapsRef = useRef<number[]>([])
  const ringRef = useRef<HTMLDivElement>(null)
  const rafRef = useRef(0)

  useEffect(() => () => cancelAnimationFrame(rafRef.current), [])

  const start = () => {
    tapsRef.current = []
    setTapCount(0)
    startRef.current = performance.now() + 1000 // 1s lead-in
    setStage('running')

    const animate = () => {
      const el = ringRef.current
      if (el) {
        const t = performance.now() - startRef.current
        // Pulse: scale peaks exactly on each beat (delta-time, no frame assumptions).
        const phase = ((t % BEAT_MS) + BEAT_MS) % BEAT_MS
        const nearness = 1 - Math.min(phase, BEAT_MS - phase) / (BEAT_MS / 2)
        const scale = 0.72 + 0.28 * nearness * nearness
        el.style.transform = `scale(${scale})`
        el.style.opacity = String(0.35 + 0.65 * nearness * nearness)
      }
      rafRef.current = requestAnimationFrame(animate)
    }
    rafRef.current = requestAnimationFrame(animate)
  }

  const finish = () => {
    cancelAnimationFrame(rafRef.current)
    const kept = tapsRef.current.slice(DISCARD)
    const offsets = kept
      .map((tapTs) => {
        const t = tapTs - startRef.current
        const beatIndex = Math.round(t / BEAT_MS)
        return t - beatIndex * BEAT_MS
      })
      .sort((a, b) => a - b)
    const median = offsets[Math.floor(offsets.length / 2)] ?? 0
    const q1 = offsets[Math.floor(offsets.length * 0.25)] ?? 0
    const q3 = offsets[Math.floor(offsets.length * 0.75)] ?? 0
    const jitter = (q3 - q1) / 2
    setResult({ offset: median, jitter })
    setStage('done')
  }

  const onTap = (e: React.PointerEvent) => {
    if (stage !== 'running') return
    const ts = eventTime(e)
    if (ts < startRef.current - BEAT_MS / 2) return // during lead-in
    tapsRef.current.push(ts)
    const n = tapsRef.current.length
    setTapCount(n)
    if (n >= TOTAL_BEATS) finish()
  }

  const save = () => {
    if (!result) return
    const profile: DeviceProfile = {
      deviceOffsetMs: Math.round(result.offset),
      jitterMs: Math.round(result.jitter),
      calibratedAt: new Date().toISOString(),
      uaHint: navigator.userAgent.slice(0, 80),
    }
    device.setProfile(profile)
    onDone()
  }

  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 px-6 text-center">
      {stage === 'intro' && (
        <>
          <h2 className="font-display text-2xl font-black uppercase tracking-wide">
            Device latency check
          </h2>
          <p className="max-w-xs text-sm text-chalk-dim">
            Every phone has its own touch lag. Tap the pulse{' '}
            <b className="text-chalk">on the beat</b>, 24 times (~15 seconds). We measure your
            device's offset so judgments are true.
          </p>
          <Button onClick={start}>Start the metronome</Button>
          <Button variant="ghost" onClick={onDone}>
            Skip for now
          </Button>
        </>
      )}

      {stage === 'running' && (
        <div
          className="flex h-full w-full flex-col items-center justify-center gap-10"
          onPointerDown={onTap}
          style={{ touchAction: 'none' }}
        >
          <div
            ref={ringRef}
            className="h-44 w-44 rounded-full border-4 border-green-signal"
            aria-hidden
          />
          <p className="text-sm uppercase tracking-widest text-chalk-dim">
            Tap the beat · {tapCount}/{TOTAL_BEATS}
          </p>
        </div>
      )}

      {stage === 'done' && result && (
        <>
          <h2 className="font-display text-2xl font-black uppercase tracking-wide">
            Your device offset
          </h2>
          <div className="font-display text-6xl font-black tabular-nums text-green-signal">
            {Math.round(result.offset)}ms
          </div>
          <p className="max-w-xs text-sm text-chalk-dim">
            Jitter ±{Math.round(result.jitter)}ms.{' '}
            {result.jitter > 25
              ? 'That jitter is high — consider re-running somewhere you can focus.'
              : 'Nice and steady.'}
          </p>
          <Button onClick={save}>Save & apply to judgments</Button>
          <Button variant="ghost" onClick={start}>
            Re-run
          </Button>
        </>
      )}
    </div>
  )
}
