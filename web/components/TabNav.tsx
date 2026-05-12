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
        alignItems: 'stretch',
        background: 'rgba(8, 8, 8, 0.95)',
        borderBottom: '1px solid var(--border-2)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        backdropFilter: 'blur(12px)',
        height: '56px',
      }}
    >
      {/* Brand */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '0 28px 0 20px',
          borderRight: '1px solid var(--border)',
          gap: '10px',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: '4px',
            height: '28px',
            background: 'var(--red)',
            boxShadow: 'var(--red-glow)',
            borderRadius: '1px',
          }}
        />
        <span
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '24px',
            letterSpacing: '0.06em',
            color: 'var(--text)',
            lineHeight: 1,
            userSelect: 'none',
          }}
        >
          SWISH INDEX
        </span>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', flex: 1 }}>
        {(['predictor', 'dashboard'] as Tab[]).map((tab) => {
          const isActive = activeTab === tab
          return (
            <button
              key={tab}
              onClick={() => onTabChange(tab)}
              style={{
                background: 'none',
                border: 'none',
                borderBottom: isActive ? '2px solid var(--red)' : '2px solid transparent',
                borderTop: '2px solid transparent',
                color: isActive ? 'var(--text)' : 'var(--text-muted)',
                cursor: 'pointer',
                fontSize: '11px',
                fontWeight: 600,
                letterSpacing: '0.14em',
                padding: '0 24px',
                textTransform: 'uppercase',
                fontFamily: 'var(--font-body), sans-serif',
                transition: 'color 0.15s ease, border-color 0.15s ease',
              }}
            >
              {tab === 'predictor' ? 'Shot Predictor' : 'Team Dashboard'}
            </button>
          )
        })}
      </div>

      {/* Right badge */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '0 20px',
          borderLeft: '1px solid var(--border)',
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '10px',
            color: 'var(--text-muted)',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
          }}
        >
          XGBoost · 2019–24
        </span>
      </div>
    </nav>
  )
}
