// Build manager (F1): list, activate, duplicate, share code out, import in.

import { useState } from 'react'
import { effectiveRating } from '../../engine/resolve'
import type { PlayerBuild } from '../../engine/types'
import { decodeShareCode, encodeShareCode } from '../../lib/codec'
import { Button, Chip, TextInput } from '../../components/ui'
import { useBuilds } from '../../store/builds'

export function BuildsScreen({ onEdit }: { onEdit: (buildId: string) => void }) {
  const builds = useBuilds()
  const [importCode, setImportCode] = useState('')
  const [notice, setNotice] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const share = async (build: PlayerBuild) => {
    const code = await encodeShareCode(build)
    try {
      if (navigator.share) {
        await navigator.share({ title: `GreenRep build: ${build.name}`, text: code })
        return
      }
    } catch {
      // fall through to clipboard (user may have dismissed the share sheet)
    }
    await navigator.clipboard.writeText(code)
    setNotice('Share code copied to clipboard')
  }

  const doImport = async () => {
    try {
      const build = await decodeShareCode(importCode)
      builds.importBuild(build)
      setImportCode('')
      setNotice(`Imported "${build.name}" — now active`)
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Could not read that code')
    }
  }

  return (
    <div className="space-y-4 px-4 py-4">
      <h2 className="font-display text-xl font-black uppercase tracking-wide">Builds</h2>

      {notice && (
        <p className="rounded-lg bg-court-900 px-3 py-2 text-xs text-green-signal">{notice}</p>
      )}

      {builds.builds.map((b) => {
        const active = b.id === builds.activeBuildId
        return (
          <div
            key={b.id}
            className={`rounded-xl border p-4 ${active ? 'border-green-signal/50 bg-court-900' : 'border-court-line'}`}
          >
            <button
              type="button"
              className="w-full text-left"
              onClick={() => builds.setActive(b.id)}
            >
              <div className="flex items-baseline justify-between">
                <span className="font-display text-lg font-bold">{b.name}</span>
                {active && (
                  <span className="text-[10px] font-bold uppercase tracking-widest text-green-signal">
                    Active
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-xs text-chalk-dim">
                {[b.heightLabel, b.position].filter(Boolean).join(' ')} · 3PT{' '}
                {effectiveRating(b.attributes.three)} · {b.difficulty} ·{' '}
                {b.timing.idealReleaseMs.toFixed(0)}ms{' '}
                {b.timing.calibration.method === 'default' ? '(uncalibrated)' : ''}
              </p>
            </button>
            <div className="mt-3 flex flex-wrap gap-2">
              <Chip onClick={() => onEdit(b.id)}>Edit</Chip>
              <Chip onClick={() => builds.duplicateBuild(b.id)}>Duplicate</Chip>
              <Chip onClick={() => void share(b)}>Share</Chip>
              {confirmDelete === b.id ? (
                <Chip
                  onClick={() => {
                    builds.deleteBuild(b.id)
                    setConfirmDelete(null)
                  }}
                  className="!border-red-900 !text-red-400"
                >
                  Really delete?
                </Chip>
              ) : (
                <Chip onClick={() => setConfirmDelete(b.id)} className="opacity-60">
                  Delete
                </Chip>
              )}
            </div>
          </div>
        )
      })}

      <div className="rounded-xl border border-dashed border-court-line p-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-chalk-dim">
          Import a friend's build
        </p>
        <div className="flex gap-2">
          <TextInput
            value={importCode}
            onChange={(e) => setImportCode(e.target.value)}
            placeholder="Paste GR1.… share code"
          />
          <Button onClick={() => void doImport()} disabled={!importCode.trim()}>
            Import
          </Button>
        </div>
      </div>
    </div>
  )
}
