// Share-code round-trip (F1.4). Node 18+ has CompressionStream, so the GR1
// compressed path is exercised here.

import { describe, expect, it } from 'vitest'
import { decodeShareCode, encodeShareCode } from '../../src/lib/codec'
import { makeBuild } from './helpers'

describe('share codes', () => {
  it('round-trips a build losslessly', async () => {
    const build = makeBuild({ name: 'Corner Sniper', difficulty: 'HOF' })
    const code = await encodeShareCode(build)
    expect(code.startsWith('GR1.')).toBe(true)
    const decoded = await decodeShareCode(code)
    expect(decoded).toEqual(build)
  })

  it('rejects garbage', async () => {
    await expect(decodeShareCode('not-a-code')).rejects.toThrow()
    await expect(decodeShareCode('GR9.abcdef')).rejects.toThrow()
  })

  it('survives surrounding whitespace (texted codes get mangled)', async () => {
    const build = makeBuild()
    const code = await encodeShareCode(build)
    const decoded = await decodeShareCode(`  ${code}\n`)
    expect(decoded.name).toBe(build.name)
  })
})
