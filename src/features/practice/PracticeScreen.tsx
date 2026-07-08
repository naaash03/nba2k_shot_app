// The core loop (§6.2): hold SHOOT → release at set point → verdict → auto-rearm.
// Zero taps between reps. One-thumb, portrait-first.

import { useEffect, useMemo, useRef, useState } from 'react'
import { MOVE_PROFILES, ZONES } from '../../engine/constants'
import { resolveBuild } from '../../engine/resolve'
import type { MoveType, RepRecord, ShotContext } from '../../engine/types'
import { buzz } from '../../lib/haptics'
import { measureFrameRate } from '../../lib/time'
import { useWakeLock } from '../../lib/wakeLock'
import { Chip, Segmented, Sheet, Stat } from '../../components/ui'
import { useBuilds } from '../../store/builds'
import { useDevice } from '../../store/device'
import { useReps } from '../../store/reps'
import { useSettings } from '../../store/settings'
import { Meter } from './Meter'
import { useShotMachine, type RepResult } from './useShotMachine'
import { VerdictOverlay } from './VerdictOverlay'

const MOVE_LABELS: Record<MoveType, string> = {
  CatchShoot: 'Catch & Shoot',
  Standing: 'Standing',
  MovingPullup: 'Pull-Up',
  Stepback: 'Stepback',
  Fadeaway: 'Fadeaway',
  PostFade: 'Post Fade',
  FreeThrow: 'Free Throw',
}

const ATW_SEQUENCE = ['threeCornerL', 'threeWingL', 'threeTop', 'threeWingR', 'threeCornerR']
const RANDOM_ZONES = Object.keys(ZONES).filter((z) => z !== 'freeThrow')
const RANDOM_MOVES = (Object.keys(MOVE_PROFILES) as MoveType[]).filter((m) => m !== 'FreeThrow')

export function PracticeScreen({ onOpenBuilds }: { onOpenBuilds: () => void }) {
  const builds = useBuilds()
  const build = builds.activeBuild()
  const settings = useSettings()
  const deviceProfile = useDevice((s) => s.profile)
  const reps = useReps()

  const [quickOpen, setQuickOpen] = useState(false)
  const [lowPower, setLowPower] = useState(false)
  const [atwIndex, setAtwIndex] = useState(0)

  useWakeLock(true)

  // Startup rAF cadence self-check (§8.7) — display-only warning; judgments unaffected.
  useEffect(() => {
    void measureFrameRate().then((fps) => setLowPower(fps < 45))
  }, [])

  // Drill target management (F4.3, F5.4)
  useEffect(() => {
    if (settings.drill === 'aroundTheWorld') {
      settings.set({ zoneId: ATW_SEQUENCE[atwIndex], moveType: 'CatchShoot' })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.drill, atwIndex])

  const context: ShotContext = useMemo(
    () => ({
      moveType: settings.moveType,
      zoneId: settings.zoneId,
      contest: settings.contest,
      fatiguePct: settings.fatiguePct,
      meterOn: settings.meterOn,
      greenStreak: reps.streak,
    }),
    [
      settings.moveType,
      settings.zoneId,
      settings.contest,
      settings.fatiguePct,
      settings.meterOn,
      reps.streak,
    ],
  )

  const resolved = useMemo(() => resolveBuild(build, context), [build, context])

  const onRep = useRef<(r: RepResult) => void>(() => {})
  onRep.current = (r: RepResult) => {
    const rep: RepRecord = {
      ...r.verdict,
      id: crypto.randomUUID(),
      ts: new Date().toISOString(),
      buildId: build.id,
      moveType: settings.moveType,
      zoneId: settings.zoneId,
      contest: settings.contest,
      fatiguePct: settings.fatiguePct,
      meterOn: settings.meterOn,
      rawHoldMs: r.rawHoldMs,
      deviceOffsetMsApplied: r.deviceOffsetMsApplied,
    }
    reps.addRep(rep)
    if (settings.hapticsOn && r.verdict.judgment === 'GREEN') buzz(30)

    // Drill advancement
    if (settings.drill === 'aroundTheWorld' && r.verdict.judgment === 'GREEN') {
      setAtwIndex((i) => (i + 1) % ATW_SEQUENCE.length)
    } else if (settings.drill === 'randomSpot') {
      settings.set({ zoneId: RANDOM_ZONES[Math.floor(Math.random() * RANDOM_ZONES.length)] })
    } else if (settings.drill === 'mixtape') {
      settings.set({ moveType: RANDOM_MOVES[Math.floor(Math.random() * RANDOM_MOVES.length)] })
    }
  }

  const machine = useShotMachine(
    resolved,
    settings.contest,
    deviceProfile?.deviceOffsetMs ?? 0,
    (r) => onRep.current(r),
  )

  const session = reps.session
  const uncalibrated = build.timing.calibration.method === 'default'
  const zoneLabel = settings.zoneId ? ZONES[settings.zoneId]?.label : 'Free shoot'

  return (
    <div className="flex h-full flex-col px-4 pt-3">
      {/* Header chips */}
      <div
        className="flex items-center gap-2 overflow-x-auto pb-1"
        style={{ scrollbarWidth: 'none' }}
      >
        <Chip onClick={onOpenBuilds} active>
          {build.name} · {resolved.effectiveRating}
        </Chip>
        <Chip onClick={() => setQuickOpen(true)}>
          {zoneLabel} · {settings.contest}
        </Chip>
      </div>

      {/* Banners (§11.3) */}
      {uncalibrated && (
        <p className="mt-1 rounded-lg bg-court-900 px-3 py-1.5 text-[11px] text-heat">
          Uncalibrated build — timing is a default 550ms. Calibrate in Builds for real transfer.
        </p>
      )}
      {resolved.settingsChangedSinceCalibration && (
        <p className="mt-1 rounded-lg bg-court-900 px-3 py-1.5 text-[11px] text-heat">
          Jumpshot settings changed since calibration — re-validate your timing.
        </p>
      )}
      {lowPower && (
        <p className="mt-1 rounded-lg bg-court-900 px-3 py-1.5 text-[11px] text-chalk-dim">
          Low frame rate detected — the meter may look choppy, but timing judgments are
          millisecond-accurate either way.
        </p>
      )}

      {/* Move chips (F4.1) */}
      <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
        {(Object.keys(MOVE_PROFILES) as MoveType[]).map((m) => (
          <Chip
            key={m}
            active={settings.moveType === m}
            onClick={() =>
              settings.set({
                moveType: m,
                drill: settings.drill === 'mixtape' ? 'free' : settings.drill,
              })
            }
            className="shrink-0"
          >
            {MOVE_LABELS[m]}
          </Chip>
        ))}
      </div>

      {/* Drill callout */}
      {settings.drill !== 'free' && settings.drill !== 'spot' && (
        <div className="mt-1 text-center text-xs font-bold uppercase tracking-widest text-heat">
          {settings.drill === 'mixtape'
            ? `Mixtape: ${MOVE_LABELS[settings.moveType]}`
            : settings.drill === 'aroundTheWorld'
              ? `Around the World ${atwIndex + 1}/5: ${zoneLabel}`
              : `Random spot: ${zoneLabel}`}
        </div>
      )}

      {/* Meter */}
      <div className="mx-auto my-2 w-full max-w-xs flex-1" style={{ minHeight: 160 }}>
        <Meter
          timing={resolved}
          meterVisible={settings.meterOn}
          style={settings.meterStyle}
          phaseRef={machine.phaseRef}
          shotStartRef={machine.shotStartRef}
          releaseElapsedRef={machine.releaseElapsedRef}
          phase={machine.phase}
        />
      </div>

      <VerdictOverlay verdict={machine.verdict} />

      {/* Session counters */}
      <div className="mb-2 grid grid-cols-4 gap-2">
        <Stat label="Streak" value={String(reps.streak)} accent={reps.streak >= 3} />
        <Stat
          label="Green %"
          value={
            session && session.attempts > 0
              ? `${Math.round((session.greens / session.attempts) * 100)}`
              : '—'
          }
        />
        <Stat label="Reps" value={String(session?.attempts ?? 0)} />
        <Stat label="Window" value={`${resolved.greenWindowMs.toFixed(0)}ms`} />
      </div>

      {/* SHOOT (F3.1): ≥40% width, bottom third, thumb-reachable */}
      <div
        className={`pb-[calc(0.75rem+env(safe-area-inset-bottom))] ${settings.leftHanded ? 'pr-[15%]' : 'pl-[15%]'}`}
      >
        <button
          type="button"
          {...machine.handlers}
          onContextMenu={(e) => e.preventDefault()}
          className="h-24 w-full select-none rounded-2xl border-2 border-court-line bg-court-800 font-display text-3xl font-black uppercase tracking-[0.3em] text-chalk active:border-green-signal/60 active:bg-court-900"
          style={{ touchAction: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none' }}
        >
          Shoot
        </button>
      </div>

      <Sheet open={quickOpen} onClose={() => setQuickOpen(false)} title="Quick Settings">
        <QuickSettings buildId={build.id} />
      </Sheet>
    </div>
  )
}

function QuickSettings({ buildId }: { buildId: string }) {
  const settings = useSettings()
  const builds = useBuilds()
  const build = builds.builds.find((b) => b.id === buildId)
  const trim = build?.timing.userTrimMs ?? 0

  const nudge = (delta: number) =>
    builds.updateBuild(buildId, (b) => ({
      ...b,
      timing: { ...b.timing, userTrimMs: b.timing.userTrimMs + delta },
    }))

  return (
    <div className="space-y-5">
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-chalk-dim">
          Contest
        </p>
        <Segmented
          options={['Open', 'Light', 'Heavy', 'Smothered'] as const}
          value={settings.contest}
          onChange={(contest) => settings.set({ contest })}
        />
      </div>
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-chalk-dim">
          Fatigue · {Math.round(settings.fatiguePct * 100)}%
        </p>
        <input
          type="range"
          min={60}
          max={100}
          step={5}
          value={Math.round(settings.fatiguePct * 100)}
          onChange={(e) => settings.set({ fatiguePct: Number(e.target.value) / 100 })}
          className="w-full accent-[#2eff6e]"
          aria-label="Fatigue percent"
        />
      </div>
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-chalk-dim">
          Shot meter
        </p>
        <Segmented
          options={['on', 'off'] as const}
          value={settings.meterOn ? 'on' : 'off'}
          onChange={(v) => settings.set({ meterOn: v === 'on' })}
          labels={(v) => (v === 'on' ? 'Meter on' : 'Meter off (bigger window)')}
        />
      </div>
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-chalk-dim">
          Timing trim (rifle sights) · {trim >= 0 ? '+' : ''}
          {trim}ms
        </p>
        <div className="flex items-center gap-3">
          <Chip onClick={() => nudge(-2)}>−2ms earlier</Chip>
          <Chip onClick={() => nudge(2)}>+2ms later</Chip>
          {trim !== 0 && (
            <Chip onClick={() => nudge(-trim)} className="opacity-70">
              Reset
            </Chip>
          )}
        </div>
      </div>
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-chalk-dim">Drill</p>
        <Segmented
          options={['free', 'spot', 'aroundTheWorld', 'randomSpot', 'mixtape'] as const}
          value={settings.drill}
          onChange={(drill) => settings.set({ drill })}
          labels={(d) =>
            ({
              free: 'Free',
              spot: 'Spot session',
              aroundTheWorld: 'Around the World',
              randomSpot: 'Random spot',
              mixtape: 'Mixtape',
            })[d]
          }
        />
      </div>
    </div>
  )
}
