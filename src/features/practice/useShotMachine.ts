// Shot state machine (§8.1) + input pipeline (§8.7).
// IDLE ─pointerdown→ WINDUP ─pointerup→ JUDGED ─400ms→ IDLE
// pointercancel / page hidden → VOID → IDLE
// held past ideal + LATE_CUTOFF → JUDGED (VERY_LATE dead rep)
//
// Invariant #1: judgment comes from event timestamps, never render frames.

import { useCallback, useEffect, useRef, useState } from 'react'
import { LATE_CUTOFF } from '../../engine/constants'
import { judgeShot } from '../../engine/judgment'
import type { Contest, ResolvedBuildTiming, ShotVerdict } from '../../engine/types'
import { eventTime } from '../../lib/time'

export type ShotPhase = 'IDLE' | 'WINDUP' | 'JUDGED'

/** TUNABLE — auto-rearm delay after a verdict (F3.4). */
export const REARM_MS = 400

export interface RepResult {
  verdict: ShotVerdict
  rawHoldMs: number
  deviceOffsetMsApplied: number
}

export function useShotMachine(
  timing: ResolvedBuildTiming,
  contest: Contest,
  deviceOffsetMs: number,
  onRep: (result: RepResult) => void,
) {
  // Hot-path state lives in refs — React state is only touched once per rep (§8.6).
  const phaseRef = useRef<ShotPhase>('IDLE')
  const shotStartRef = useRef(0)
  const releaseElapsedRef = useRef(0)
  const pointerIdRef = useRef<number | null>(null)
  const rearmTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const deadlineTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [verdict, setVerdict] = useState<ShotVerdict | null>(null)
  const [phase, setPhase] = useState<ShotPhase>('IDLE')

  // Latest props for stable handlers.
  const timingRef = useRef(timing)
  timingRef.current = timing
  const contestRef = useRef(contest)
  contestRef.current = contest
  const offsetRef = useRef(deviceOffsetMs)
  offsetRef.current = deviceOffsetMs
  const onRepRef = useRef(onRep)
  onRepRef.current = onRep

  const clearTimers = () => {
    if (rearmTimer.current) clearTimeout(rearmTimer.current)
    if (deadlineTimer.current) clearTimeout(deadlineTimer.current)
    rearmTimer.current = null
    deadlineTimer.current = null
  }

  const toIdle = useCallback(() => {
    phaseRef.current = 'IDLE'
    pointerIdRef.current = null
    setPhase('IDLE')
  }, [])

  const judge = useCallback(
    (rawHoldMs: number) => {
      if (phaseRef.current !== 'WINDUP') return
      if (deadlineTimer.current) clearTimeout(deadlineTimer.current)
      const offset = offsetRef.current
      const v = judgeShot(
        {
          holdDurationMs: rawHoldMs - offset,
          build: timingRef.current,
          contest: contestRef.current,
        },
        Math.random,
      )
      releaseElapsedRef.current = rawHoldMs
      phaseRef.current = 'JUDGED'
      setPhase('JUDGED')
      setVerdict(v)
      onRepRef.current({ verdict: v, rawHoldMs, deviceOffsetMsApplied: offset })
      rearmTimer.current = setTimeout(toIdle, REARM_MS)
    },
    [toIdle],
  )

  const voidRep = useCallback(() => {
    if (phaseRef.current !== 'WINDUP') return
    clearTimers()
    toIdle()
  }, [toIdle])

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (phaseRef.current !== 'IDLE') return
      pointerIdRef.current = e.pointerId
      shotStartRef.current = eventTime(e)
      phaseRef.current = 'WINDUP'
      setPhase('WINDUP')
      setVerdict(null)
      // Dead-rep deadline (F3.5): judged from the deterministic timeline, not the timer's firing time.
      const deadline = timingRef.current.idealMs + LATE_CUTOFF
      deadlineTimer.current = setTimeout(() => judge(deadline + 1), deadline + 15)
    },
    [judge],
  )

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (phaseRef.current !== 'WINDUP' || e.pointerId !== pointerIdRef.current) return
      judge(eventTime(e) - shotStartRef.current)
    },
    [judge],
  )

  const onPointerCancel = useCallback(
    (e: React.PointerEvent) => {
      if (e.pointerId !== pointerIdRef.current) return
      voidRep()
    },
    [voidRep],
  )

  // Mid-windup tab switch / screen off → void the rep (§8.6).
  useEffect(() => {
    const onHide = () => {
      if (document.hidden) voidRep()
    }
    document.addEventListener('visibilitychange', onHide)
    return () => document.removeEventListener('visibilitychange', onHide)
  }, [voidRep])

  useEffect(() => clearTimers, [])

  return {
    phase,
    phaseRef,
    shotStartRef,
    releaseElapsedRef,
    verdict,
    handlers: { onPointerDown, onPointerUp, onPointerCancel },
  }
}
