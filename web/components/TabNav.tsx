'use client'

export type Tab = 'predictor' | 'dashboard'

interface TabNavProps {
  activeTab: Tab
  onTabChange: (tab: Tab) => void
}

export default function TabNav({ activeTab, onTabChange }: TabNavProps) {
  return (
    <nav
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '24px',
        padding: '14px 24px',
        background: 'var(--navy-dark)',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
      }}
    >
      <span style={{ fontWeight: 700, color: 'var(--red)', fontSize: '17px' }}>
        🏀 NBA Shot Quality
      </span>
      {(['predictor', 'dashboard'] as Tab[]).map((tab) => (
        <button
          key={tab}
          onClick={() => onTabChange(tab)}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: activeTab === tab ? 'var(--text)' : 'var(--text-muted)',
            fontSize: '15px',
            fontWeight: activeTab === tab ? 600 : 400,
            borderBottom: activeTab === tab ? '2px solid var(--red)' : '2px solid transparent',
            paddingBottom: '4px',
          }}
        >
          {tab === 'predictor' ? 'Shot Predictor' : 'Team Dashboard'}
        </button>
      ))}
    </nav>
  )
}
