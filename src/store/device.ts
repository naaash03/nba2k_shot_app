// Device latency profile (F7.1). Persisted under gr:device.

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { clamp } from '../engine/constants'
import type { DeviceProfile } from '../engine/types'

interface DeviceState {
  profile: DeviceProfile | null
  setProfile: (p: DeviceProfile) => void
  clearProfile: () => void
}

// Touch latency is physically positive; strongly negative saved offsets came
// from anticipatory tapping in early wizard runs and would skew judgments.
function sanitize(p: DeviceProfile | null): DeviceProfile | null {
  return p ? { ...p, deviceOffsetMs: clamp(p.deviceOffsetMs, -40, 160) } : null
}

export const useDevice = create<DeviceState>()(
  persist(
    (set) => ({
      profile: null,
      setProfile: (profile) => set({ profile: sanitize(profile) }),
      clearProfile: () => set({ profile: null }),
    }),
    {
      name: 'gr:device',
      version: 2,
      migrate: (state) => {
        const s = state as DeviceState
        return { ...s, profile: sanitize(s.profile ?? null) }
      },
    },
  ),
)

export function deviceOffsetMs(): number {
  return useDevice.getState().profile?.deviceOffsetMs ?? 0
}
