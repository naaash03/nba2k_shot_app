// Judgment boundary + Green-or-Miss + determinism tests (spec §8.8).

import { describe, expect, it } from 'vitest'
import { judgeShot, classify } from '../../src/engine/judgment'
import { resolveBuild } from '../../src/engine/resolve'
import type { Judgment, ResolvedBuildTiming } from '../../src/engine/types'
import { makeBuild, makeContext, seededRng } from './helpers'

// Hand-built timing: ideal 550ms, window 40ms → greenHalf 20, T1 edge 55, T2 edge 100.
function timing(overrides: Partial<ResolvedBuildTiming> = {}): ResolvedBuildTiming {
  return {
    idealMs: 550,
    greenWindowMs: 40,
    whitesAllowed: false,
    tierBoundaries: { greenHalfMs: 20, t1EdgeMs: 55, t2EdgeMs: 100 },
    effectiveRating: 88,
    difficulty: 'AllStar',
    settingsChangedSinceCalibration: false,
    ...overrides,
  }
}

describe('tier boundaries (§8.3) — inclusive/exclusive edges pinned', () => {
  const cases: Array<[number, Judgment]> = [
    // Δ, expected — boundaries are INCLUSIVE on the tighter tier
    [0, 'GREEN'],
    [20, 'GREEN'], // exactly +w/2 → green
    [-20, 'GREEN'], // exactly −w/2 → green
    [20.001, 'SLIGHTLY_LATE'], // just past → slightly
    [-20.001, 'SLIGHTLY_EARLY'],
    [55, 'SLIGHTLY_LATE'], // exactly w/2+T1 → still slightly
    [-55, 'SLIGHTLY_EARLY'],
    [55.001, 'LATE'],
    [-55.001, 'EARLY'],
    [100, 'LATE'], // exactly w/2+T2 → still early/late
    [-100, 'EARLY'],
    [100.001, 'VERY_LATE'],
    [-100.001, 'VERY_EARLY'],
    [300, 'VERY_LATE'],
  ]

  it.each(cases)('Δ = %fms → %s', (delta, expected) => {
    expect(classify(delta, timing())).toBe(expected)
    const verdict = judgeShot(
      { holdDurationMs: 550 + delta, build: timing(), contest: 'Open' },
      seededRng(1),
    )
    expect(verdict.judgment).toBe(expected)
    expect(verdict.deltaMs).toBeCloseTo(delta, 10)
  })
})

describe('Green-or-Miss (§3.1, §8.3)', () => {
  it('greens are deterministic makes — RNG never consulted', () => {
    let rngCalls = 0
    const spyRng = () => {
      rngCalls++
      return 0
    }
    const verdict = judgeShot({ holdDurationMs: 555, build: timing(), contest: 'Open' }, spyRng)
    expect(verdict.judgment).toBe('GREEN')
    expect(verdict.made).toBe(true)
    expect(rngCalls).toBe(0)
  })

  it('whites are impossible at All-Star+ even with the luckiest roll', () => {
    for (const difficulty of ['AllStar', 'Superstar', 'HOF'] as const) {
      const build = timing({ difficulty, whitesAllowed: false })
      // rng → 0 would pass any probability check if one were (wrongly) made
      const verdict = judgeShot({ holdDurationMs: 580, build, contest: 'Open' }, () => 0)
      expect(verdict.judgment).toBe('SLIGHTLY_LATE')
      expect(verdict.made).toBe(false)
    }
  })

  it('whites can fall on Pro and below', () => {
    const build = timing({ difficulty: 'Pro', whitesAllowed: true })
    const make = judgeShot({ holdDurationMs: 580, build, contest: 'Open' }, () => 0)
    expect(make.made).toBe(true)
    const miss = judgeShot({ holdDurationMs: 580, build, contest: 'Open' }, () => 0.999)
    expect(miss.made).toBe(false)
  })

  it('VERY_EARLY / VERY_LATE always miss, even on Rookie', () => {
    const build = timing({ difficulty: 'Rookie', whitesAllowed: true })
    const verdict = judgeShot({ holdDurationMs: 550 + 150, build, contest: 'Open' }, () => 0)
    expect(verdict.judgment).toBe('VERY_LATE')
    expect(verdict.made).toBe(false)
  })
})

describe('determinism (§8.8)', () => {
  it('same inputs + same seed → identical verdicts', () => {
    const build = resolveBuild(makeBuild({ difficulty: 'Pro' }), makeContext({ contest: 'Light' }))
    const run = () => judgeShot({ holdDurationMs: 590, build, contest: 'Light' }, seededRng(42))
    expect(run()).toEqual(run())
  })

  it('verdict carries the resolved window and ideal for the rep log', () => {
    const build = resolveBuild(makeBuild(), makeContext())
    const verdict = judgeShot({ holdDurationMs: 560, build, contest: 'Open' }, seededRng(7))
    expect(verdict.idealMs).toBe(build.idealMs)
    expect(verdict.greenWindowMs).toBe(build.greenWindowMs)
  })
})
