// Whites make-probability tests (spec §10.2).

import { describe, expect, it } from 'vitest'
import { WHITES_MAX_P } from '../../src/engine/constants'
import { whitesProbability } from '../../src/engine/whites'
import type { Contest, Difficulty, Judgment } from '../../src/engine/types'

describe('whitesProbability', () => {
  it('honors the §10.2 table at 99 rating, open (rating modifier = 1.0)', () => {
    expect(whitesProbability('SLIGHTLY_LATE', 'Rookie', 99, 'Open')).toBeCloseTo(0.55, 10)
    expect(whitesProbability('SLIGHTLY_EARLY', 'SemiPro', 99, 'Open')).toBeCloseTo(0.45, 10)
    expect(whitesProbability('SLIGHTLY_LATE', 'Pro', 99, 'Open')).toBeCloseTo(0.32, 10)
    expect(whitesProbability('EARLY', 'Rookie', 99, 'Open')).toBeCloseTo(0.25, 10)
    expect(whitesProbability('LATE', 'SemiPro', 99, 'Open')).toBeCloseTo(0.18, 10)
    expect(whitesProbability('EARLY', 'Pro', 99, 'Open')).toBeCloseTo(0.1, 10)
  })

  it('applies the rating modifier ×(0.6 + 0.4·rating/99)', () => {
    // rating 66 → 0.6 + 0.4×(66/99) = 0.8667
    expect(whitesProbability('SLIGHTLY_LATE', 'Rookie', 66, 'Open')).toBeCloseTo(
      0.55 * (0.6 + 0.4 * (66 / 99)),
      10,
    )
  })

  it('applies the contest white factor', () => {
    expect(whitesProbability('SLIGHTLY_LATE', 'Rookie', 99, 'Light')).toBeCloseTo(0.55 * 0.75, 10)
    expect(whitesProbability('SLIGHTLY_LATE', 'Rookie', 99, 'Heavy')).toBeCloseTo(0.55 * 0.4, 10)
    expect(whitesProbability('SLIGHTLY_LATE', 'Rookie', 99, 'Smothered')).toBeCloseTo(
      0.55 * 0.15,
      10,
    )
  })

  it('returns 0 on All-Star and above', () => {
    for (const d of ['AllStar', 'Superstar', 'HOF'] as const) {
      expect(whitesProbability('SLIGHTLY_LATE', d, 99, 'Open')).toBe(0)
    }
  })

  it('returns 0 for greens and very-early/late tiers', () => {
    for (const j of ['GREEN', 'VERY_EARLY', 'VERY_LATE'] as const) {
      expect(whitesProbability(j, 'Rookie', 99, 'Open')).toBe(0)
    }
  })

  it('stays within [0, WHITES_MAX_P] across the full input space', () => {
    const judgments: Judgment[] = ['SLIGHTLY_EARLY', 'SLIGHTLY_LATE', 'EARLY', 'LATE']
    const difficulties: Difficulty[] = ['Rookie', 'SemiPro', 'Pro']
    const contests: Contest[] = ['Open', 'Light', 'Heavy', 'Smothered']
    for (const j of judgments) {
      for (const d of difficulties) {
        for (const c of contests) {
          for (let r = 25; r <= 99; r += 5) {
            const p = whitesProbability(j, d, r, c)
            expect(p).toBeGreaterThanOrEqual(0)
            expect(p).toBeLessThanOrEqual(WHITES_MAX_P)
          }
        }
      }
    }
  })
})
