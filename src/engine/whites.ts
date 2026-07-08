// Whites make-probability (spec §10). Greens are deterministic makes; RNG
// exists only for non-green tiers on Rookie/Semi-Pro/Pro.

import { CONTEST_WHITE_FACTOR, WHITES_MAX_P, WHITES_TABLE, clamp } from './constants'
import type { Contest, Difficulty, Judgment } from './types'

/**
 * P(make) for a non-green judgment when whites are allowed.
 * VERY_EARLY/VERY_LATE (and GREEN) always return 0 here — greens are handled
 * deterministically by the caller.
 */
export function whitesProbability(
  judgment: Judgment,
  difficulty: Difficulty,
  effectiveRating: number,
  contest: Contest,
): number {
  if (difficulty !== 'Rookie' && difficulty !== 'SemiPro' && difficulty !== 'Pro') return 0

  let base: number
  if (judgment === 'SLIGHTLY_EARLY' || judgment === 'SLIGHTLY_LATE') {
    base = WHITES_TABLE.SLIGHT[difficulty]
  } else if (judgment === 'EARLY' || judgment === 'LATE') {
    base = WHITES_TABLE.FAR[difficulty]
  } else {
    return 0
  }

  const p = base * (0.6 + 0.4 * (effectiveRating / 99)) * CONTEST_WHITE_FACTOR[contest]
  return clamp(p, 0, WHITES_MAX_P)
}
