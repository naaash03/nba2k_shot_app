// Resolution math tests (spec §8.5, §8.8): release-speed scaling, cue offsets,
// trim, per-move overrides, changed-settings flag.

import { describe, expect, it } from 'vitest'
import { T1, T2 } from '../../src/engine/constants'
import {
  attributeForShot,
  effectiveRating,
  resolveBuild,
  resolveIdealMs,
  settingsChangedSinceCalibration,
} from '../../src/engine/resolve'
import { computeGreenWindowMs } from '../../src/engine/window'
import { makeBuild, makeContext } from './helpers'

describe('effectiveRating (§3.5)', () => {
  it('sums base + cap breaker', () => {
    expect(effectiveRating({ base: 88, capBreaker: 3 })).toBe(91)
  })
  it('caps at 99', () => {
    expect(effectiveRating({ base: 96, capBreaker: 10 })).toBe(99)
  })
})

describe('attributeForShot (§10.3)', () => {
  it('free-throw move always uses the FT attribute', () => {
    expect(attributeForShot(makeContext({ moveType: 'FreeThrow', zoneId: 'midC' }))).toBe(
      'freeThrow',
    )
  })
  it('null zone (free shoot) defaults to three', () => {
    expect(attributeForShot(makeContext({ zoneId: null }))).toBe('three')
  })
  it('maps zones to their attribute', () => {
    expect(attributeForShot(makeContext({ zoneId: 'underBasket' }))).toBe('close')
    expect(attributeForShot(makeContext({ zoneId: 'midRC' }))).toBe('mid')
    expect(attributeForShot(makeContext({ zoneId: 'threeCornerL' }))).toBe('three')
    expect(attributeForShot(makeContext({ zoneId: 'deep3' }))).toBe('three')
    expect(attributeForShot(makeContext({ zoneId: 'freeThrow' }))).toBe('freeThrow')
  })
  it('unknown zones fall back to three', () => {
    expect(attributeForShot(makeContext({ zoneId: 'nope' }))).toBe('three')
  })
})

describe('resolveIdealMs (§8.5)', () => {
  it('is the calibrated value when settings match calibration', () => {
    expect(resolveIdealMs(makeBuild(), makeContext())).toBe(550)
  })

  it('scales when release speed is slowed after calibration (100% → 50%)', () => {
    const build = makeBuild({ jumpshot: { releaseSpeedPct: 50 } })
    expect(resolveIdealMs(build, makeContext())).toBeCloseTo(550 * 1.13, 10)
  })

  it('scales relative to the calibrated speed (calibrated at 75%, now 100%)', () => {
    const build = makeBuild({
      jumpshot: { releaseSpeedPct: 100 },
      timing: { calibratedAtSpeedPct: 75 },
    })
    expect(resolveIdealMs(build, makeContext())).toBeCloseTo(550 / 1.06, 10)
  })

  it('shifts by the cue delta when the visual cue changes (SetPoint → Release = +90)', () => {
    const build = makeBuild({ jumpshot: { visualCue: 'Release' } })
    expect(resolveIdealMs(build, makeContext())).toBeCloseTo(550 + 90, 10)
  })

  it('shifts earlier for an earlier cue (SetPoint → Jump = −70)', () => {
    const build = makeBuild({ jumpshot: { visualCue: 'Jump' } })
    expect(resolveIdealMs(build, makeContext())).toBeCloseTo(550 - 70, 10)
  })

  it('applies the user trim (F7.3)', () => {
    const build = makeBuild({ timing: { userTrimMs: -12 } })
    expect(resolveIdealMs(build, makeContext())).toBe(538)
  })

  it('derives move timing from the base jumper until calibrated (F4.2)', () => {
    expect(resolveIdealMs(makeBuild(), makeContext({ moveType: 'Stepback' }))).toBeCloseTo(
      550 * 1.1,
      10,
    )
    expect(resolveIdealMs(makeBuild(), makeContext({ moveType: 'FreeThrow' }))).toBeCloseTo(
      550 * 0.95,
      10,
    )
  })

  it('per-move override replaces the derived default', () => {
    const build = makeBuild({ timing: { perMoveOverrides: { Stepback: 640 } } })
    expect(resolveIdealMs(build, makeContext({ moveType: 'Stepback' }))).toBe(640)
  })

  it('trim still applies on top of a per-move override', () => {
    const build = makeBuild({
      timing: { perMoveOverrides: { Stepback: 640 }, userTrimMs: 4 },
    })
    expect(resolveIdealMs(build, makeContext({ moveType: 'Stepback' }))).toBe(644)
  })
})

describe('settingsChangedSinceCalibration (§8.5)', () => {
  it('false when settings match calibration', () => {
    expect(settingsChangedSinceCalibration(makeBuild())).toBe(false)
  })
  it('true when release speed changed', () => {
    expect(settingsChangedSinceCalibration(makeBuild({ jumpshot: { releaseSpeedPct: 75 } }))).toBe(
      true,
    )
  })
  it('true when visual cue changed', () => {
    expect(settingsChangedSinceCalibration(makeBuild({ jumpshot: { visualCue: 'Push' } }))).toBe(
      true,
    )
  })
})

describe('resolveBuild (§8.2)', () => {
  it('assembles ideal, window, whites flag, and tier boundaries', () => {
    const build = makeBuild()
    const context = makeContext()
    const resolved = resolveBuild(build, context)

    expect(resolved.idealMs).toBe(550)
    expect(resolved.greenWindowMs).toBeCloseTo(40.26, 10) // §8.4 worked example
    expect(resolved.whitesAllowed).toBe(false) // All-Star
    expect(resolved.effectiveRating).toBe(88)
    expect(resolved.tierBoundaries.greenHalfMs).toBeCloseTo(20.13, 10)
    expect(resolved.tierBoundaries.t1EdgeMs).toBeCloseTo(20.13 + T1, 10)
    expect(resolved.tierBoundaries.t2EdgeMs).toBeCloseTo(20.13 + T2, 10)
    expect(resolved.settingsChangedSinceCalibration).toBe(false)
  })

  it('whitesAllowed on Rookie / Semi-Pro / Pro only', () => {
    expect(resolveBuild(makeBuild({ difficulty: 'Rookie' }), makeContext()).whitesAllowed).toBe(
      true,
    )
    expect(resolveBuild(makeBuild({ difficulty: 'SemiPro' }), makeContext()).whitesAllowed).toBe(
      true,
    )
    expect(resolveBuild(makeBuild({ difficulty: 'Pro' }), makeContext()).whitesAllowed).toBe(true)
    expect(resolveBuild(makeBuild({ difficulty: 'Superstar' }), makeContext()).whitesAllowed).toBe(
      false,
    )
    expect(resolveBuild(makeBuild({ difficulty: 'HOF' }), makeContext()).whitesAllowed).toBe(false)
  })

  it('feeds the zone-mapped attribute into the window (mid zone uses 82 Mid, not 88 Three)', () => {
    const resolved = resolveBuild(makeBuild(), makeContext({ zoneId: 'midC' }))
    expect(resolved.effectiveRating).toBe(82)
    expect(resolved.greenWindowMs).toBeCloseTo(
      computeGreenWindowMs({
        effectiveRating: 82,
        difficulty: 'AllStar',
        moveType: 'CatchShoot',
        zoneId: 'midC',
        badges: makeBuild().badges,
        contest: 'Open',
        fatiguePct: 1,
        meterOn: true,
        greenStreak: 0,
      }),
      10,
    )
  })

  it('cap breakers raise the effective rating in the window math', () => {
    const boosted = resolveBuild(
      makeBuild({ attributes: { three: { base: 88, capBreaker: 5 } } }),
      makeContext(),
    )
    const stock = resolveBuild(makeBuild(), makeContext())
    expect(boosted.effectiveRating).toBe(93)
    expect(boosted.greenWindowMs).toBeGreaterThan(stock.greenWindowMs)
  })

  it('defaults greenStreak to 0 when absent', () => {
    const context = makeContext()
    delete context.greenStreak
    const withBadge = makeBuild({ badges: { GreenMachine: 'Gold' } })
    expect(resolveBuild(withBadge, context).greenWindowMs).toBeCloseTo(40.26, 10)
  })
})
