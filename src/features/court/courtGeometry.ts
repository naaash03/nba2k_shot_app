// Half-court geometry (F5.1): portrait, hoop at top, 10px per foot.
// ViewBox 500×470. The 14 hot zones + deep-3 ring + free-throw circle are
// annular sectors around the hoop — the same polar math drives both tap
// detection and rendered paths, so they can never disagree.

export const COURT_W = 500
export const COURT_H = 470
export const HOOP = { x: 250, y: 52.5 }
const FT_CENTER = { x: 250, y: 190 }
const FT_R = 60

const R_UNDER = 45
const R_CLOSE = 105
const R_THREE = 237.5
const R_DEEP = 270
const R_OUTER = 335

interface Sector {
  zoneId: string
  a0: number // degrees; 0 = right baseline, 90 = straight down-court, 180 = left baseline
  a1: number
  r0: number
  r1: number
}

const SECTORS: Sector[] = [
  { zoneId: 'closeR', a0: 0, a1: 60, r0: R_UNDER, r1: R_CLOSE },
  { zoneId: 'closeC', a0: 60, a1: 120, r0: R_UNDER, r1: R_CLOSE },
  { zoneId: 'closeL', a0: 120, a1: 180, r0: R_UNDER, r1: R_CLOSE },
  { zoneId: 'midR', a0: 0, a1: 36, r0: R_CLOSE, r1: R_THREE },
  { zoneId: 'midRC', a0: 36, a1: 72, r0: R_CLOSE, r1: R_THREE },
  { zoneId: 'midC', a0: 72, a1: 108, r0: R_CLOSE, r1: R_THREE },
  { zoneId: 'midLC', a0: 108, a1: 144, r0: R_CLOSE, r1: R_THREE },
  { zoneId: 'midL', a0: 144, a1: 180, r0: R_CLOSE, r1: R_THREE },
  { zoneId: 'threeCornerR', a0: 0, a1: 30, r0: R_THREE, r1: R_DEEP },
  { zoneId: 'threeWingR', a0: 30, a1: 70, r0: R_THREE, r1: R_DEEP },
  { zoneId: 'threeTop', a0: 70, a1: 110, r0: R_THREE, r1: R_DEEP },
  { zoneId: 'threeWingL', a0: 110, a1: 150, r0: R_THREE, r1: R_DEEP },
  { zoneId: 'threeCornerL', a0: 150, a1: 180, r0: R_THREE, r1: R_DEEP },
  { zoneId: 'deep3', a0: 0, a1: 180, r0: R_DEEP, r1: R_OUTER },
]

function polar(r: number, deg: number): { x: number; y: number } {
  const rad = (deg * Math.PI) / 180
  return { x: HOOP.x + r * Math.cos(rad), y: HOOP.y + r * Math.sin(rad) }
}

function annularSectorPath(s: Sector): string {
  const p1 = polar(s.r0, s.a0)
  const p2 = polar(s.r1, s.a0)
  const p3 = polar(s.r1, s.a1)
  const p4 = polar(s.r0, s.a1)
  const large = s.a1 - s.a0 > 180 ? 1 : 0
  return [
    `M ${p1.x.toFixed(1)} ${p1.y.toFixed(1)}`,
    `L ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`,
    `A ${s.r1} ${s.r1} 0 ${large} 1 ${p3.x.toFixed(1)} ${p3.y.toFixed(1)}`,
    `L ${p4.x.toFixed(1)} ${p4.y.toFixed(1)}`,
    `A ${s.r0} ${s.r0} 0 ${large} 0 ${p1.x.toFixed(1)} ${p1.y.toFixed(1)}`,
    'Z',
  ].join(' ')
}

export interface ZoneShape {
  zoneId: string
  path: string
}

/** Every tappable zone as an SVG path (sectors + the two circles). */
export function zoneShapes(): ZoneShape[] {
  const circle = (cx: number, cy: number, r: number) =>
    `M ${cx - r} ${cy} a ${r} ${r} 0 1 0 ${r * 2} 0 a ${r} ${r} 0 1 0 ${-r * 2} 0 Z`
  return [
    { zoneId: 'underBasket', path: circle(HOOP.x, HOOP.y, R_UNDER) },
    ...SECTORS.map((s) => ({ zoneId: s.zoneId, path: annularSectorPath(s) })),
    { zoneId: 'freeThrow', path: circle(FT_CENTER.x, FT_CENTER.y, FT_R) },
  ]
}

/** Zone under a court-space point — mirrors the rendered shapes exactly. */
export function zoneAt(x: number, y: number): string | null {
  // FT circle wins over the mid sectors it overlaps (F5.5).
  if (Math.hypot(x - FT_CENTER.x, y - FT_CENTER.y) <= FT_R) return 'freeThrow'
  const dx = x - HOOP.x
  const dy = y - HOOP.y
  const r = Math.hypot(dx, dy)
  if (r <= R_UNDER) return 'underBasket'
  let a = (Math.atan2(dy, dx) * 180) / Math.PI
  if (a < 0) a = 0 // behind the baseline → clamp to baseline angle
  for (const s of SECTORS) {
    if (r > s.r0 && r <= s.r1 && a >= s.a0 && a <= s.a1) return s.zoneId
  }
  return r > R_OUTER ? 'deep3' : null
}

/** Static court furniture (paint, FT circle, 3pt line, corner lines). */
export function courtLines(): string[] {
  const cornerY = HOOP.y + Math.sqrt(R_THREE ** 2 - 220 ** 2) // where corner line meets the arc
  const arcStart = polar(R_THREE, (Math.atan2(cornerY - HOOP.y, 220) * 180) / Math.PI)
  return [
    // paint
    `M 170 0 L 170 190 L 330 190 L 330 0`,
    // FT circle
    `M ${FT_CENTER.x - FT_R} ${FT_CENTER.y} a ${FT_R} ${FT_R} 0 1 0 ${FT_R * 2} 0 a ${FT_R} ${FT_R} 0 1 0 ${-FT_R * 2} 0`,
    // corner 3 lines
    `M 30 0 L 30 ${cornerY.toFixed(1)}`,
    `M 470 0 L 470 ${cornerY.toFixed(1)}`,
    // 3pt arc between the corner lines
    `M ${(HOOP.x - 220).toFixed(1)} ${cornerY.toFixed(1)} A ${R_THREE} ${R_THREE} 0 0 0 ${arcStart.x.toFixed(1)} ${arcStart.y.toFixed(1)}`,
    // rim + backboard
    `M 235 40 L 265 40`,
    `M 250 47 a 7.5 7.5 0 1 0 0.01 0`,
  ]
}
