// Device latency profile (F7.1). Persisted under gr:device.

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { DeviceProfile } from '../engine/types'

interface DeviceState {
  profile: DeviceProfile | null
  setProfile: (p: DeviceProfile) => void
  clearProfile: () => void
}

export const useDevice = create<DeviceState>()(
  persist(
    (set) => ({
      profile: null,
      setProfile: (profile) => set({ profile }),
      clearProfile: () => set({ profile: null }),
    }),
    { name: 'gr:device', version: 1 },
  ),
)

export function deviceOffsetMs(): number {
  return useDevice.getState().profile?.deviceOffsetMs ?? 0
}
