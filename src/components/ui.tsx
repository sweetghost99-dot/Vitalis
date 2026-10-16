import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { X } from 'lucide-react'

/* ── Layout ─────────────────────────────────────────────────────────────── */

export function Card({
  children,
  className = '',
  tight = false,
}: {
  children: React.ReactNode
  className?: string
  tight?: boolean
}) {
  return <div className={`card${tight ? ' card-tight' : ''}${className ? ' ' + className : ''}`}>{children}</div>
}

export function CardHead({
  title,
  icon,
  right,
  hint,
}: {
  title: string
  icon?: React.ReactNode
  right?: React.ReactNode
  hint?: string
}) {
  return (
    <div className="card-head">
      <div>
        <div className="card-title">
          {icon}
          {title}
        </div>
        {hint ? <div className="card-hint">{hint}</div> : null}
      </div>
      {right}
    </div>
  )
}

/* ── Progress ring ──────────────────────────────────────────────────────── */

export function Ring({
  value,
  size = 190,
  thickness = 14,
  color = 'var(--kcal)',
  children,
}: {
  value: number
  size?: number
  thickness?: number
  color?: string
  children?: React.ReactNode
}) {
  const radius = (size - thickness) / 2
  const circumference = 2 * Math.PI * radius
  const clamped = Math.max(0, Math.min(1, value))
  const offset = circumference * (1 - clamped)

  return (
    <div className="ring-wrap" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle
          className="ring-track"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={thickness}
        />
        <circle
          className="ring-value"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={thickness}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="ring-center">{children}</div>
    </div>
  )
}

/* ── Macro bar ──────────────────────────────────────────────────────────── */

export function MacroBar({
  name,
  color,
  value,
  target,
  unit = 'g',
}: {
  name: string
  color: string
  value: number
  target: number
  unit?: string
}) {
  const pct = target > 0 ? value / target : 0
  return (
    <div className="macro-row">
      <div className="macro-top">
        <span className="macro-name">
          <i className="macro-dot" style={{ background: color }} />
          {name}
        </span>
        <span className="macro-nums">
          <strong>{Math.round(value)}</strong> / {Math.round(target)} {unit}
        </span>
      </div>
      <div className={`bar${pct > 1.05 ? ' bar-over' : ''}`}>
        <span style={{ width: `${Math.min(100, pct * 100)}%`, background: color }} />
      </div>
    </div>
  )
}

export function SplitBar({ parts }: { parts: { value: number; color: string; label: string }[] }) {
  const total = parts.reduce((sum, p) => sum + p.value, 0)
  if (total <= 0) return <div className="split-bar" />
  return (
    <div className="split-bar">
      {parts.map((p) => (
        <span key={p.label} style={{ width: `${(p.value / total) * 100}%`, background: p.color }} />
      ))}
    </div>
  )
}

/* ── Stat tile ──────────────────────────────────────────────────────────── */

export function Stat({
  label,
  value,
  unit,
  note,
  icon,
}: {
  label: string
  value: React.ReactNode
  unit?: string
  note?: React.ReactNode
  icon?: React.ReactNode
}) {
  return (
    <div className="stat">
      <div className="stat-label">
        {icon}
        {label}
      </div>
      <div className="stat-value">
        {value}
        {unit ? <small> {unit}</small> : null}
      </div>
      {note ? <div className="stat-note">{note}</div> : null}
    </div>
  )
}

export function Badge({
  children,
  tone = 'neutral',
  icon,
}: {
  children: React.ReactNode
  tone?: 'neutral' | 'ok' | 'warn' | 'danger' | 'info'
  icon?: React.ReactNode
}) {
  return (
    <span className={`badge${tone === 'neutral' ? '' : ' badge-' + tone}`}>
      {icon}
      {children}
    </span>
  )
}

/* ── Controls ───────────────────────────────────────────────────────────── */

export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  size = 'md',
}: {
  options: { value: T; label: string; color?: string; icon?: React.ReactNode }[]
  value: T
  onChange: (value: T) => void
  size?: 'md' | 'sm'
}) {
  return (
    <div className="segmented" style={size === 'sm' ? { padding: 3 } : undefined}>
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          className={o.value === value ? 'is-active' : ''}
          style={size === 'sm' ? { padding: '6px 10px', fontSize: 12.5 } : undefined}
          onClick={() => onChange(o.value)}
        >
          {o.color ? <i className="dot" style={{ background: o.color }} /> : o.icon}
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Stepper({
  value,
  onChange,
  step = 1,
  min = 0,
  max = 9999,
  suffix,
}: {
  value: number
  onChange: (v: number) => void
  step?: number
  min?: number
  max?: number
  suffix?: string
}) {
  const clamp = (v: number) => Math.min(max, Math.max(min, Math.round(v * 100) / 100))
  return (
    <div className="stepper">
      <button type="button" onClick={() => onChange(clamp(value - step))} aria-label="Decrease">
        −
      </button>
      <input
        value={Number.isFinite(value) ? value : ''}
        onChange={(e) => {
          const next = Number(e.target.value)
          if (!Number.isNaN(next)) onChange(clamp(next))
        }}
        inputMode="decimal"
      />
      <button type="button" onClick={() => onChange(clamp(value + step))} aria-label="Increase">
        +
      </button>
      {suffix ? <span className="input-suffix" style={{ position: 'static', paddingRight: 11 }}>{suffix}</span> : null}
    </div>
  )
}

/* ── Modal ──────────────────────────────────────────────────────────────── */

export function Modal({
  title,
  onClose,
  children,
  footer,
  width,
}: {
  title: string
  onClose: () => void
  children: React.ReactNode
  footer?: React.ReactNode
  width?: number
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={width ? { width: `min(${width}px, 100%)` } : undefined} role="dialog" aria-modal>
        <div className="modal-head">
          <div className="modal-title">{title}</div>
          <button className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Close">
            <X size={17} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer ? <div className="modal-foot">{footer}</div> : null}
      </div>
    </div>
  )
}

/* ── Charts ─────────────────────────────────────────────────────────────── */

export function ColumnChart({
  data,
  target,
  format,
}: {
  data: { label: string; value: number; highlight?: boolean }[]
  target?: number
  format?: (v: number) => string
}) {
  const max = Math.max(target ?? 0, ...data.map((d) => d.value), 1)
  return (
    <div className="cols">
      {data.map((d, i) => {
        const pct = (d.value / max) * 100
        const over = target ? d.value > target * 1.06 : false
        return (
          <div key={i} className={`col${d.highlight ? ' is-today' : ''}`} title={`${d.label}: ${format ? format(d.value) : d.value}`}>
            <div className="col-track">
              {target ? <div className="col-target" style={{ bottom: `${(target / max) * 100}%` }} /> : null}
              <div
                className={`col-fill${d.value === 0 ? ' is-empty' : over ? ' is-over' : ''}`}
                style={{ height: `${d.value === 0 ? 2 : Math.max(3, pct)}%` }}
              />
            </div>
            <div className="col-label">{d.label}</div>
          </div>
        )
      })}
    </div>
  )
}

export function LineChart({
  points,
  color = 'var(--kcal)',
  targetValue,
  format,
  yLabel,
}: {
  points: { x: string; y: number; label?: string }[]
  color?: string
  targetValue?: number
  format?: (v: number) => string
  yLabel?: string
}) {
  const width = 640
  const height = 200
  const pad = { top: 16, right: 14, bottom: 26, left: 40 }

  const geometry = useMemo(() => {
    if (points.length === 0) return null
    const values = points.map((p) => p.y)
    let min = Math.min(...values)
    let max = Math.max(...values)
    if (targetValue !== undefined) {
      min = Math.min(min, targetValue)
      max = Math.max(max, targetValue)
    }
    if (max - min < 1) {
      min -= 1
      max += 1
    }
    const padding = (max - min) * 0.18
    min -= padding
    max += padding

    const innerW = width - pad.left - pad.right
    const innerH = height - pad.top - pad.bottom
    const xAt = (i: number) =>
      points.length === 1 ? pad.left + innerW / 2 : pad.left + (i / (points.length - 1)) * innerW
    const yAt = (v: number) => pad.top + innerH - ((v - min) / (max - min)) * innerH

    const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${xAt(i).toFixed(1)},${yAt(p.y).toFixed(1)}`).join(' ')
    const area = `${line} L${xAt(points.length - 1).toFixed(1)},${pad.top + innerH} L${xAt(0).toFixed(1)},${pad.top + innerH} Z`

    return { min, max, xAt, yAt, line, area, innerH }
  }, [points, targetValue, pad.left, pad.right, pad.top, pad.bottom])

  if (!geometry) return <div className="empty">No data yet</div>
  const { min, max, xAt, yAt, line, area, innerH } = geometry
  const fmt = format ?? ((v: number) => String(Math.round(v * 10) / 10))

  const gridLines = [0, 0.5, 1].map((t) => max - (max - min) * t)

  return (
    <svg className="chart-svg" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={yLabel ?? 'chart'}>
      <defs>
        <linearGradient id="linefill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.32" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>

      {gridLines.map((v, i) => (
        <g key={i}>
          <line
            x1={pad.left}
            x2={width - pad.right}
            y1={yAt(v)}
            y2={yAt(v)}
            stroke="rgba(255,255,255,0.07)"
            strokeWidth="1"
          />
          <text x={4} y={yAt(v) + 4} fill="var(--text-faint)" fontSize="10.5">
            {fmt(v)}
          </text>
        </g>
      ))}

      {targetValue !== undefined ? (
        <line
          x1={pad.left}
          x2={width - pad.right}
          y1={yAt(targetValue)}
          y2={yAt(targetValue)}
          stroke="var(--protein)"
          strokeWidth="1.5"
          strokeDasharray="5 4"
          opacity="0.8"
        />
      ) : null}

      <path d={area} fill="url(#linefill)" />
      <path d={line} fill="none" stroke={color} strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" />

      {points.map((p, i) => (
        <g key={i}>
          <circle cx={xAt(i)} cy={yAt(p.y)} r={points.length > 24 ? 2 : 4} fill="#0b1120" stroke={color} strokeWidth="2" />
          {(i === 0 || i === points.length - 1 || points.length <= 8) && (
            <text x={xAt(i)} y={height - 6} fill="var(--text-faint)" fontSize="10.5" textAnchor="middle">
              {p.x}
            </text>
          )}
        </g>
      ))}
      {targetValue !== undefined ? (
        <text x={width - pad.right} y={yAt(targetValue) - 6} fill="var(--protein)" fontSize="10.5" textAnchor="end">
          goal {fmt(targetValue)}
        </text>
      ) : null}
      <line x1={pad.left} x2={width - pad.right} y1={pad.top + innerH} y2={pad.top + innerH} stroke="rgba(255,255,255,0.14)" />
    </svg>
  )
}

/* ── Toast ──────────────────────────────────────────────────────────────── */

const ToastContext = createContext<(message: string) => void>(() => {})

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [message, setMessage] = useState<string | null>(null)

  const show = useCallback((text: string) => {
    setMessage(text)
  }, [])

  useEffect(() => {
    if (!message) return
    const timer = window.setTimeout(() => setMessage(null), 2600)
    return () => window.clearTimeout(timer)
  }, [message])

  return (
    <ToastContext.Provider value={show}>
      {children}
      {message ? <div className="toast">✓ {message}</div> : null}
    </ToastContext.Provider>
  )
}

export function useToast(): (message: string) => void {
  return useContext(ToastContext)
}

/* ── Misc ───────────────────────────────────────────────────────────────── */

export function Empty({ children }: { children: React.ReactNode }) {
  return <div className="empty">{children}</div>
}

export function fmtG(value: number): string {
  return `${Math.round(value)}g`
}

export function fmtKcal(value: number): string {
  return `${Math.round(value)} kcal`
}
