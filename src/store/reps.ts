// Rep log + incrementally-maintained aggregates (F6). Persisted under gr:reps
// and gr:aggregates. Log is a ring buffer capped at 10k with oldest-eviction;
// lifetime aggregates never require replaying the log (F6.5).

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { RepRecord } from '../engine/types'

export const REP_CAP = 10_000

export interface AggBucket {
  attempts: number
  greens: number
  makes: number
  sumDelta: number
  sumAbsDelta: number
  sumDeltaSq: number
}

export function emptyBucket(): AggBucket {
  return { attempts: 0, greens: 0, makes: 0, sumDelta: 0, sumAbsDelta: 0, sumDeltaSq: 0 }
}

function addToBucket(b: AggBucket, rep: RepRecord): AggBucket {
  return {
    attempts: b.attempts + 1,
    greens: b.greens + (rep.judgment === 'GREEN' ? 1 : 0),
    makes: b.makes + (rep.made ? 1 : 0),
    sumDelta: b.sumDelta + rep.deltaMs,
    sumAbsDelta: b.sumAbsDelta + Math.abs(rep.deltaMs),
    sumDeltaSq: b.sumDeltaSq + rep.deltaMs * rep.deltaMs,
  }
}

export interface SessionSummary extends AggBucket {
  id: string
  startTs: string
  endTs: string
  bestStreak: number
}

interface RepsState {
  reps: RepRecord[]
  lifetime: AggBucket
  perZone: Record<string, AggBucket>
  perMove: Record<string, AggBucket>
  bestStreakEver: number
  /** Closed-session history for the trend chart (capped at 200). */
  sessions: SessionSummary[]
  // Live session (not persisted as history until closed)
  session: SessionSummary | null
  streak: number
  addRep: (rep: RepRecord) => void
  closeSession: () => void
  resetStats: () => void
  importAll: (
    data: Pick<
      RepsState,
      'reps' | 'lifetime' | 'perZone' | 'perMove' | 'bestStreakEver' | 'sessions'
    >,
  ) => void
}

export const useReps = create<RepsState>()(
  persist(
    (set) => ({
      reps: [],
      lifetime: emptyBucket(),
      perZone: {},
      perMove: {},
      bestStreakEver: 0,
      sessions: [],
      session: null,
      streak: 0,

      addRep: (rep) =>
        set((s) => {
          const reps = s.reps.length >= REP_CAP ? [...s.reps.slice(1), rep] : [...s.reps, rep]
          const streak = rep.judgment === 'GREEN' ? s.streak + 1 : 0
          const zoneKey = rep.zoneId ?? 'free'
          const session: SessionSummary = s.session
            ? {
                ...addToBucket(s.session, rep),
                id: s.session.id,
                startTs: s.session.startTs,
                endTs: rep.ts,
                bestStreak: Math.max(s.session.bestStreak, streak),
              }
            : {
                ...addToBucket(emptyBucket(), rep),
                id: crypto.randomUUID(),
                startTs: rep.ts,
                endTs: rep.ts,
                bestStreak: streak,
              }
          return {
            reps,
            streak,
            session,
            lifetime: addToBucket(s.lifetime, rep),
            perZone: {
              ...s.perZone,
              [zoneKey]: addToBucket(s.perZone[zoneKey] ?? emptyBucket(), rep),
            },
            perMove: {
              ...s.perMove,
              [rep.moveType]: addToBucket(s.perMove[rep.moveType] ?? emptyBucket(), rep),
            },
            bestStreakEver: Math.max(s.bestStreakEver, streak),
          }
        }),

      closeSession: () =>
        set((s) => {
          if (!s.session || s.session.attempts === 0) return { session: null, streak: 0 }
          return {
            sessions: [...s.sessions.slice(-199), s.session],
            session: null,
            streak: 0,
          }
        }),

      resetStats: () =>
        set({
          reps: [],
          lifetime: emptyBucket(),
          perZone: {},
          perMove: {},
          bestStreakEver: 0,
          sessions: [],
          session: null,
          streak: 0,
        }),

      importAll: (data) => set({ ...data, session: null, streak: 0 }),
    }),
    { name: 'gr:reps', version: 1 },
  ),
)

/** Mean signed Δ over the last `n` reps — the bias stat (F6.4). */
export function recentBiasMs(n = 50): { bias: number; count: number } {
  const reps = useReps.getState().reps.slice(-n)
  if (reps.length === 0) return { bias: 0, count: 0 }
  return { bias: reps.reduce((a, r) => a + r.deltaMs, 0) / reps.length, count: reps.length }
}
