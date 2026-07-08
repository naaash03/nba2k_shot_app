// Green-window formula tests (spec §8.8): golden values + monotonicity properties.

import { describe, expect, it } from 'vitest'
import { MAX_WINDOW, MIN_WINDOW, ratingFactor } from '../../src/engine/constants'
import type { BadgeTier, Contest, Difficulty } from '../../src/engine/types'
import { computeGreenWindowMs, type WindowInput } from '../../src/engine/window'

const NO_BADGES: Record<string, BadgeTier> = {}

function input(overrides: Partial<WindowInput> = {}): WindowInput {
  return {
    effectiveRating: 88,
    difficulty: 'AllStar',
    moveType: 'CatchShoot',
    zoneId: null,
    badges: NO_BADGES,
    contest: 'Open',
    fatiguePct: 1.0,
    meterOn: true,
    greenStreak: 0,
    ...overrides,
  }
}

describe('ratingFactor', () => {
  it('matches the spec anchors', () => {
    expect(ratingFactor(70)).toBeCloseTo(1.18, 10)
    expect(ratingFactor(99)).toBeCloseTo(1.441, 10)
    expect(ratingFactor(88)).toBeCloseTo(1.342, 10)
  })
  it('clamps at both ends', () => {
    expect(ratingFactor(0)).toBe(0.75)
    expect(ratingFactor(200)).toBe(1.45)
  })
})

describe('golden window values', () => {
  // §8.4 worked example: 88 3PT, All-Star, open catch-and-shoot, meter on, fresh.
  // 24 × 1.342 × 1.25 × 1.0 × 1.0 × 1.0 × 1.0 × 1.0 = 40.26ms (±20.13ms).
  it('pins the §8.4 worked example (≈40ms window)', () => {
    expect(computeGreenWindowMs(input())).toBeCloseTo(40.26, 10)
  })

  it('tightens to ~26ms on HOF (§8.4)', () => {
    expect(computeGreenWindowMs(input({ difficulty: 'HOF' }))).toBeCloseTo(25.7664, 10)
  })

  const golden: Array<[string, Partial<WindowInput>, number]> = [
    // zone factors (§10.3)
    ['top-of-key 3 applies ×0.95', { zoneId: 'threeTop' }, 40.26 * 0.95],
    ['mid-range zone is ×1.00', { zoneId: 'midC', effectiveRating: 82 }, 24 * 1.288 * 1.25],
    [
      'close zone applies ×1.05',
      { zoneId: 'closeC', effectiveRating: 70 },
      24 * 1.18 * 1.25 * 1.05,
    ],
    [
      'free-throw zone + move',
      { zoneId: 'freeThrow', moveType: 'FreeThrow', effectiveRating: 78 },
      24 * 1.252 * 1.25 * 1.3 * 1.3,
    ],
    // deep 3 + Limitless Range (§10.3)
    ['deep 3 penalty ×0.75', { zoneId: 'deep3' }, 40.26 * 0.75],
    [
      'deep 3 with Limitless Gold relieved to ×0.92',
      { zoneId: 'deep3', badges: { LimitlessRange: 'Gold' } },
      40.26 * 0.92,
    ],
    [
      'deep 3 with Limitless Silver NOT relieved',
      { zoneId: 'deep3', badges: { LimitlessRange: 'Silver' } },
      40.26 * 0.75,
    ],
    // moves (§F4)
    ['stepback applies ×0.70', { moveType: 'Stepback' }, 40.26 * 0.7],
    ['fadeaway applies ×0.65', { moveType: 'Fadeaway' }, 40.26 * 0.65],
    // contest + Deadeye
    ['heavy contest ×0.55', { contest: 'Heavy' }, 40.26 * 0.55],
    [
      'heavy contest with Deadeye Gold relieved to ×0.685',
      { contest: 'Heavy', badges: { Deadeye: 'Gold' } },
      40.26 * (0.55 + 0.45 * 0.3),
    ],
    // fatigue, meter, badges
    ['fatigue 0.6 applies ×0.88', { fatiguePct: 0.6 }, 40.26 * 0.88],
    ['meter off grants ×1.12', { meterOn: false }, 40.26 * 1.12],
    [
      'Catch & Shoot Gold grants ×1.06 on catch-and-shoot',
      { badges: { CatchAndShoot: 'Gold' } },
      40.26 * 1.06,
    ],
    [
      'Catch & Shoot badge does NOT apply on stepbacks',
      { moveType: 'Stepback', badges: { CatchAndShoot: 'Gold' } },
      40.26 * 0.7,
    ],
    [
      'Green Machine Gold applies at streak ≥ 2',
      { greenStreak: 2, badges: { GreenMachine: 'Gold' } },
      40.26 * 1.07,
    ],
    [
      'Green Machine dormant at streak 1',
      { greenStreak: 1, badges: { GreenMachine: 'Gold' } },
      40.26,
    ],
    [
      'Set Shot Specialist Gold applies on standing shots',
      { moveType: 'Standing', badges: { SetShotSpecialist: 'Gold' } },
      40.26 * 0.9 * 1.05,
    ],
  ]

  it.each(golden)('%s', (_name, overrides, expected) => {
    expect(computeGreenWindowMs(input(overrides))).toBeCloseTo(expected, 8)
  })

  it('unknown zone ids fall back to factor 1.0', () => {
    expect(computeGreenWindowMs(input({ zoneId: 'not-a-zone' }))).toBeCloseTo(40.26, 10)
  })
})

describe('window clamping', () => {
  it('clamps to MAX_WINDOW (140ms)', () => {
    // 99-rated FT on Rookie, meter off: 24 × 1.441 × 2.2 × 1.3 × 1.3 × 1.12 ≈ 144ms
    const w = computeGreenWindowMs(
      input({
        effectiveRating: 99,
        difficulty: 'Rookie',
        moveType: 'FreeThrow',
        zoneId: 'freeThrow',
        meterOn: false,
      }),
    )
    expect(w).toBe(MAX_WINDOW)
  })

  it('clamps to MIN_WINDOW (10ms)', () => {
    // 25-rated smothered post fade on HOF ≈ 3ms raw
    const w = computeGreenWindowMs(
      input({
        effectiveRating: 25,
        difficulty: 'HOF',
        moveType: 'PostFade',
        contest: 'Smothered',
      }),
    )
    expect(w).toBe(MIN_WINDOW)
  })
})

describe('monotonicity properties (§8.8)', () => {
  it('window is non-decreasing in rating', () => {
    let prev = 0
    for (let r = 25; r <= 99; r++) {
      const w = computeGreenWindowMs(input({ effectiveRating: r }))
      expect(w).toBeGreaterThanOrEqual(prev)
      prev = w
    }
  })

  it('window is non-increasing as difficulty rises', () => {
    const order: Difficulty[] = ['Rookie', 'SemiPro', 'Pro', 'AllStar', 'Superstar', 'HOF']
    for (let i = 1; i < order.length; i++) {
      const easier = computeGreenWindowMs(input({ difficulty: order[i - 1] }))
      const harder = computeGreenWindowMs(input({ difficulty: order[i] }))
      expect(harder).toBeLessThanOrEqual(easier)
    }
  })

  it('window is non-increasing as contest tightens', () => {
    const order: Contest[] = ['Open', 'Light', 'Heavy', 'Smothered']
    for (let i = 1; i < order.length; i++) {
      const lighter = computeGreenWindowMs(input({ contest: order[i - 1] }))
      const tighter = computeGreenWindowMs(input({ contest: order[i] }))
      expect(tighter).toBeLessThanOrEqual(lighter)
    }
  })

  it('holds across difficulty × contest × rating sweep', () => {
    const difficulties: Difficulty[] = ['Rookie', 'Pro', 'AllStar', 'HOF']
    const contests: Contest[] = ['Open', 'Light', 'Heavy', 'Smothered']
    for (const difficulty of difficulties) {
      for (const contest of contests) {
        let prev = 0
        for (let r = 25; r <= 99; r += 2) {
          const w = computeGreenWindowMs(input({ difficulty, contest, effectiveRating: r }))
          expect(w).toBeGreaterThanOrEqual(prev)
          expect(w).toBeGreaterThanOrEqual(MIN_WINDOW)
          expect(w).toBeLessThanOrEqual(MAX_WINDOW)
          prev = w
        }
      }
    }
  })
})
