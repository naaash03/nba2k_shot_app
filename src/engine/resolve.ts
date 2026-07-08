// resolveBuild (spec §8.2, §8.5): collapses a PlayerBuild + ShotContext into a
// ResolvedBuildTiming once per config change, so the judgment hot path does no
// recomputation.

import {
  CUE_OFFSET,
  MOVE_PROFILES,
  RELEASE_SPEED_SCALE,
  T1,
  T2,
  WHITES_ALLOWED_DIFFICULTIES,
  ZONES,
} from './constants'
import type { AttributeKey } from './constants'
import type { PlayerBuild, ResolvedBuildTiming, ShootingAttribute, ShotContext } from './types'
import { computeGreenWindowMs } from './window'

export function effectiveRating(attr: ShootingAttribute): number {
  return Math.min(99, attr.base + attr.capBreaker)
}

/**
 * Which attribute feeds the window math (§10.3). Free-throw move always uses
 * the FT attribute; a null zone (free shoot) defaults to Three-Point.
 */
export function attributeForShot(context: ShotContext): AttributeKey {
  if (context.moveType === 'FreeThrow') return 'freeThrow'
  if (context.zoneId === null) return 'three'
  return ZONES[context.zoneId]?.attribute ?? 'three'
}

/**
 * Ideal release time (§8.5). Calibration captured idealReleaseMs at
 * calibratedAtSpeedPct / calibratedAtCue, so speed scale and cue offset apply
 * *relative* to those settings — they are no-ops until the user changes a
 * setting post-calibration.
 */
export function resolveIdealMs(build: PlayerBuild, context: ShotContext): number {
  const timing = build.timing
  const move = MOVE_PROFILES[context.moveType]

  const baseMs =
    timing.perMoveOverrides[context.moveType] ?? timing.idealReleaseMs * move.timingScale

  const speedRatio =
    RELEASE_SPEED_SCALE[build.jumpshot.releaseSpeedPct] /
    RELEASE_SPEED_SCALE[timing.calibratedAtSpeedPct]
  const cueDelta = CUE_OFFSET[build.jumpshot.visualCue] - CUE_OFFSET[timing.calibratedAtCue]

  return baseMs * speedRatio + cueDelta + timing.userTrimMs
}

export function settingsChangedSinceCalibration(build: PlayerBuild): boolean {
  return (
    build.jumpshot.releaseSpeedPct !== build.timing.calibratedAtSpeedPct ||
    build.jumpshot.visualCue !== build.timing.calibratedAtCue
  )
}

export function resolveBuild(build: PlayerBuild, context: ShotContext): ResolvedBuildTiming {
  const rating = effectiveRating(build.attributes[attributeForShot(context)])

  const greenWindowMs = computeGreenWindowMs({
    effectiveRating: rating,
    difficulty: build.difficulty,
    moveType: context.moveType,
    zoneId: context.zoneId,
    badges: build.badges,
    contest: context.contest,
    fatiguePct: context.fatiguePct,
    meterOn: context.meterOn,
    greenStreak: context.greenStreak ?? 0,
  })

  const greenHalfMs = greenWindowMs / 2
  return {
    idealMs: resolveIdealMs(build, context),
    greenWindowMs,
    whitesAllowed: WHITES_ALLOWED_DIFFICULTIES.has(build.difficulty),
    tierBoundaries: {
      greenHalfMs,
      t1EdgeMs: greenHalfMs + T1,
      t2EdgeMs: greenHalfMs + T2,
    },
    effectiveRating: rating,
    difficulty: build.difficulty,
    settingsChangedSinceCalibration: settingsChangedSinceCalibration(build),
  }
}
