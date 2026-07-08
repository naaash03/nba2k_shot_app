// Shared UI primitives — quiet and disciplined; the meter is the star (§11.1).

import type { ReactNode } from 'react'

export function Chip({
  children,
  active = false,
  onClick,
  className = '',
}: {
  children: ReactNode
  active?: boolean
  onClick?: () => void
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-11 rounded-full border px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors ${
        active
          ? 'border-green-signal/60 bg-court-800 text-chalk'
          : 'border-court-line bg-transparent text-chalk-dim'
      } ${className}`}
    >
      {children}
    </button>
  )
}

export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  labels,
}: {
  options: readonly T[]
  value: T
  onChange: (v: T) => void
  labels?: (v: T) => string
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <Chip key={String(o)} active={o === value} onClick={() => onChange(o)}>
          {labels ? labels(o) : String(o)}
        </Chip>
      ))}
    </div>
  )
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-chalk-dim">
        {label}
      </span>
      {children}
    </label>
  )
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full rounded-lg border border-court-line bg-court-900 px-3 py-2.5 text-sm text-chalk outline-none focus:border-green-signal/50 ${props.className ?? ''}`}
    />
  )
}

export function Button({
  children,
  onClick,
  variant = 'primary',
  disabled = false,
  className = '',
}: {
  children: ReactNode
  onClick?: () => void
  variant?: 'primary' | 'ghost' | 'danger'
  disabled?: boolean
  className?: string
}) {
  const styles = {
    primary: 'bg-green-signal/15 border-green-signal/50 text-chalk',
    ghost: 'bg-transparent border-court-line text-chalk-dim',
    danger: 'bg-transparent border-red-900 text-red-400',
  }[variant]
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`min-h-11 rounded-xl border px-4 py-2.5 text-sm font-bold uppercase tracking-wider transition-opacity disabled:opacity-40 ${styles} ${className}`}
    >
      {children}
    </button>
  )
}

/** Bottom sheet — one-thumb reachable modal surface. */
export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-40" role="dialog" aria-label={title}>
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
      />
      <div className="absolute inset-x-0 bottom-0 max-h-[85dvh] overflow-y-auto rounded-t-2xl border-t border-court-line bg-court-950 p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold uppercase tracking-wide">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 min-w-11 rounded-full text-chalk-dim"
            aria-label="Close sheet"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function Stat({
  label,
  value,
  accent = false,
}: {
  label: string
  value: string
  accent?: boolean
}) {
  return (
    <div className="text-center">
      <div
        className={`font-display text-2xl font-bold tabular-nums ${accent ? 'text-green-signal' : 'text-chalk'}`}
      >
        {value}
      </div>
      <div className="text-[10px] uppercase tracking-widest text-chalk-dim">{label}</div>
    </div>
  )
}
