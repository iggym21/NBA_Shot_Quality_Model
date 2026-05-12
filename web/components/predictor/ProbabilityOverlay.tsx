interface ProbabilityOverlayProps {
  probability: number | null
  isLoading: boolean
}

export default function ProbabilityOverlay({ probability, isLoading }: ProbabilityOverlayProps) {
  const pct = probability !== null ? Math.round(probability * 100) : null

  const color =
    probability === null ? 'var(--text-muted)'
    : probability >= 0.55 ? 'var(--green)'
    : probability >= 0.45 ? 'var(--gold)'
    : 'var(--red)'

  const glowColor =
    probability === null ? 'transparent'
    : probability >= 0.55 ? 'rgba(0,230,118,0.2)'
    : probability >= 0.45 ? 'rgba(255,214,10,0.2)'
    : 'rgba(255,23,68,0.2)'

  const label =
    probability === null ? null
    : probability >= 0.55 ? 'LIKELY MAKE'
    : probability >= 0.45 ? 'CONTESTED'
    : 'LIKELY MISS'

  return (
    <div
      style={{
        position: 'absolute',
        top: '12px',
        right: '12px',
        pointerEvents: 'none',
        textAlign: 'right',
      }}
    >
      <div
        style={{
          background: 'rgba(8, 8, 8, 0.88)',
          border: `1px solid ${probability !== null ? color : 'var(--border-2)'}`,
          borderRadius: '4px',
          padding: '10px 16px 12px',
          backdropFilter: 'blur(10px)',
          boxShadow: probability !== null ? `0 0 28px ${glowColor}` : 'none',
          minWidth: '110px',
        }}
      >
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '9px',
            letterSpacing: '0.16em',
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            marginBottom: '1px',
          }}
        >
          MAKE %
        </div>
        <div
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '58px',
            lineHeight: 1,
            color,
            letterSpacing: '0.02em',
          }}
        >
          {isLoading ? '···' : pct !== null ? `${pct}%` : '—'}
        </div>
        {label && !isLoading && (
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '9px',
              letterSpacing: '0.12em',
              color,
              marginTop: '3px',
              textTransform: 'uppercase',
            }}
          >
            {label}
          </div>
        )}
      </div>
    </div>
  )
}
