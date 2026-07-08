// Seed data: Default Build (spec Appendix A) — the app is usable in 5 seconds.

import type { PlayerBuild } from '../engine/types'

export function makeDefaultBuild(): PlayerBuild {
  const ts = new Date().toISOString()
  return {
    id: 'default-wing-shooter',
    name: 'Default — Wing Shooter',
    heightLabel: `6'8"`,
    position: 'SF',
    schemaVersion: 1,
    gameVersionTag: '2K26-S5',
    jumpshot: {
      baseName: '(enter yours)',
      upperRelease1: '(enter yours)',
      upperRelease2: '(enter yours)',
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
      Deadeye: 'Silver',
      CatchAndShoot: 'Gold',
      LimitlessRange: 'Off',
      SetShotSpecialist: 'Bronze',
      GreenMachine: 'Off',
    },
    difficulty: 'AllStar',
    timing: {
      idealReleaseMs: 550,
      calibratedAtSpeedPct: 100,
      calibratedAtCue: 'SetPoint',
      userTrimMs: 0,
      perMoveOverrides: {},
      calibration: { method: 'default', date: '', confidenceLabel: 'uncalibrated' },
    },
    createdAt: ts,
    updatedAt: ts,
  }
}
