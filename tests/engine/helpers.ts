// Shared test fixtures for the engine matrix (spec §8.8).

import type { PlayerBuild, Rng, ShotContext } from '../../src/engine/types'

/** Deterministic seedable RNG (mulberry32) — spec §8.8 "RNG injected as a seedable dependency". */
export function seededRng(seed: number): Rng {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] }

/** The §8.4 worked-example build: 88 3PT, All-Star, calibrated 550ms at 100%/SetPoint. */
export function makeBuild(overrides: DeepPartial<PlayerBuild> = {}): PlayerBuild {
  const base: PlayerBuild = {
    id: 'test-build',
    name: 'Test Wing Shooter',
    schemaVersion: 1,
    gameVersionTag: '2K26-S5',
    jumpshot: {
      baseName: 'Test Base',
      upperRelease1: 'Test Upper 1',
      upperRelease2: 'Test Upper 2',
      blendPct: 50,
      releaseSpeedPct: 100,
      visualCue: 'SetPoint',
    },
    attributes: {
      close: { base: 70, capBreaker: 0 },
      mid: { base: 82, capBreaker: 0 },
      three: { base: 88, capBreaker: 0 },
      freeThrow: { base: 78, capBreaker: 0 },
    },
    badges: {
      LimitlessRange: 'Off',
      Deadeye: 'Off',
      SetShotSpecialist: 'Off',
      CatchAndShoot: 'Off',
      GreenMachine: 'Off',
    },
    difficulty: 'AllStar',
    timing: {
      idealReleaseMs: 550,
      calibratedAtSpeedPct: 100,
      calibratedAtCue: 'SetPoint',
      userTrimMs: 0,
      perMoveOverrides: {},
      calibration: { method: 'direct', date: '2026-07-08', confidenceLabel: 'test' },
    },
    createdAt: '2026-07-08T00:00:00Z',
    updatedAt: '2026-07-08T00:00:00Z',
  }
  return {
    ...base,
    ...overrides,
    jumpshot: { ...base.jumpshot, ...overrides.jumpshot },
    attributes: {
      close: { ...base.attributes.close, ...overrides.attributes?.close },
      mid: { ...base.attributes.mid, ...overrides.attributes?.mid },
      three: { ...base.attributes.three, ...overrides.attributes?.three },
      freeThrow: { ...base.attributes.freeThrow, ...overrides.attributes?.freeThrow },
    },
    badges: { ...base.badges, ...(overrides.badges as PlayerBuild['badges']) },
    timing: {
      ...base.timing,
      ...overrides.timing,
      perMoveOverrides: {
        ...base.timing.perMoveOverrides,
        ...overrides.timing?.perMoveOverrides,
      },
      calibration: { ...base.timing.calibration, ...overrides.timing?.calibration },
    },
  } as PlayerBuild
}

/** Open catch-and-shoot, free shoot (no zone), fresh, meter on — the §8.4 context. */
export function makeContext(overrides: Partial<ShotContext> = {}): ShotContext {
  return {
    moveType: 'CatchShoot',
    zoneId: null,
    contest: 'Open',
    fatiguePct: 1.0,
    meterOn: true,
    greenStreak: 0,
    ...overrides,
  }
}
