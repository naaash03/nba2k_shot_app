// Build timing capture (F7.2) — three methods, one destination:
// timing.idealReleaseMs (or a per-move override) + calibration metadata.
//   A — direct entry (10 seconds, power users)
//   B — video worksheet: ms = (releaseFrame − startFrame) × 1000 / fps
//   C — feel matching: binary-search convergence ±64→±32→±16→±8, then a
//       10-rep validation set and a confidence label.

import { useMemo, useRef, useState } from 'react'
import { MOVE_PROFILES } from '../../engine/constants'
import { resolveBuild } from '../../engine/resolve'
import type { MoveType, PlayerBuild, ShotVerdict } from '../../engine/types'
import { Button, Chip, Field, Segmented, TextInput } from '../../components/ui'
import { useBuilds } from '../../store/builds'
import { useDevice } from '../../store/device'
import { useSettings } from '../../store/settings'
import { Meter } from '../practice/Meter'
import { useShotMachine } from '../practice/useShotMachine'
import { VerdictOverlay } from '../practice/VerdictOverlay'

type Method = 'menu' | 'direct' | 'video' | 'feel'

const MOVE_LABELS: Partial<Record<MoveType, string>> = {
  CatchShoot: 'Base jumper (Catch & Shoot)',
  MovingPullup: 'Moving pull-up',
  Stepback: 'Stepback',
  Fadeaway: 'Fadeaway',
  PostFade: 'Post fade',
  FreeThrow: 'Free throw',
}

export function TimingCalibration({ buildId, onDone }: { buildId: string; onDone: () => void }) {
  const builds = useBuilds()
  const build = builds.builds.find((b) => b.id === buildId)
  const [method, setMethod] = useState<Method>('menu')
  const [moveType, setMoveType] = useState<MoveType>('CatchShoot')

  if (!build) return null

  const save = (ms: number, m: 'direct' | 'video' | 'feel', confidence: string) => {
    builds.updateBuild(buildId, (b) => {
      const timing = { ...b.timing }
      if (moveType === 'CatchShoot') {
        timing.idealReleaseMs = ms
        timing.calibratedAtSpeedPct = b.jumpshot.releaseSpeedPct
        timing.calibratedAtCue = b.jumpshot.visualCue
        timing.calibration = {
          method: m,
          date: new Date().toISOString(),
          confidenceLabel: confidence,
        }
      } else {
        timing.perMoveOverrides = { ...timing.perMoveOverrides, [moveType]: ms }
      }
      return { ...b, timing }
    })
    onDone()
  }

  const currentMs =
    moveType === 'CatchShoot'
      ? build.timing.idealReleaseMs
      : (build.timing.perMoveOverrides[moveType] ??
        build.timing.idealReleaseMs * MOVE_PROFILES[moveType].timingScale)

  if (method === 'menu') {
    return (
      <div className="space-y-5 px-5 py-6">
        <h2 className="font-display text-xl font-black uppercase tracking-wide">
          Calibrate timing
        </h2>
        <Field label="Which shot?">
          <Segmented
            options={Object.keys(MOVE_LABELS) as MoveType[]}
            value={moveType}
            onChange={setMoveType}
            labels={(m) => MOVE_LABELS[m] ?? m}
          />
        </Field>
        <p className="text-xs text-chalk-dim">
          Current: {currentMs.toFixed(0)}ms. All three methods end at the same place — a release
          time in milliseconds. Your greens in 2K are the ground truth.
        </p>
        <MethodCard
          title="C — Feel matching (recommended)"
          body="No homework. Shoot 5 reps, tell us if it felt faster or slower than your real jumper. Converges in ~5 rounds."
          onClick={() => setMethod('feel')}
        />
        <MethodCard
          title="A — Direct entry"
          body="You already know your release time (community data or your own measurement). Type it in."
          onClick={() => setMethod('direct')}
        />
        <MethodCard
          title="B — Video worksheet"
          body="Most accurate: film your MyPLAYER (slo-mo or capture), count frames from gather to green flash."
          onClick={() => setMethod('video')}
        />
        <Button variant="ghost" onClick={onDone}>
          Back
        </Button>
      </div>
    )
  }

  if (method === 'direct')
    return (
      <DirectEntry
        initial={currentMs}
        onSave={(ms) => save(ms, 'direct', 'user-entered')}
        onBack={() => setMethod('menu')}
      />
    )
  if (method === 'video')
    return (
      <VideoWorksheet
        onSave={(ms) => save(ms, 'video', 'video-measured')}
        onBack={() => setMethod('menu')}
      />
    )
  return (
    <FeelMatching
      build={build}
      moveType={moveType}
      startMs={currentMs}
      onSave={(ms, confidence) => save(ms, 'feel', confidence)}
      onBack={() => setMethod('menu')}
    />
  )
}

function MethodCard({
  title,
  body,
  onClick,
}: {
  title: string
  body: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="block w-full rounded-xl border border-court-line p-4 text-left transition-colors active:bg-court-900"
    >
      <p className="font-display text-sm font-bold uppercase tracking-wide text-chalk">{title}</p>
      <p className="mt-1 text-xs text-chalk-dim">{body}</p>
    </button>
  )
}

function DirectEntry({
  initial,
  onSave,
  onBack,
}: {
  initial: number
  onSave: (ms: number) => void
  onBack: () => void
}) {
  const [value, setValue] = useState(String(Math.round(initial)))
  const ms = Number(value)
  const valid = Number.isFinite(ms) && ms >= 200 && ms <= 1500
  return (
    <div className="space-y-5 px-5 py-6">
      <h2 className="font-display text-xl font-black uppercase tracking-wide">Direct entry</h2>
      <Field label="Ideal release time (ms after shot start)">
        <TextInput
          type="number"
          inputMode="numeric"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
      </Field>
      <p className="text-xs text-chalk-dim">
        Typical full releases live in the 400–900ms range. Enter the number for the settings you
        actually play on (release speed, cue).
      </p>
      <div className="flex gap-3">
        <Button variant="ghost" onClick={onBack} className="flex-1">
          Back
        </Button>
        <Button onClick={() => onSave(ms)} disabled={!valid} className="flex-1">
          Save
        </Button>
      </div>
    </div>
  )
}

function VideoWorksheet({ onSave, onBack }: { onSave: (ms: number) => void; onBack: () => void }) {
  const [fps, setFps] = useState('240')
  const [startFrame, setStartFrame] = useState('')
  const [releaseFrame, setReleaseFrame] = useState('')
  const f = Number(fps)
  const s = Number(startFrame)
  const r = Number(releaseFrame)
  const valid = f > 0 && Number.isFinite(s) && Number.isFinite(r) && r > s
  const ms = valid ? ((r - s) * 1000) / f : 0
  return (
    <div className="space-y-5 px-5 py-6">
      <h2 className="font-display text-xl font-black uppercase tracking-wide">Video worksheet</h2>
      <ol className="list-decimal space-y-2 pl-5 text-xs text-chalk-dim">
        <li>
          Record your MyPLAYER shooting in practice freestyle — console capture, or film the screen
          with your phone's slo-mo (120/240fps).
        </li>
        <li>
          Scrub to the <b className="text-chalk">first frame of the gather</b> (shot button
          pressed). Note the frame number.
        </li>
        <li>
          Scrub to the <b className="text-chalk">frame of the green release flash</b>. Note it.
        </li>
      </ol>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Video FPS">
          <TextInput
            type="number"
            inputMode="numeric"
            value={fps}
            onChange={(e) => setFps(e.target.value)}
          />
        </Field>
        <Field label="Start frame">
          <TextInput
            type="number"
            inputMode="numeric"
            value={startFrame}
            onChange={(e) => setStartFrame(e.target.value)}
          />
        </Field>
        <Field label="Release frame">
          <TextInput
            type="number"
            inputMode="numeric"
            value={releaseFrame}
            onChange={(e) => setReleaseFrame(e.target.value)}
          />
        </Field>
      </div>
      {valid && (
        <p className="text-center font-display text-3xl font-black tabular-nums text-green-signal">
          = {ms.toFixed(0)}ms
        </p>
      )}
      <div className="flex gap-3">
        <Button variant="ghost" onClick={onBack} className="flex-1">
          Back
        </Button>
        <Button onClick={() => onSave(Math.round(ms))} disabled={!valid} className="flex-1">
          Save
        </Button>
      </div>
    </div>
  )
}

// ── Method C: feel matching ────────────────────────────────────────────────

const STEPS = [64, 32, 16, 8]
const REPS_PER_ROUND = 5
const VALIDATION_REPS = 10

type FeelStage = 'shoot' | 'ask' | 'validate' | 'result'

function FeelMatching({
  build,
  moveType,
  startMs,
  onSave,
  onBack,
}: {
  build: PlayerBuild
  moveType: MoveType
  startMs: number
  onSave: (ms: number, confidence: string) => void
  onBack: () => void
}) {
  const deviceProfile = useDevice((s) => s.profile)
  const meterStyle = useSettings((s) => s.meterStyle)
  const [candidate, setCandidate] = useState(Math.round(startMs))
  const [round, setRound] = useState(0)
  const [stage, setStage] = useState<FeelStage>('shoot')
  const [repCount, setRepCount] = useState(0)
  const validationDeltas = useRef<number[]>([])

  // Candidate timing under the real build's window math, open C&S context.
  const resolved = useMemo(() => {
    const patched: PlayerBuild = {
      ...build,
      timing: {
        ...build.timing,
        idealReleaseMs: candidate,
        userTrimMs: 0,
        perMoveOverrides: {},
        calibratedAtSpeedPct: build.jumpshot.releaseSpeedPct,
        calibratedAtCue: build.jumpshot.visualCue,
      },
    }
    return resolveBuild(patched, {
      moveType: 'CatchShoot',
      zoneId: null,
      contest: 'Open',
      fatiguePct: 1,
      meterOn: true,
      greenStreak: 0,
    })
  }, [build, candidate])

  const targetReps = stage === 'validate' ? VALIDATION_REPS : REPS_PER_ROUND

  const onRep = (verdict: ShotVerdict) => {
    if (stage === 'validate') validationDeltas.current.push(verdict.deltaMs)
    setRepCount((n) => {
      const next = n + 1
      if (next >= targetReps) {
        setStage(stage === 'validate' ? 'result' : 'ask')
      }
      return next
    })
  }

  const machine = useShotMachine(resolved, 'Open', deviceProfile?.deviceOffsetMs ?? 0, (r) =>
    onRep(r.verdict),
  )

  const answer = (feel: 'faster' | 'slower' | 'same') => {
    if (feel === 'same' || round >= STEPS.length) {
      validationDeltas.current = []
      setRepCount(0)
      setStage('validate')
      return
    }
    // App's set point arrived sooner than the real jumper → real ideal is later.
    setCandidate((c) => c + (feel === 'faster' ? STEPS[round] : -STEPS[round]))
    setRound((r) => r + 1)
    setRepCount(0)
    setStage('shoot')
  }

  const confidence = () => {
    const deltas = validationDeltas.current
    const meanAbs = deltas.reduce((a, d) => a + Math.abs(d), 0) / Math.max(deltas.length, 1)
    if (meanAbs <= 22) return { label: 'high confidence', meanAbs }
    if (meanAbs <= 45) return { label: 'medium confidence', meanAbs }
    return { label: 'low confidence — consider Method B', meanAbs }
  }

  if (stage === 'ask') {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-5 px-6 text-center">
        <h2 className="font-display text-xl font-black uppercase tracking-wide">
          Round {round + 1} · {candidate}ms
        </h2>
        <p className="max-w-xs text-sm text-chalk-dim">
          Compared to your real jumper in 2K26 — did that set point arrive…
        </p>
        <Button onClick={() => answer('faster')} className="w-64">
          Faster than my jumper
        </Button>
        <Button onClick={() => answer('same')} className="w-64">
          Felt the same
        </Button>
        <Button onClick={() => answer('slower')} className="w-64">
          Slower than my jumper
        </Button>
      </div>
    )
  }

  if (stage === 'result') {
    const c = confidence()
    return (
      <div className="flex h-full flex-col items-center justify-center gap-5 px-6 text-center">
        <h2 className="font-display text-xl font-black uppercase tracking-wide">Locked in</h2>
        <div className="font-display text-6xl font-black tabular-nums text-green-signal">
          {candidate}ms
        </div>
        <p className="max-w-xs text-sm text-chalk-dim">
          Validation: mean error {c.meanAbs.toFixed(0)}ms → {c.label}. You can trim ±2ms anytime
          from practice quick settings.
        </p>
        <Button onClick={() => onSave(candidate, c.label)}>Save timing</Button>
        <Button variant="ghost" onClick={onBack}>
          Start over
        </Button>
      </div>
    )
  }

  // shoot / validate stages: mini practice range
  return (
    <div className="flex h-full flex-col px-4 pt-4">
      <p className="text-center text-xs font-bold uppercase tracking-widest text-heat">
        {stage === 'validate'
          ? `Validation · rep ${Math.min(repCount + 1, VALIDATION_REPS)}/${VALIDATION_REPS}`
          : `Round ${round + 1} · candidate ${candidate}ms · rep ${Math.min(repCount + 1, REPS_PER_ROUND)}/${REPS_PER_ROUND}`}
      </p>
      <p className="mt-1 text-center text-xs text-chalk-dim">
        {MOVE_LABELS[moveType]} — shoot naturally, like it's your jumper.
      </p>
      <div className="mx-auto my-3 w-full max-w-xs flex-1" style={{ minHeight: 160 }}>
        <Meter
          timing={resolved}
          meterVisible
          style={meterStyle}
          phaseRef={machine.phaseRef}
          shotStartRef={machine.shotStartRef}
          releaseElapsedRef={machine.releaseElapsedRef}
          phase={machine.phase}
        />
      </div>
      <VerdictOverlay verdict={machine.verdict} />
      <div className="pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        <button
          type="button"
          {...machine.handlers}
          onContextMenu={(e) => e.preventDefault()}
          className="h-24 w-full select-none rounded-2xl border-2 border-court-line bg-court-800 font-display text-3xl font-black uppercase tracking-[0.3em] text-chalk active:border-green-signal/60"
          style={{ touchAction: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none' }}
        >
          Shoot
        </button>
        <div className="mt-2 text-center">
          <Chip onClick={onBack}>Cancel</Chip>
        </div>
      </div>
    </div>
  )
}
