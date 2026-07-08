// App shell: practice is home; everything else is one tap away and one tap
// back (§11.2). Full-screen flows (onboarding, calibration, editor) overlay
// the tab layer.

import { useEffect, useState } from 'react'
import { checkEventClock } from './lib/time'
import { useSettings } from './store/settings'
import { BuildEditor } from './features/builds/BuildEditor'
import { BuildsScreen } from './features/builds/BuildsScreen'
import { LatencyWizard } from './features/calibration/LatencyWizard'
import { TimingCalibration } from './features/calibration/TimingCalibration'
import { CourtScreen } from './features/court/CourtScreen'
import { InstallNudge, Onboarding } from './features/onboarding/Onboarding'
import { PracticeScreen } from './features/practice/PracticeScreen'
import { SettingsScreen } from './features/settings/SettingsScreen'
import { StatsScreen } from './features/stats/StatsScreen'

type Tab = 'practice' | 'court' | 'stats' | 'builds' | 'settings'
type Overlay =
  | { kind: 'none' }
  | { kind: 'latency' }
  | { kind: 'editor'; buildId: string }
  | { kind: 'timing'; buildId: string }

const TABS: Array<{ id: Tab; label: string; icon: string }> = [
  { id: 'practice', label: 'Shoot', icon: '◉' },
  { id: 'court', label: 'Court', icon: '◠' },
  { id: 'stats', label: 'Stats', icon: '▥' },
  { id: 'builds', label: 'Builds', icon: '♟' },
  { id: 'settings', label: 'More', icon: '⚙' },
]

function App() {
  const onboarded = useSettings((s) => s.onboarded)
  const [tab, setTab] = useState<Tab>('practice')
  const [overlay, setOverlay] = useState<Overlay>({ kind: 'none' })

  useEffect(() => {
    checkEventClock()
  }, [])

  if (!onboarded) {
    return <Onboarding onCalibrate={() => setOverlay({ kind: 'latency' })} />
  }

  if (overlay.kind === 'latency') {
    return (
      <div className="h-dvh">
        <LatencyWizard onDone={() => setOverlay({ kind: 'none' })} />
      </div>
    )
  }
  if (overlay.kind === 'timing') {
    return (
      <div className="min-h-dvh overflow-y-auto">
        <TimingCalibration
          buildId={overlay.buildId}
          onDone={() => setOverlay({ kind: 'editor', buildId: overlay.buildId })}
        />
      </div>
    )
  }
  if (overlay.kind === 'editor') {
    return (
      <div className="min-h-dvh overflow-y-auto">
        <BuildEditor
          buildId={overlay.buildId}
          onDone={() => setOverlay({ kind: 'none' })}
          onCalibrate={() => setOverlay({ kind: 'timing', buildId: overlay.buildId })}
        />
        <BottomNav
          tab="builds"
          onTab={(t) => {
            setOverlay({ kind: 'none' })
            setTab(t)
          }}
        />
      </div>
    )
  }

  return (
    <div className="flex h-dvh flex-col">
      <main className="min-h-0 flex-1 overflow-y-auto">
        {tab === 'practice' && <PracticeScreen onOpenBuilds={() => setTab('builds')} />}
        {tab === 'court' && <CourtScreen onGoPractice={() => setTab('practice')} />}
        {tab === 'stats' && <StatsScreen />}
        {tab === 'builds' && (
          <BuildsScreen onEdit={(buildId) => setOverlay({ kind: 'editor', buildId })} />
        )}
        {tab === 'settings' && (
          <SettingsScreen onRunLatency={() => setOverlay({ kind: 'latency' })} />
        )}
      </main>
      <InstallNudge />
      <BottomNav tab={tab} onTab={setTab} />
    </div>
  )
}

function BottomNav({ tab, onTab }: { tab: Tab; onTab: (t: Tab) => void }) {
  return (
    <nav className="flex shrink-0 border-t border-court-line bg-court-950 pb-[env(safe-area-inset-bottom)]">
      {TABS.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => onTab(t.id)}
          aria-current={tab === t.id ? 'page' : undefined}
          className={`flex min-h-12 flex-1 flex-col items-center justify-center gap-0.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider ${
            tab === t.id ? 'text-green-signal' : 'text-chalk-dim'
          }`}
        >
          <span aria-hidden className="text-base leading-none">
            {t.icon}
          </span>
          {t.label}
        </button>
      ))}
    </nav>
  )
}

export default App
