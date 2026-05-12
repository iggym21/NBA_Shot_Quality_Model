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
    <div
      style={{
        display: 'flex',
        gap: '0',
        marginBottom: '28px',
        borderBottom: '1px solid var(--border)',
      }}
    >
      {VIEWS.map(({ key, label }) => {
        const isActive = activeView === key
        return (
          <button
            key={key}
            onClick={() => onViewChange(key)}
            style={{
              background: 'none',
              border: 'none',
              borderBottom: isActive ? '2px solid var(--red)' : '2px solid transparent',
              color: isActive ? 'var(--text)' : 'var(--text-muted)',
              cursor: 'pointer',
              fontFamily: 'var(--font-body), sans-serif',
              fontSize: '11px',
              fontWeight: isActive ? 700 : 500,
              letterSpacing: '0.12em',
              padding: '10px 22px',
              textTransform: 'uppercase',
              transition: 'color 0.15s ease, border-color 0.15s ease',
              marginBottom: '-1px',
            }}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}
