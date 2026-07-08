// judgeShot (spec §8.2–8.3) — the engine's single entry point for the hot path.
// Judgment is computed from input timestamps only (invariant #1): the caller
// passes holdDurationMs = rawUp − rawDown − deviceOffsetMs.

import type { Contest, Judgment, ResolvedBuildTiming, Rng, ShotVerdict } from './types'
import { whitesProbability } from './whites'

export interface JudgeShotInput {
  holdDurationMs: number
  build: ResolvedBuildTiming // precomputed via resolveBuild()
  contest: Contest // whites probability modifier
}

/** Tier classification per §8.3. Boundaries are inclusive on the tighter side. */
export function classify(deltaMs: number, build: ResolvedBuildTiming): Judgment {
  const abs = Math.abs(deltaMs)
  const { greenHalfMs, t1EdgeMs, t2EdgeMs } = build.tierBoundaries
  if (abs <= greenHalfMs) return 'GREEN'
  if (abs <= t1EdgeMs) return deltaMs < 0 ? 'SLIGHTLY_EARLY' : 'SLIGHTLY_LATE'
  if (abs <= t2EdgeMs) return deltaMs < 0 ? 'EARLY' : 'LATE'
  return deltaMs < 0 ? 'VERY_EARLY' : 'VERY_LATE'
}

/**
 * Judge a release. Greens are deterministic makes; on All-Star+ everything
 * else misses (Green-or-Miss). RNG is consulted only for whites on low
 * difficulty, and is injected so tests can seed it.
 */
export function judgeShot(input: JudgeShotInput, rng: Rng = Math.random): ShotVerdict {
  const deltaMs = input.holdDurationMs - input.build.idealMs
  const judgment = classify(deltaMs, input.build)

  let made = false
  if (judgment === 'GREEN') {
    made = true
  } else if (input.build.whitesAllowed) {
    const p = whitesProbability(
      judgment,
      input.build.difficulty,
      input.build.effectiveRating,
      input.contest,
    )
    made = p > 0 && rng() < p
  }

  return {
    judgment,
    deltaMs,
    made,
    greenWindowMs: input.build.greenWindowMs,
    idealMs: input.build.idealMs,
  }
}
