// Full data export/import (F1.5) — the user's backup against browser
// storage eviction (R10). One JSON file holds everything.

import type { PlayerBuild, DeviceProfile } from '../engine/types'
import { useBuilds } from '../store/builds'
import { useDevice } from '../store/device'
import { useReps } from '../store/reps'

interface BackupFile {
  app: 'greenrep'
  version: 1
  exportedAt: string
  builds: PlayerBuild[]
  activeBuildId: string
  device: DeviceProfile | null
  reps: ReturnType<typeof useReps.getState>['reps']
  lifetime: ReturnType<typeof useReps.getState>['lifetime']
  perZone: ReturnType<typeof useReps.getState>['perZone']
  perMove: ReturnType<typeof useReps.getState>['perMove']
  bestStreakEver: number
  sessions: ReturnType<typeof useReps.getState>['sessions']
}

export function exportAllData(): void {
  const b = useBuilds.getState()
  const r = useReps.getState()
  const backup: BackupFile = {
    app: 'greenrep',
    version: 1,
    exportedAt: new Date().toISOString(),
    builds: b.builds,
    activeBuildId: b.activeBuildId,
    device: useDevice.getState().profile,
    reps: r.reps,
    lifetime: r.lifetime,
    perZone: r.perZone,
    perMove: r.perMove,
    bestStreakEver: r.bestStreakEver,
    sessions: r.sessions,
  }
  const blob = new Blob([JSON.stringify(backup)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `greenrep-backup-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export async function importAllData(file: File): Promise<string> {
  const data = JSON.parse(await file.text()) as BackupFile
  if (data.app !== 'greenrep' || !Array.isArray(data.builds)) {
    throw new Error('Not a GreenRep backup file')
  }
  useBuilds.setState({ builds: data.builds, activeBuildId: data.activeBuildId })
  if (data.device) useDevice.getState().setProfile(data.device)
  useReps.getState().importAll({
    reps: data.reps ?? [],
    lifetime: data.lifetime,
    perZone: data.perZone ?? {},
    perMove: data.perMove ?? {},
    bestStreakEver: data.bestStreakEver ?? 0,
    sessions: data.sessions ?? [],
  })
  return `Restored ${data.builds.length} build(s) and ${data.reps?.length ?? 0} reps`
}
