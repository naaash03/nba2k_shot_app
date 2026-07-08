// Build manager store (F1): CRUD, active build, duplicate, import.
// Persisted to localStorage under gr:builds (§9 storage layout).

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { PlayerBuild } from '../engine/types'
import { makeDefaultBuild } from './defaultBuild'

function freshId(): string {
  return crypto.randomUUID()
}

interface BuildsState {
  builds: PlayerBuild[]
  activeBuildId: string
  activeBuild: () => PlayerBuild
  addBuild: (build: PlayerBuild) => void
  updateBuild: (id: string, patch: (b: PlayerBuild) => PlayerBuild) => void
  deleteBuild: (id: string) => void
  duplicateBuild: (id: string) => string
  importBuild: (build: PlayerBuild) => string
  setActive: (id: string) => void
}

export const useBuilds = create<BuildsState>()(
  persist(
    (set, get) => ({
      builds: [makeDefaultBuild()],
      activeBuildId: 'default-wing-shooter',

      activeBuild: () => {
        const { builds, activeBuildId } = get()
        return builds.find((b) => b.id === activeBuildId) ?? builds[0] ?? makeDefaultBuild()
      },

      addBuild: (build) => set((s) => ({ builds: [...s.builds, build], activeBuildId: build.id })),

      updateBuild: (id, patch) =>
        set((s) => ({
          builds: s.builds.map((b) =>
            b.id === id ? { ...patch(b), updatedAt: new Date().toISOString() } : b,
          ),
        })),

      deleteBuild: (id) =>
        set((s) => {
          const builds = s.builds.filter((b) => b.id !== id)
          if (builds.length === 0) builds.push(makeDefaultBuild())
          return {
            builds,
            activeBuildId: s.activeBuildId === id ? builds[0].id : s.activeBuildId,
          }
        }),

      duplicateBuild: (id) => {
        const src = get().builds.find((b) => b.id === id)
        const copy: PlayerBuild = {
          ...structuredClone(src ?? makeDefaultBuild()),
          id: freshId(),
          name: `${src?.name ?? 'Build'} (copy)`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
        get().addBuild(copy)
        return copy.id
      },

      importBuild: (build) => {
        // Never trust incoming ids — clashes would silently overwrite.
        const imported = { ...structuredClone(build), id: freshId() }
        get().addBuild(imported)
        return imported.id
      },

      setActive: (id) => set({ activeBuildId: id }),
    }),
    { name: 'gr:builds', version: 1 },
  ),
)
