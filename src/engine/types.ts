// Engine data model — spec §9. Pure types, zero framework imports.

export type Difficulty = 'Rookie' | 'SemiPro' | 'Pro' | 'AllStar' | 'Superstar' | 'HOF'

export type VisualCue = 'Jump' | 'SetPoint' | 'Push' | 'Release'

export type MoveType =
  'CatchShoot' | 'Standing' | 'MovingPullup' | 'Stepback' | 'Fadeaway' | 'PostFade' | 'FreeThrow'

export type Contest = 'Open' | 'Light' | 'Heavy' | 'Smothered'

export type Judgment =
  'GREEN' | 'SLIGHTLY_EARLY' | 'SLIGHTLY_LATE' | 'EARLY' | 'LATE' | 'VERY_EARLY' | 'VERY_LATE'

export type BadgeTier = 'Off' | 'Bronze' | 'Silver' | 'Gold' | 'HallOfFame' | 'Legend'

export interface ShootingAttribute {
  base: number // 25–99, the build's cap-constrained value
  capBreaker: number // 0–10 bonus earned in MyCAREER
} // effective = min(99, base + capBreaker)

export interface JumpshotConfig {
  baseName: string // label only, e.g. "Base 98"
  upperRelease1: string
  upperRelease2: string
  blendPct: number // 0–100 toward upperRelease2
  releaseSpeedPct: 25 | 50 | 75 | 100
  visualCue: VisualCue
}

export type CalibrationMethod = 'direct' | 'video' | 'feel' | 'default'

export interface BuildTiming {
  idealReleaseMs: number // calibrated, at the settings below
  calibratedAtSpeedPct: 25 | 50 | 75 | 100
  calibratedAtCue: VisualCue
  userTrimMs: number // F7.3 nudges
  perMoveOverrides: Partial<Record<MoveType, number>> // F4.2
  calibration: {
    method: CalibrationMethod
    date: string
    confidenceLabel: string
  }
}

export interface PlayerBuild {
  id: string
  name: string
  heightLabel?: string
  position?: string
  schemaVersion: number // for share-code/data migrations
  gameVersionTag: string // e.g. "2K26-S5" — see risk R6
  jumpshot: JumpshotConfig
  attributes: {
    close: ShootingAttribute
    mid: ShootingAttribute
    three: ShootingAttribute
    freeThrow: ShootingAttribute
  }
  badges: Record<string, BadgeTier> // keys from constants.ts registry
  difficulty: Difficulty
  timing: BuildTiming
  createdAt: string
  updatedAt: string
}

export interface ShotContext {
  moveType: MoveType
  zoneId: string | null // null = free shoot (zoneFactor 1.0, 3PT attribute)
  contest: Contest
  fatiguePct: number // 0.6–1.0
  meterOn: boolean
  greenStreak?: number // consecutive greens entering this rep (Green Machine)
}

export interface TierBoundaries {
  greenHalfMs: number // |Δ| ≤ this → GREEN
  t1EdgeMs: number // |Δ| ≤ this → SLIGHTLY_EARLY/LATE
  t2EdgeMs: number // |Δ| ≤ this → EARLY/LATE; beyond → VERY_*
}

/** Precomputed once per config change (resolveBuild) so the hot path does no recomputation. */
export interface ResolvedBuildTiming {
  idealMs: number
  greenWindowMs: number
  whitesAllowed: boolean
  tierBoundaries: TierBoundaries
  /** Effective rating of the attribute feeding this shot (whites math). */
  effectiveRating: number
  difficulty: Difficulty
  /** True when release speed / visual cue differ from calibration settings → re-validate. */
  settingsChangedSinceCalibration: boolean
}

export interface ShotVerdict {
  judgment: Judgment
  deltaMs: number // signed; negative = early
  made: boolean
  greenWindowMs: number
  idealMs: number
}

export interface RepRecord extends ShotVerdict {
  id: string
  ts: string
  buildId: string
  moveType: MoveType
  zoneId: string | null
  contest: Contest
  fatiguePct: number
  meterOn: boolean
  rawHoldMs: number
  deviceOffsetMsApplied: number // audit trail
}

export interface DeviceProfile {
  deviceOffsetMs: number
  jitterMs: number
  calibratedAt: string
  uaHint: string
}

/** Injected RNG — returns [0, 1). Seedable in tests; Math.random in production. */
export type Rng = () => number
