// Court mode (F5): tap a spot → practice applies the right attribute and
// window penalty. Zones color as a green-rate heat map — your personal
// scouting report.

import { ZONES } from '../../engine/constants'
import { Chip, Segmented } from '../../components/ui'
import { useReps, type AggBucket } from '../../store/reps'
import { useSettings } from '../../store/settings'
import { COURT_H, COURT_W, courtLines, zoneShapes } from './courtGeometry'

function heatColor(bucket: AggBucket | undefined): string {
  if (!bucket || bucket.attempts < 3) return 'rgba(232,236,233,0.04)'
  const rate = bucket.greens / bucket.attempts
  // cold charcoal → warm heat → signal green
  if (rate < 0.25) return 'rgba(232,236,233,0.08)'
  if (rate < 0.5) return 'rgba(255,176,58,0.25)'
  if (rate < 0.7) return 'rgba(255,176,58,0.45)'
  return 'rgba(46,255,110,0.4)'
}

export function CourtSvg({
  activeZone,
  onTapZone,
  heat,
  className = '',
}: {
  activeZone: string | null
  onTapZone?: (zoneId: string) => void
  heat?: Record<string, AggBucket>
  className?: string
}) {
  return (
    <svg
      viewBox={`0 0 ${COURT_W} ${COURT_H}`}
      className={`w-full overflow-hidden rounded-xl border border-court-line bg-court-900 ${className}`}
      role="group"
      aria-label="Half court shot zones"
    >
      {zoneShapes().map(({ zoneId, path }) => (
        <path
          key={zoneId}
          d={path}
          fill={heat ? heatColor(heat[zoneId]) : 'rgba(232,236,233,0.04)'}
          stroke={activeZone === zoneId ? '#2eff6e' : '#2e3a31'}
          strokeWidth={activeZone === zoneId ? 3 : 1}
          onClick={onTapZone ? () => onTapZone(zoneId) : undefined}
          role={onTapZone ? 'button' : undefined}
          aria-label={ZONES[zoneId]?.label ?? zoneId}
          style={onTapZone ? { cursor: 'pointer' } : undefined}
        />
      ))}
      {courtLines().map((d, i) => (
        <path key={i} d={d} fill="none" stroke="#3d4a40" strokeWidth={2} pointerEvents="none" />
      ))}
    </svg>
  )
}

export function CourtScreen({ onGoPractice }: { onGoPractice: () => void }) {
  const settings = useSettings()
  const perZone = useReps((s) => s.perZone)

  const tap = (zoneId: string) => {
    settings.set({
      zoneId,
      // FT spot routes to the FT move profile (F5.5)
      moveType:
        zoneId === 'freeThrow'
          ? 'FreeThrow'
          : settings.moveType === 'FreeThrow'
            ? 'CatchShoot'
            : settings.moveType,
      drill:
        settings.drill === 'aroundTheWorld' || settings.drill === 'randomSpot'
          ? settings.drill
          : 'spot',
    })
  }

  const activeLabel = settings.zoneId ? (ZONES[settings.zoneId]?.label ?? '—') : 'Free shoot'
  const activeBucket = settings.zoneId ? perZone[settings.zoneId] : perZone['free']

  return (
    <div className="space-y-4 px-4 py-4">
      <h2 className="font-display text-xl font-black uppercase tracking-wide">Court</h2>

      <CourtSvg activeZone={settings.zoneId} onTapZone={tap} heat={perZone} />

      <div className="flex items-baseline justify-between">
        <div>
          <p className="font-display text-lg font-bold">{activeLabel}</p>
          <p className="text-xs text-chalk-dim">
            {activeBucket
              ? `${activeBucket.attempts} reps · ${Math.round((activeBucket.greens / activeBucket.attempts) * 100)}% green here`
              : 'No reps here yet'}
          </p>
        </div>
        {settings.zoneId && (
          <Chip onClick={() => settings.set({ zoneId: null, drill: 'free' })}>Clear spot</Chip>
        )}
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-chalk-dim">Drill</p>
        <Segmented
          options={['spot', 'aroundTheWorld', 'randomSpot'] as const}
          value={
            settings.drill === 'aroundTheWorld' || settings.drill === 'randomSpot'
              ? settings.drill
              : 'spot'
          }
          onChange={(drill) => settings.set({ drill })}
          labels={(d) =>
            ({
              spot: 'Spot session',
              aroundTheWorld: 'Around the World',
              randomSpot: 'Random spot',
            })[d]
          }
        />
      </div>

      <button
        type="button"
        onClick={onGoPractice}
        className="w-full rounded-xl border border-green-signal/50 bg-green-signal/10 py-3 font-display text-sm font-bold uppercase tracking-widest text-chalk"
      >
        Shoot from {activeLabel} →
      </button>

      <p className="text-[11px] text-chalk-dim">
        Heat map shades by your green rate per zone (3+ reps). Deep-3 band applies the range penalty
        unless Limitless Range ≥ Gold is equipped.
      </p>
    </div>
  )
}
