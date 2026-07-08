// Build editor (F2). Every input change updates the live "your green window"
// readout (F2.6) — the app teaching you your own build.

import { useMemo, useState } from 'react'
import { BADGE_KEYS, BADGE_TIERS, type BadgeKey } from '../../engine/constants'
import { effectiveRating } from '../../engine/resolve'
import { computeGreenWindowMs } from '../../engine/window'
import type { BadgeTier, Difficulty, PlayerBuild, VisualCue } from '../../engine/types'
import { Button, Chip, Field, Segmented, TextInput } from '../../components/ui'
import { useBuilds } from '../../store/builds'

const DIFFICULTIES: Difficulty[] = ['Rookie', 'SemiPro', 'Pro', 'AllStar', 'Superstar', 'HOF']
const CUES: VisualCue[] = ['Jump', 'SetPoint', 'Push', 'Release']
const ATTR_LABELS = {
  close: 'Close Shot',
  mid: 'Mid-Range',
  three: 'Three-Point',
  freeThrow: 'Free Throw',
} as const
const BADGE_LABELS: Record<BadgeKey, string> = {
  LimitlessRange: 'Limitless Range',
  Deadeye: 'Deadeye',
  SetShotSpecialist: 'Set Shot Specialist',
  CatchAndShoot: 'Catch & Shoot',
  GreenMachine: 'Green Machine',
}

export function BuildEditor({
  buildId,
  onDone,
  onCalibrate,
}: {
  buildId: string
  onDone: () => void
  onCalibrate: () => void
}) {
  const builds = useBuilds()
  const original = builds.builds.find((b) => b.id === buildId)
  const [draft, setDraft] = useState<PlayerBuild>(() => structuredClone(original!))

  // F2.6 — live window readout: open catch & shoot beyond the arc, fresh, meter on.
  const liveWindow = useMemo(
    () =>
      computeGreenWindowMs({
        effectiveRating: effectiveRating(draft.attributes.three),
        difficulty: draft.difficulty,
        moveType: 'CatchShoot',
        zoneId: null,
        badges: draft.badges,
        contest: 'Open',
        fatiguePct: 1,
        meterOn: true,
        greenStreak: 0,
      }),
    [draft],
  )

  const patch = (p: Partial<PlayerBuild>) => setDraft((d) => ({ ...d, ...p }))
  const patchJumpshot = (p: Partial<PlayerBuild['jumpshot']>) =>
    setDraft((d) => ({ ...d, jumpshot: { ...d.jumpshot, ...p } }))

  const save = () => {
    builds.updateBuild(buildId, () => draft)
    onDone()
  }

  if (!original) return null

  return (
    <div className="space-y-6 px-4 pb-28 pt-4">
      {/* Sticky live readout (F2.6) */}
      <div className="sticky top-0 z-10 -mx-4 border-b border-court-line bg-court-950/95 px-4 py-3 backdrop-blur">
        <div className="flex items-baseline justify-between">
          <span className="text-xs uppercase tracking-widest text-chalk-dim">
            Your green window (open C&S)
          </span>
          <span className="font-display text-3xl font-black tabular-nums text-green-signal">
            ~{liveWindow.toFixed(0)}ms
          </span>
        </div>
      </div>

      <Field label="Build name">
        <TextInput value={draft.name} onChange={(e) => patch({ name: e.target.value })} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Height">
          <TextInput
            value={draft.heightLabel ?? ''}
            onChange={(e) => patch({ heightLabel: e.target.value })}
            placeholder={`6'8"`}
          />
        </Field>
        <Field label="Position">
          <TextInput
            value={draft.position ?? ''}
            onChange={(e) => patch({ position: e.target.value })}
            placeholder="SF"
          />
        </Field>
      </div>

      <section className="space-y-3">
        <h3 className="font-display text-sm font-bold uppercase tracking-widest text-chalk">
          Jumpshot
        </h3>
        <p className="text-xs text-chalk-dim">
          Names are labels for your own reference — timing comes from calibration, not the name.
        </p>
        <Field label="Base">
          <TextInput
            value={draft.jumpshot.baseName}
            onChange={(e) => patchJumpshot({ baseName: e.target.value })}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Upper release 1">
            <TextInput
              value={draft.jumpshot.upperRelease1}
              onChange={(e) => patchJumpshot({ upperRelease1: e.target.value })}
            />
          </Field>
          <Field label="Upper release 2">
            <TextInput
              value={draft.jumpshot.upperRelease2}
              onChange={(e) => patchJumpshot({ upperRelease2: e.target.value })}
            />
          </Field>
        </div>
        <Field label={`Blend · ${draft.jumpshot.blendPct}% toward upper 2`}>
          <input
            type="range"
            min={0}
            max={100}
            value={draft.jumpshot.blendPct}
            onChange={(e) => patchJumpshot({ blendPct: Number(e.target.value) })}
            className="w-full accent-[#2eff6e]"
          />
        </Field>
        <Field label="Release speed">
          <Segmented
            options={[25, 50, 75, 100] as const}
            value={draft.jumpshot.releaseSpeedPct}
            onChange={(releaseSpeedPct) => patchJumpshot({ releaseSpeedPct })}
            labels={(v) => `${v}%`}
          />
        </Field>
        <Field label="Visual cue">
          <Segmented
            options={CUES}
            value={draft.jumpshot.visualCue}
            onChange={(visualCue) => patchJumpshot({ visualCue })}
            labels={(c) => (c === 'SetPoint' ? 'Set Point' : c)}
          />
        </Field>
      </section>

      <section className="space-y-3">
        <h3 className="font-display text-sm font-bold uppercase tracking-widest text-chalk">
          Attributes + cap breakers
        </h3>
        {(Object.keys(ATTR_LABELS) as (keyof typeof ATTR_LABELS)[]).map((key) => {
          const attr = draft.attributes[key]
          const eff = effectiveRating(attr)
          return (
            <div key={key} className="rounded-xl border border-court-line p-3">
              <div className="mb-2 flex items-baseline justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-chalk-dim">
                  {ATTR_LABELS[key]}
                </span>
                <span className="font-display text-xl font-black tabular-nums text-chalk">
                  {eff}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="text-xs text-chalk-dim">
                  Base
                  <input
                    type="number"
                    min={25}
                    max={99}
                    value={attr.base}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        attributes: {
                          ...d.attributes,
                          [key]: { ...attr, base: clampInt(e.target.value, 25, 99) },
                        },
                      }))
                    }
                    className="mt-1 w-full rounded-lg border border-court-line bg-court-900 px-3 py-2 text-sm text-chalk"
                  />
                </label>
                <label className="text-xs text-chalk-dim">
                  Cap breaker
                  <input
                    type="number"
                    min={0}
                    max={10}
                    value={attr.capBreaker}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        attributes: {
                          ...d.attributes,
                          [key]: { ...attr, capBreaker: clampInt(e.target.value, 0, 10) },
                        },
                      }))
                    }
                    className="mt-1 w-full rounded-lg border border-court-line bg-court-900 px-3 py-2 text-sm text-chalk"
                  />
                </label>
              </div>
            </div>
          )
        })}
      </section>

      <section className="space-y-3">
        <h3 className="font-display text-sm font-bold uppercase tracking-widest text-chalk">
          Badges
        </h3>
        {BADGE_KEYS.map((key) => (
          <div key={key}>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-chalk-dim">
              {BADGE_LABELS[key]}
            </p>
            <Segmented
              options={BADGE_TIERS}
              value={(draft.badges[key] ?? 'Off') as BadgeTier}
              onChange={(tier) => setDraft((d) => ({ ...d, badges: { ...d.badges, [key]: tier } }))}
              labels={(t) => (t === 'HallOfFame' ? 'HOF' : t)}
            />
          </div>
        ))}
      </section>

      <section className="space-y-3">
        <h3 className="font-display text-sm font-bold uppercase tracking-widest text-chalk">
          Difficulty
        </h3>
        <Segmented
          options={DIFFICULTIES}
          value={draft.difficulty}
          onChange={(difficulty) => patch({ difficulty })}
          labels={(d) => (d === 'SemiPro' ? 'Semi-Pro' : d === 'AllStar' ? 'All-Star' : d)}
        />
        <p className="text-xs text-chalk-dim">
          All-Star and above is Green-or-Miss — only perfect releases fall, like 2K26.
        </p>
      </section>

      <section className="space-y-2 rounded-xl border border-court-line p-3">
        <div className="flex items-baseline justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-chalk-dim">
            Release timing
          </span>
          <span className="font-display text-xl font-black tabular-nums">
            {draft.timing.idealReleaseMs.toFixed(0)}ms
          </span>
        </div>
        <p className="text-xs text-chalk-dim">
          {draft.timing.calibration.method === 'default'
            ? 'Uncalibrated — using the 550ms default.'
            : `Calibrated via ${draft.timing.calibration.method} · ${draft.timing.calibration.confidenceLabel}`}
        </p>
        <Chip onClick={onCalibrate}>Calibrate timing</Chip>
      </section>

      <div className="fixed inset-x-0 bottom-14 border-t border-court-line bg-court-950/95 p-3 backdrop-blur">
        <div className="flex gap-3">
          <Button variant="ghost" onClick={onDone} className="flex-1">
            Cancel
          </Button>
          <Button onClick={save} className="flex-1">
            Save build
          </Button>
        </div>
      </div>
    </div>
  )
}

function clampInt(v: string, min: number, max: number): number {
  const n = Math.round(Number(v))
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : min
}
