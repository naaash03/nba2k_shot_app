// Canvas meter (§8.6). A visualization of the timeline — never the timeline.
// Position is a pure function of wall-clock time (invariant #2); the rAF loop
// reads refs and never touches React state. Two styles (§11.4): Vertical
// Comet and Ring, both consuming the same timeline function.

import { useEffect, useRef } from 'react'
import { LATE_CUTOFF } from '../../engine/constants'
import type { ResolvedBuildTiming } from '../../engine/types'
import type { MeterStyle } from '../../store/settings'
import type { ShotPhase } from './useShotMachine'

const COLORS = {
  track: '#1a231c',
  trackEdge: '#2e3a31',
  band: 'rgba(46, 255, 110, 0.28)',
  bandEdge: '#2eff6e',
  comet: '#e8ece9',
  cometLate: '#ffb03a',
  notch: '#2eff6e',
}

interface MeterProps {
  timing: ResolvedBuildTiming
  meterVisible: boolean
  style: MeterStyle
  phaseRef: React.RefObject<ShotPhase>
  shotStartRef: React.RefObject<number>
  releaseElapsedRef: React.RefObject<number>
  phase: ShotPhase // re-render trigger only; drawing reads refs
}

export function Meter({
  timing,
  meterVisible,
  style,
  phaseRef,
  shotStartRef,
  releaseElapsedRef,
  phase,
}: MeterProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const timingRef = useRef(timing)
  timingRef.current = timing
  const styleRef = useRef(style)
  styleRef.current = style
  const visibleRef = useRef(meterVisible)
  visibleRef.current = meterVisible

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = Math.min(window.devicePixelRatio || 1, 3)
    const cssW = canvas.clientWidth
    const cssH = canvas.clientHeight
    canvas.width = Math.round(cssW * dpr)
    canvas.height = Math.round(cssH * dpr)
    ctx.scale(dpr, dpr)

    let raf = 0

    const draw = () => {
      const t = timingRef.current
      const totalMs = t.idealMs + LATE_CUTOFF
      const ph = phaseRef.current
      const elapsed =
        ph === 'WINDUP'
          ? performance.now() - shotStartRef.current
          : ph === 'JUDGED'
            ? releaseElapsedRef.current
            : 0
      const progress = Math.min(elapsed / totalMs, 1)
      const idealPos = t.idealMs / totalMs
      const bandHalf = t.greenWindowMs / 2 / totalMs

      ctx.clearRect(0, 0, cssW, cssH)
      if (visibleRef.current) {
        if (styleRef.current === 'comet')
          drawComet(ctx, cssW, cssH, progress, idealPos, bandHalf, ph)
        else drawRing(ctx, cssW, cssH, progress, idealPos, bandHalf, ph)
      } else {
        drawMeterOff(ctx, cssW, cssH, ph)
      }

      // Loop is alive only during WINDUP/JUDGED (§8.6).
      if (phaseRef.current !== 'IDLE') raf = requestAnimationFrame(draw)
    }

    draw() // paint once for the current phase (incl. static IDLE frame)
    return () => cancelAnimationFrame(raf)
  }, [phase, timing, style, meterVisible, phaseRef, shotStartRef, releaseElapsedRef])

  return <canvas ref={canvasRef} className="h-full w-full" aria-label="Shot meter" role="img" />
}

function drawComet(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  progress: number,
  idealPos: number,
  bandHalf: number,
  phase: ShotPhase,
) {
  const trackW = Math.min(w * 0.28, 64)
  const x = (w - trackW) / 2
  const pad = 10
  const trackH = h - pad * 2
  const yOf = (p: number) => pad + trackH * (1 - p) // fills upward

  // track
  roundRect(ctx, x, pad, trackW, trackH, trackW / 2)
  ctx.fillStyle = COLORS.track
  ctx.fill()
  ctx.strokeStyle = COLORS.trackEdge
  ctx.lineWidth = 1
  ctx.stroke()

  // green band, drawn to scale (§8.6)
  const bandTop = yOf(idealPos + bandHalf)
  const bandBot = yOf(idealPos - bandHalf)
  ctx.fillStyle = COLORS.band
  ctx.fillRect(x + 2, bandTop, trackW - 4, bandBot - bandTop)

  // set-point notch
  const notchY = yOf(idealPos)
  ctx.strokeStyle = COLORS.notch
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(x - 8, notchY)
  ctx.lineTo(x + trackW + 8, notchY)
  ctx.stroke()

  if (phase === 'IDLE') return

  // comet fill + head
  const headY = yOf(progress)
  const late = progress > idealPos + bandHalf
  const grad = ctx.createLinearGradient(0, yOf(0), 0, headY)
  grad.addColorStop(0, 'rgba(232,236,233,0.15)')
  grad.addColorStop(1, late ? COLORS.cometLate : COLORS.comet)
  roundRect(ctx, x + 4, headY, trackW - 8, yOf(0) - headY, (trackW - 8) / 2)
  ctx.fillStyle = grad
  ctx.fill()

  ctx.beginPath()
  ctx.arc(x + trackW / 2, headY, trackW / 2 - 2, 0, Math.PI * 2)
  ctx.fillStyle = late ? COLORS.cometLate : COLORS.comet
  ctx.fill()
}

function drawRing(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  progress: number,
  idealPos: number,
  bandHalf: number,
  phase: ShotPhase,
) {
  const cx = w / 2
  const cy = h / 2
  const r = Math.min(w, h) / 2 - 14
  const start = -Math.PI / 2 // 12 o'clock
  const angleOf = (p: number) => start + p * Math.PI * 2

  ctx.lineCap = 'round'

  // track
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.strokeStyle = COLORS.track
  ctx.lineWidth = 14
  ctx.stroke()

  // green band
  ctx.beginPath()
  ctx.arc(cx, cy, r, angleOf(idealPos - bandHalf), angleOf(idealPos + bandHalf))
  ctx.strokeStyle = COLORS.bandEdge
  ctx.globalAlpha = 0.45
  ctx.lineWidth = 14
  ctx.stroke()
  ctx.globalAlpha = 1

  // set-point tick
  const na = angleOf(idealPos)
  ctx.beginPath()
  ctx.moveTo(cx + Math.cos(na) * (r - 12), cy + Math.sin(na) * (r - 12))
  ctx.lineTo(cx + Math.cos(na) * (r + 12), cy + Math.sin(na) * (r + 12))
  ctx.strokeStyle = COLORS.notch
  ctx.lineWidth = 3
  ctx.stroke()

  if (phase === 'IDLE') return

  // sweep
  const late = progress > idealPos + bandHalf
  ctx.beginPath()
  ctx.arc(cx, cy, r, start, angleOf(progress))
  ctx.strokeStyle = late ? COLORS.cometLate : COLORS.comet
  ctx.lineWidth = 8
  ctx.stroke()

  // head dot
  const ha = angleOf(progress)
  ctx.beginPath()
  ctx.arc(cx + Math.cos(ha) * r, cy + Math.sin(ha) * r, 9, 0, Math.PI * 2)
  ctx.fillStyle = late ? COLORS.cometLate : COLORS.comet
  ctx.fill()
}

/** Meter-off training mode (F8.1): a quiet pulse while holding, no timeline shown. */
function drawMeterOff(ctx: CanvasRenderingContext2D, w: number, h: number, phase: ShotPhase) {
  const cx = w / 2
  const cy = h / 2
  ctx.beginPath()
  ctx.arc(cx, cy, 6, 0, Math.PI * 2)
  ctx.fillStyle = phase === 'WINDUP' ? COLORS.comet : COLORS.trackEdge
  ctx.fill()
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const rad = Math.min(r, Math.abs(h) / 2, w / 2)
  ctx.beginPath()
  ctx.moveTo(x + rad, y)
  ctx.arcTo(x + w, y, x + w, y + h, rad)
  ctx.arcTo(x + w, y + h, x, y + h, rad)
  ctx.arcTo(x, y + h, x, y, rad)
  ctx.arcTo(x, y, x + w, y, rad)
  ctx.closePath()
}
