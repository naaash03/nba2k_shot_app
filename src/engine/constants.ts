// Every TUNABLE magic number in the engine lives here (spec §0.3).
// Feel changes are made by editing these tables — never logic files —
// and every tune must ship with updated golden tests (spec §15.5).

import type { BadgeTier, Contest, Difficulty, Judgment, MoveType, VisualCue } from './types'

// ── Green window formula (§8.4) ────────────────────────────────────────────

/** TUNABLE — base green window in ms before factors. */
export const BASE_WINDOW = 24

/** TUNABLE — clamp bounds for the final window, ms. */
export const MIN_WINDOW = 10
export const MAX_WINDOW = 140

/** TUNABLE — rating factor: 70-rated ≈ ×1.18, 99-rated ≈ ×1.44. */
export function ratingFactor(effectiveRating: number): number {
  return clamp(0.55 + 0.009 * effectiveRating, 0.75, 1.45)
}

/** TUNABLE — window scale per difficulty. */
export const DIFFICULTY_FACTOR: Record<Difficulty, number> = {
  Rookie: 2.2,
  SemiPro: 1.9,
  Pro: 1.6,
  AllStar: 1.25,
  Superstar: 1.0,
  HOF: 0.8,
}

/** Difficulties where non-green ("white") releases can still fall (§3.1). */
export const WHITES_ALLOWED_DIFFICULTIES: ReadonlySet<Difficulty> = new Set([
  'Rookie',
  'SemiPro',
  'Pro',
])

/** TUNABLE — window scale per contest level. */
export const CONTEST_FACTOR: Record<Contest, number> = {
  Open: 1.0,
  Light: 0.8,
  Heavy: 0.55,
  Smothered: 0.35,
}

/** TUNABLE — fatigue factor; f ∈ [0.6, 1]. Fresh = ×1.0, gassed = ×0.88. */
export function fatigueFactor(fatiguePct: number): number {
  return 0.7 + 0.3 * fatiguePct
}

/** TUNABLE — meter-off grants a slightly larger window (2K26 behavior, F8.1). */
export const METER_OFF_FACTOR = 1.12

// ── Judgment tiers (§8.3) ──────────────────────────────────────────────────

/** TUNABLE — ms beyond the green half-window that still counts as SLIGHTLY early/late. */
export const T1 = 35
/** TUNABLE — ms beyond the green half-window that still counts as EARLY/LATE. */
export const T2 = 80

/** TUNABLE — holding past ideal + this = dead rep, VERY_LATE (F3.5). */
export const LATE_CUTOFF = 300

// ── Move timing profiles (§F4) ─────────────────────────────────────────────

export interface MoveProfile {
  /** Default ideal-ms scale vs the build's base jumper (until per-move calibration). */
  timingScale: number
  /** TUNABLE — window multiplier. */
  windowFactor: number
}

export const MOVE_PROFILES: Record<MoveType, MoveProfile> = {
  CatchShoot: { timingScale: 1.0, windowFactor: 1.0 },
  Standing: { timingScale: 1.0, windowFactor: 0.9 },
  MovingPullup: { timingScale: 1.05, windowFactor: 0.75 },
  Stepback: { timingScale: 1.1, windowFactor: 0.7 },
  Fadeaway: { timingScale: 1.2, windowFactor: 0.65 },
  PostFade: { timingScale: 1.25, windowFactor: 0.6 },
  FreeThrow: { timingScale: 0.95, windowFactor: 1.3 },
}

// ── Court zones (§F5.1, §10.3) ─────────────────────────────────────────────

export type ZoneGroup = 'close' | 'mid' | 'three' | 'deep3' | 'freeThrow'
export type AttributeKey = 'close' | 'mid' | 'three' | 'freeThrow'

export interface ZoneDef {
  group: ZoneGroup
  attribute: AttributeKey
  label: string
}

/** The classic 14 hot zones + deep-3 ring + free-throw line. */
export const ZONES: Record<string, ZoneDef> = {
  underBasket: { group: 'close', attribute: 'close', label: 'Under Basket' },
  closeL: { group: 'close', attribute: 'close', label: 'Close Left' },
  closeC: { group: 'close', attribute: 'close', label: 'Close Center' },
  closeR: { group: 'close', attribute: 'close', label: 'Close Right' },
  midL: { group: 'mid', attribute: 'mid', label: 'Mid Left' },
  midLC: { group: 'mid', attribute: 'mid', label: 'Mid Left-Center' },
  midC: { group: 'mid', attribute: 'mid', label: 'Mid Center' },
  midRC: { group: 'mid', attribute: 'mid', label: 'Mid Right-Center' },
  midR: { group: 'mid', attribute: 'mid', label: 'Mid Right' },
  threeCornerL: { group: 'three', attribute: 'three', label: 'Left Corner 3' },
  threeWingL: { group: 'three', attribute: 'three', label: 'Left Wing 3' },
  threeTop: { group: 'three', attribute: 'three', label: 'Top of the Key 3' },
  threeWingR: { group: 'three', attribute: 'three', label: 'Right Wing 3' },
  threeCornerR: { group: 'three', attribute: 'three', label: 'Right Corner 3' },
  deep3: { group: 'deep3', attribute: 'three', label: 'Deep 3 (27ft+)' },
  freeThrow: { group: 'freeThrow', attribute: 'freeThrow', label: 'Free Throw' },
}

/** TUNABLE — window factor per zone group (§10.3). Deep-3 relief with Limitless ≥ Gold. */
export const ZONE_FACTOR: Record<ZoneGroup, number> = {
  close: 1.05,
  mid: 1.0,
  three: 0.95,
  deep3: 0.75,
  freeThrow: 1.3,
}
export const DEEP3_LIMITLESS_FACTOR = 0.92

// ── Badges (F2.3 v1 set — data-driven registry) ────────────────────────────

export const BADGE_TIERS: readonly BadgeTier[] = [
  'Off',
  'Bronze',
  'Silver',
  'Gold',
  'HallOfFame',
  'Legend',
]

export const BADGE_KEYS = [
  'LimitlessRange',
  'Deadeye',
  'SetShotSpecialist',
  'CatchAndShoot',
  'GreenMachine',
] as const
export type BadgeKey = (typeof BADGE_KEYS)[number]

/** Tier at or above which Limitless Range relieves the deep-3 penalty (§10.3). */
export const LIMITLESS_MIN_TIER: BadgeTier = 'Gold'

/**
 * TUNABLE — Deadeye relieves a fraction of the contest penalty:
 * contestFactor' = cf + (1 − cf) × relief.
 */
export const DEADEYE_CONTEST_RELIEF: Record<BadgeTier, number> = {
  Off: 0,
  Bronze: 0.1,
  Silver: 0.2,
  Gold: 0.3,
  HallOfFame: 0.45,
  Legend: 0.55,
}

/** TUNABLE — Catch & Shoot window bonus, applies to CatchShoot reps only. */
export const CATCH_AND_SHOOT_BONUS: Record<BadgeTier, number> = {
  Off: 1.0,
  Bronze: 1.02,
  Silver: 1.04,
  Gold: 1.06,
  HallOfFame: 1.09,
  Legend: 1.12,
}

/** TUNABLE — Set Shot Specialist window bonus, applies to standstill reps (CatchShoot/Standing). */
export const SET_SHOT_SPECIALIST_BONUS: Record<BadgeTier, number> = {
  Off: 1.0,
  Bronze: 1.02,
  Silver: 1.03,
  Gold: 1.05,
  HallOfFame: 1.07,
  Legend: 1.09,
}

/** TUNABLE — Green Machine: window bonus once the entering green streak reaches the threshold. */
export const GREEN_MACHINE_MIN_STREAK = 2
export const GREEN_MACHINE_BONUS: Record<BadgeTier, number> = {
  Off: 1.0,
  Bronze: 1.02,
  Silver: 1.04,
  Gold: 1.07,
  HallOfFame: 1.1,
  Legend: 1.14,
}

// ── Timing resolution (§8.5) ───────────────────────────────────────────────

/** TUNABLE — animation stretch at lower release-speed settings. */
export const RELEASE_SPEED_SCALE: Record<25 | 50 | 75 | 100, number> = {
  100: 1.0,
  75: 1.06,
  50: 1.13,
  25: 1.21,
}

/** TUNABLE — where each visual cue sits relative to the release moment, ms. */
export const CUE_OFFSET: Record<VisualCue, number> = {
  Release: 0,
  Push: -40,
  SetPoint: -90,
  Jump: -160,
}

// ── Whites make-probability (§10.2) ────────────────────────────────────────

export type WhiteTier = Extract<Judgment, 'SLIGHTLY_EARLY' | 'SLIGHTLY_LATE' | 'EARLY' | 'LATE'>

/** TUNABLE — base P(make) for non-green tiers when whites are allowed. */
export const WHITES_TABLE: Record<
  'SLIGHT' | 'FAR',
  Record<'Rookie' | 'SemiPro' | 'Pro', number>
> = {
  SLIGHT: { Rookie: 0.55, SemiPro: 0.45, Pro: 0.32 },
  FAR: { Rookie: 0.25, SemiPro: 0.18, Pro: 0.1 },
}

/** TUNABLE — contest modifier on whites probability. */
export const CONTEST_WHITE_FACTOR: Record<Contest, number> = {
  Open: 1.0,
  Light: 0.75,
  Heavy: 0.4,
  Smothered: 0.15,
}

/** TUNABLE — cap on whites probability. */
export const WHITES_MAX_P = 0.85

// ── Shared helpers ─────────────────────────────────────────────────────────

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function badgeTierIndex(tier: BadgeTier): number {
  return BADGE_TIERS.indexOf(tier)
}
