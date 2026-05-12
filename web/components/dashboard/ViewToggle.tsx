'use client'

export type DashboardView = 'zones' | 'scatter' | 'leaderboard'

interface ViewToggleProps {
  activeView: DashboardView
  onViewChange: (view: DashboardView) => void
}

const VIEWS: { key: DashboardView; label: string }[] = [
  { key: 'zones', label: 'Zone Breakdown' },
  { key: 'scatter', label: 'League Scatter' },
  { key: 'leaderboard', label: 'Leaderboard' },
]

export default function ViewToggle({ activeView, onViewChange }: ViewToggleProps) {
  return (
    <div style={{ display: 'flex', gap: '8px', marginBottom: '28px' }}>
      {VIEWS.map(({ key, label }) => (
        <button
          key={key}
          onClick={() => onViewChange(key)}
          style={{
            background: activeView === key ? 'var(--red)' : 'var(--navy-mid)',
            color: 'var(--text)',
            border: 'none',
            borderRadius: '6px',
            padding: '8px 18px',
            fontSize: '14px',
            fontWeight: activeView === key ? 600 : 400,
            cursor: 'pointer',
          }}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
