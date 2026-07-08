// First-launch onboarding (F10.1): three cards, then a strongly-encouraged
// latency calibration. Skippable end-to-end.

import { useState } from 'react'
import { Button } from '../../components/ui'
import { useSettings } from '../../store/settings'

const CARDS = [
  {
    title: 'Hold. Release. Green.',
    body: 'The shot button in 2K26 is hold-and-release — and so is your thumb on glass. Hold SHOOT, lift at your set point. Same motor pattern, same timing, no console needed.',
    art: '◼ → ◆',
  },
  {
    title: 'Calibrate once, trust forever',
    body: 'Every phone has different touch lag, and every jumper has its own release time. A 60-second tap test plus a per-build capture makes the timing yours — not some generic default.',
    art: '⊙ 60s',
  },
  {
    title: 'Watch the bell curve tighten',
    body: 'Every rep shows your exact error in milliseconds. The histogram of your misses narrows as your muscle memory locks in — proof the reps transfer.',
    art: '▁▃█▃▁',
  },
]

export function Onboarding({ onCalibrate }: { onCalibrate: () => void }) {
  const settings = useSettings()
  const [index, setIndex] = useState(0)
  const card = CARDS[index]
  const last = index === CARDS.length - 1

  const finish = (calibrate: boolean) => {
    settings.set({ onboarded: true })
    if (calibrate) onCalibrate()
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-between bg-court-950 px-8 py-12 text-center">
      <p className="text-xs uppercase tracking-[0.35em] text-chalk-dim">GreenRep</p>

      <div className="flex flex-col items-center gap-6">
        <div className="font-display text-5xl text-green-signal" aria-hidden>
          {card.art}
        </div>
        <h1 className="font-display text-3xl font-black uppercase tracking-tight">{card.title}</h1>
        <p className="max-w-sm text-sm leading-relaxed text-chalk-dim">{card.body}</p>
      </div>

      <div className="flex w-full max-w-xs flex-col items-center gap-4">
        <div className="flex gap-2" aria-hidden>
          {CARDS.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 w-6 rounded-full ${i === index ? 'bg-green-signal' : 'bg-court-line'}`}
            />
          ))}
        </div>
        {last ? (
          <>
            <Button onClick={() => finish(true)} className="w-full">
              Calibrate my device (60s)
            </Button>
            <Button variant="ghost" onClick={() => finish(false)} className="w-full">
              Just let me shoot
            </Button>
          </>
        ) : (
          <Button onClick={() => setIndex(index + 1)} className="w-full">
            Next
          </Button>
        )}
        <p className="text-[10px] text-chalk-dim">
          Fan-made training tool. Not affiliated with 2K, Take-Two, or the NBA.
        </p>
      </div>
    </div>
  )
}

/** iOS Safari A2HS nudge (F9.4) — installing also prevents 7-day storage eviction. */
export function InstallNudge() {
  const settings = useSettings()
  const [dismissed, setDismissed] = useState(false)

  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent)
  const standalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    ('standalone' in navigator && (navigator as { standalone?: boolean }).standalone === true)

  if (!isIos || standalone || settings.installNudgeShown || dismissed || !settings.onboarded)
    return null

  return (
    <div className="fixed inset-x-3 bottom-16 z-30 rounded-xl border border-court-line bg-court-900 p-4 shadow-xl">
      <p className="text-sm font-bold">Add to Home Screen</p>
      <p className="mt-1 text-xs text-chalk-dim">
        Tap <b className="text-chalk">Share</b> → <b className="text-chalk">Add to Home Screen</b>.
        Full-screen, works offline — and protects your saved builds from Safari's storage cleanup.
      </p>
      <button
        type="button"
        className="mt-2 text-xs font-bold uppercase tracking-wider text-green-signal"
        onClick={() => {
          setDismissed(true)
          settings.set({ installNudgeShown: true })
        }}
      >
        Got it
      </button>
    </div>
  )
}
