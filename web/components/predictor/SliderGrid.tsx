'use client'

import type { ShotParams } from '@/lib/api'

export type { ShotParams }

interface SliderConfig {
  key: keyof ShotParams
  label: string
  min: number
  max: number
  step: number
  format: (v: number) => string
}

const SLIDERS: SliderConfig[] = [
  {
    key: 'shot_distance',
    label: 'Distance',
    min: 0, max: 35, step: 0.5,
    format: (v) => `${v} ft`,
  },
  {
    key: 'shot_angle',
    label: 'Angle',
    min: -90, max: 90, step: 1,
    format: (v) => `${v}°`,
  },
  {
    key: 'defender_distance',
    label: 'Defender',
    min: 0, max: 3, step: 1,
    format: (v) => ['Tight', 'Close', 'Open', 'Wide Open'][v] ?? String(v),
  },
  {
    key: 'seconds_in_period',
    label: 'Seconds',
    min: 0, max: 720, step: 10,
    format: (v) => `${v}s`,
  },
  {
    key: 'quarter',
    label: 'Quarter',
    min: 1, max: 5, step: 1,
    format: (v) => `Q${v}`,
  },
  {
    key: 'score_differential',
    label: 'Score Diff',
    min: -30, max: 30, step: 1,
    format: (v) => (v > 0 ? `+${v}` : String(v)),
  },
]

interface SliderGridProps {
  params: ShotParams
  onChange: (params: ShotParams) => void
}

export default function SliderGrid({ params, onChange }: SliderGridProps) {
  const handleChange = (key: keyof ShotParams, value: number) => {
    onChange({ ...params, [key]: value })
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '20px',
        marginTop: '20px',
      }}
    >
      {SLIDERS.map(({ key, label, min, max, step, format }) => (
        <div key={key}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: '6px',
              fontSize: '13px',
            }}
          >
            <span style={{ color: 'var(--text-muted)' }}>{label}</span>
            <span style={{ fontWeight: 600, color: 'var(--red)' }}>
              {format(params[key])}
            </span>
          </div>
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={params[key]}
            onChange={(e) => handleChange(key, parseFloat(e.target.value))}
          />
        </div>
      ))}
    </div>
  )
}
