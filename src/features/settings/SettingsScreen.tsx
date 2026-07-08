// Settings (F8) + help (F10.2) + danger zone + data durability (F1.5, R10).

import { useRef, useState } from 'react'
import { hapticsSupported } from '../../lib/haptics'
import { exportAllData, importAllData } from '../../lib/backup'
import { Button, Chip, Segmented, Sheet } from '../../components/ui'
import { useDevice } from '../../store/device'
import { useReps } from '../../store/reps'
import { useSettings } from '../../store/settings'

export function SettingsScreen({ onRunLatency }: { onRunLatency: () => void }) {
  const settings = useSettings()
  const device = useDevice()
  const reps = useReps()
  const fileRef = useRef<HTMLInputElement>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [helpOpen, setHelpOpen] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)

  const onImportFile = async (f: File | undefined) => {
    if (!f) return
    try {
      setNotice(await importAllData(f))
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Import failed')
    }
  }

  return (
    <div className="space-y-6 px-4 py-4">
      <h2 className="font-display text-xl font-black uppercase tracking-wide">Settings</h2>

      {notice && (
        <p className="rounded-lg bg-court-900 px-3 py-2 text-xs text-green-signal">{notice}</p>
      )}

      <section className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-chalk-dim">
          Meter style
        </p>
        <Segmented
          options={['comet', 'ring'] as const}
          value={settings.meterStyle}
          onChange={(meterStyle) => settings.set({ meterStyle })}
          labels={(s) => (s === 'comet' ? 'Vertical Comet' : 'Ring')}
        />
      </section>

      <section className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-chalk-dim">Feel</p>
        {hapticsSupported && (
          <Segmented
            options={['on', 'off'] as const}
            value={settings.hapticsOn ? 'on' : 'off'}
            onChange={(v) => settings.set({ hapticsOn: v === 'on' })}
            labels={(v) => `Haptics ${v}`}
          />
        )}
        <Segmented
          options={['right', 'left'] as const}
          value={settings.leftHanded ? 'left' : 'right'}
          onChange={(v) => settings.set({ leftHanded: v === 'left' })}
          labels={(v) => `${v === 'right' ? 'Right' : 'Left'}-hand layout`}
        />
      </section>

      <section className="space-y-2 rounded-xl border border-court-line p-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-chalk-dim">
          Device latency
        </p>
        {device.profile ? (
          <p className="text-sm">
            Offset <b className="tabular-nums">{device.profile.deviceOffsetMs}ms</b> · jitter ±
            {device.profile.jitterMs}ms
            <span className="block text-xs text-chalk-dim">
              Calibrated {new Date(device.profile.calibratedAt).toLocaleDateString()}
            </span>
          </p>
        ) : (
          <p className="text-sm text-heat">
            Not calibrated — judgments include your phone's raw touch lag.
          </p>
        )}
        <Chip onClick={onRunLatency}>
          {device.profile ? 'Re-run calibration' : 'Calibrate now (60s)'}
        </Chip>
      </section>

      <section className="space-y-2 rounded-xl border border-court-line p-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-chalk-dim">
          Your data (all on-device)
        </p>
        <p className="text-xs text-chalk-dim">
          Browsers can evict site storage. Export a backup after big sessions — especially on iPhone
          if the app isn't installed to your home screen.
        </p>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={exportAllData}>
            Export backup
          </Button>
          <Button variant="ghost" onClick={() => fileRef.current?.click()}>
            Import backup
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => void onImportFile(e.target.files?.[0])}
          />
        </div>
      </section>

      <section className="space-y-2">
        <Chip onClick={() => setHelpOpen(true)}>How the math works</Chip>
      </section>

      <section className="space-y-2 rounded-xl border border-red-900/60 p-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-red-400">Danger zone</p>
        {confirmReset ? (
          <div className="flex gap-2">
            <Button
              variant="danger"
              onClick={() => {
                reps.resetStats()
                setConfirmReset(false)
                setNotice('Stats reset')
              }}
            >
              Yes, wipe all stats
            </Button>
            <Button variant="ghost" onClick={() => setConfirmReset(false)}>
              Cancel
            </Button>
          </div>
        ) : (
          <Button variant="danger" onClick={() => setConfirmReset(true)}>
            Reset all stats
          </Button>
        )}
      </section>

      <p className="pb-4 text-center text-[11px] text-chalk-dim">
        Fan-made training tool. Not affiliated with 2K, Take-Two, or the NBA.
      </p>

      <Sheet open={helpOpen} onClose={() => setHelpOpen(false)} title="How the math works">
        <div className="space-y-3 text-sm text-chalk-dim">
          <p>
            <b className="text-chalk">Your green window</b> starts at 24ms and is multiplied by
            factors for your attribute rating, difficulty, move type, court zone, contest, fatigue,
            and meter visibility — mirroring how 2K26 sizes its windows. Higher rating → bigger
            window; HOF → smaller; stepbacks and deep threes → smaller; meter off → slightly bigger.
          </p>
          <p>
            <b className="text-chalk">Judgment is pure timing.</b> We measure the exact milliseconds
            between your press and release using input timestamps — the meter is just a picture.
            Inside the window = green, always a make. On All-Star and above, everything else misses
            (Green-or-Miss, like 2K26). On Pro and below, near-misses can still fall at reduced
            odds.
          </p>
          <p>
            <b className="text-chalk">Calibration earns accuracy.</b> 2K doesn't publish frame data,
            so no app can clone your jumper out of the box. Instead: a 60-second tap test measures
            your phone's touch lag, a per-build capture sets your release time, and the bias stat +
            trim control let you converge — like adjusting rifle sights. Your greens in 2K are the
            ground truth.
          </p>
        </div>
      </Sheet>
    </div>
  )
}
