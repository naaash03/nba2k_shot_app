// App settings (F8) + practice-screen quick context (F2.5).
// Persisted under gr:settings.

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Contest, MoveType } from '../engine/types'

export type MeterStyle = 'comet' | 'ring'
export type Drill = 'free' | 'spot' | 'aroundTheWorld' | 'randomSpot' | 'mixtape'

interface SettingsState {
  meterStyle: MeterStyle
  soundOn: boolean
  hapticsOn: boolean
  leftHanded: boolean
  onboarded: boolean
  installNudgeShown: boolean
  // Simulated context (F2.5) — practice quick settings, not per-build
  meterOn: boolean
  contest: Contest
  fatiguePct: number
  moveType: MoveType
  zoneId: string | null
  drill: Drill
  set: (patch: Partial<SettingsState>) => void
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      meterStyle: 'comet',
      soundOn: false,
      hapticsOn: true,
      leftHanded: false,
      onboarded: false,
      installNudgeShown: false,
      meterOn: true,
      contest: 'Open',
      fatiguePct: 1.0,
      moveType: 'CatchShoot',
      zoneId: null,
      drill: 'free',
      set: (patch) => set(patch),
    }),
    { name: 'gr:settings', version: 1 },
  ),
)
