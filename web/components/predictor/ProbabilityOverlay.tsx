interface ProbabilityOverlayProps {
  probability: number | null
  isLoading: boolean
}

export default function ProbabilityOverlay({ probability, isLoading }: ProbabilityOverlayProps) {
  const label =
    probability === null ? null
    : probability >= 0.55 ? 'Likely Make'
    : probability >= 0.45 ? 'Contested'
    : 'Likely Miss'

  const color =
    probability === null ? 'var(--text-muted)'
    : probability >= 0.55 ? 'var(--green)'
    : probability >= 0.45 ? '#f4a261'
    : 'var(--red)'

  return (
    <div
      style={{
        position: 'absolute',
        top: '12px',
        right: '12px',
        textAlign: 'right',
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          fontSize: '38px',
          fontWeight: 700,
          lineHeight: 1,
          color,
          textShadow: '0 2px 8px rgba(0,0,0,0.6)',
        }}
      >
        {isLoading ? '…' : probability !== null ? `${Math.round(probability * 100)}%` : '—'}
      </div>
      {label && !isLoading && (
        <div
          style={{
            marginTop: '5px',
            fontSize: '12px',
            fontWeight: 600,
            background: color,
            color: '#fff',
            borderRadius: '4px',
            padding: '2px 8px',
            display: 'inline-block',
          }}
        >
          {label}
        </div>
      )}
    </div>
  )
}
