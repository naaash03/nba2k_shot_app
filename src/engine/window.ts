// Green window formula (spec §8.4) — pure function of ratings + context.

import {
  BASE_WINDOW,
  CATCH_AND_SHOOT_BONUS,
  CONTEST_FACTOR,
  DEADEYE_CONTEST_RELIEF,
  DEEP3_LIMITLESS_FACTOR,
  DIFFICULTY_FACTOR,
  GREEN_MACHINE_BONUS,
  GREEN_MACHINE_MIN_STREAK,
  LIMITLESS_MIN_TIER,
  MAX_WINDOW,
  METER_OFF_FACTOR,
  MIN_WINDOW,
  MOVE_PROFILES,
  SET_SHOT_SPECIALIST_BONUS,
  ZONES,
  ZONE_FACTOR,
  badgeTierIndex,
  clamp,
  fatigueFactor,
  ratingFactor,
} from './constants'
import type { BadgeTier, Contest, Difficulty, MoveType } from './types'

export interface WindowInput {
  /** Effective rating (base + cap breaker, ≤99) of the attribute feeding this shot. */
  effectiveRating: number
  difficulty: Difficulty
  moveType: MoveType
  zoneId: string | null // null = free shoot → zoneFactor 1.0
  badges: Record<string, BadgeTier>
  contest: Contest
  fatiguePct: number // 0.6–1.0
  meterOn: boolean
  greenStreak: number // consecutive greens entering this rep
}

function tierOf(badges: Record<string, BadgeTier>, key: string): BadgeTier {
  return badges[key] ?? 'Off'
}

/** Zone factor incl. the deep-3 penalty and Limitless Range relief (§10.3). */
export function zoneFactor(zoneId: string | null, badges: Record<string, BadgeTier>): number {
  if (zoneId === null) return 1.0
  const zone = ZONES[zoneId]
  if (!zone) return 1.0
  if (
    zone.group === 'deep3' &&
    badgeTierIndex(tierOf(badges, 'LimitlessRange')) >= badgeTierIndex(LIMITLESS_MIN_TIER)
  ) {
    return DEEP3_LIMITLESS_FACTOR
  }
  return ZONE_FACTOR[zone.group]
}

/** Contest factor incl. Deadeye relief: cf + (1 − cf) × relief. */
export function contestFactor(contest: Contest, badges: Record<string, BadgeTier>): number {
  const cf = CONTEST_FACTOR[contest]
  const relief = DEADEYE_CONTEST_RELIEF[tierOf(badges, 'Deadeye')]
  return cf + (1 - cf) * relief
}

/** Move-conditional badge window bonuses (Catch & Shoot, Set Shot Specialist, Green Machine). */
export function badgeWindowBonus(
  moveType: MoveType,
  badges: Record<string, BadgeTier>,
  greenStreak: number,
): number {
  let bonus = 1.0
  if (moveType === 'CatchShoot') {
    bonus *= CATCH_AND_SHOOT_BONUS[tierOf(badges, 'CatchAndShoot')]
  }
  if (moveType === 'CatchShoot' || moveType === 'Standing') {
    bonus *= SET_SHOT_SPECIALIST_BONUS[tierOf(badges, 'SetShotSpecialist')]
  }
  if (greenStreak >= GREEN_MACHINE_MIN_STREAK) {
    bonus *= GREEN_MACHINE_BONUS[tierOf(badges, 'GreenMachine')]
  }
  return bonus
}

/** Full green window in ms, clamped to [MIN_WINDOW, MAX_WINDOW]. */
export function computeGreenWindowMs(input: WindowInput): number {
  const window =
    BASE_WINDOW *
    ratingFactor(input.effectiveRating) *
    DIFFICULTY_FACTOR[input.difficulty] *
    MOVE_PROFILES[input.moveType].windowFactor *
    zoneFactor(input.zoneId, input.badges) *
    contestFactor(input.contest, input.badges) *
    fatigueFactor(input.fatiguePct) *
    (input.meterOn ? 1.0 : METER_OFF_FACTOR) *
    badgeWindowBonus(input.moveType, input.badges, input.greenStreak)
  return clamp(window, MIN_WINDOW, MAX_WINDOW)
}
