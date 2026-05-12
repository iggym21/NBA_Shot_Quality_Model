'use client'

import type { ShotParams } from '@/lib/api'

export type { ShotParams }

interface SliderConfig {
  key: keyof ShotParams
  label: string
  unit: string
  min: number
  max: number
  step: number
  format: (v: number) => string
}

const SLIDERS: SliderConfig[] = [
  {
    key: 'shot_distance',
    label: 'DISTANCE',
    unit: 'FT',
    min: 0, max: 35, step: 0.5,
    format: (v) => v.toFixed(1),
  },
  {
    key: 'shot_angle',
    label: 'ANGLE',
    unit: 'DEG',
    min: -90, max: 90, step: 1,
    format: (v) => (v >= 0 ? `+${v}` : String(v)),
  },
  {
    key: 'defender_distance',
    label: 'DEFENDER',
    unit: '',
    min: 0, max: 3, step: 1,
    format: (v) => (['TIGHT', 'CLOSE', 'OPEN', 'WIDE OPEN'][v] ?? String(v)),
  },
  {
    key: 'seconds_in_period',
    label: 'CLOCK',
    unit: 'SEC',
    min: 0, max: 720, step: 5,
    format: (v) => String(v),
  },
  {
    key: 'quarter',
    label: 'QUARTER',
    unit: '',
    min: 1, max: 5, step: 1,
    format: (v) => `Q${v}`,
  },
  {
    key: 'score_differential',
    label: 'SCORE DIFF',
    unit: 'PTS',
    min: -30, max: 30, step: 1,
    format: (v) => (v > 0 ? `+${v}` : String(v)),
  },
]

interface SliderGridProps {
  params: ShotParams
  onChange: (params: ShotParams) => void
  twoCol?: boolean
}

export default function SliderGrid({ params, onChange, twoCol }: SliderGridProps) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: twoCol ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)',
        gap: '2px',
        height: twoCol ? '100%' : undefined,
      }}
    >
      {SLIDERS.map(({ key, label, unit, min, max, step, format }) => (
        <div
          key={key}
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            padding: '14px 16px',
          }}
        >
          {/* Mono label row */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              marginBottom: '12px',
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '9px',
                letterSpacing: '0.14em',
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
              }}
            >
              {label}
            </span>
            <div style={{ textAlign: 'right' }}>
              <span
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '26px',
                  color: 'var(--red)',
                  lineHeight: 1,
                }}
              >
                {format(params[key])}
              </span>
              {unit && (
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '9px',
                    color: 'var(--text-muted)',
                    marginLeft: '3px',
                    letterSpacing: '0.08em',
                  }}
                >
                  {unit}
                </span>
              )}
            </div>
          </div>
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={params[key]}
            onChange={(e) =>
              onChange({ ...params, [key]: parseFloat(e.target.value) })
            }
          />
        </div>
      ))}
    </div>
  )
}
