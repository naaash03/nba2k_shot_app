// Build share codes (F1.4): "GR1." + base64url(deflate-raw(JSON)) when
// CompressionStream is available (iOS 16.4+/Chrome 103+), else "GR0." +
// base64url(JSON). Import accepts both. No backend — the code IS the build.

import type { PlayerBuild } from '../engine/types'

function bytesToBase64url(bytes: Uint8Array): string {
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function base64urlToBytes(s: string): Uint8Array {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/')
  const bin = atob(b64.padEnd(Math.ceil(b64.length / 4) * 4, '='))
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes
}

async function pipeThrough(bytes: Uint8Array, stream: GenericTransformStream): Promise<Uint8Array> {
  const blob = new Blob([bytes.buffer as ArrayBuffer])
  const out = await new Response(blob.stream().pipeThrough(stream)).arrayBuffer()
  return new Uint8Array(out)
}

export async function encodeShareCode(build: PlayerBuild): Promise<string> {
  const json = new TextEncoder().encode(JSON.stringify(build))
  if (typeof CompressionStream !== 'undefined') {
    const deflated = await pipeThrough(json, new CompressionStream('deflate-raw'))
    return 'GR1.' + bytesToBase64url(deflated)
  }
  return 'GR0.' + bytesToBase64url(json)
}

export async function decodeShareCode(code: string): Promise<PlayerBuild> {
  const trimmed = code.trim()
  const dot = trimmed.indexOf('.')
  if (dot < 0) throw new Error('Not a GreenRep share code')
  const prefix = trimmed.slice(0, dot)
  const payload = base64urlToBytes(trimmed.slice(dot + 1))
  let json: Uint8Array
  if (prefix === 'GR1') {
    if (typeof DecompressionStream === 'undefined')
      throw new Error('This browser cannot read compressed codes')
    json = await pipeThrough(payload, new DecompressionStream('deflate-raw'))
  } else if (prefix === 'GR0') {
    json = payload
  } else {
    throw new Error('Unknown share-code version')
  }
  const build = JSON.parse(new TextDecoder().decode(json)) as PlayerBuild
  if (typeof build.schemaVersion !== 'number' || !build.timing || !build.attributes)
    throw new Error('Share code is not a valid build')
  return build
}
