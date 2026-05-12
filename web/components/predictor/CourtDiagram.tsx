interface CourtDiagramProps {
  distance: number
  angle: number
  children?: React.ReactNode
}

export default function CourtDiagram({ distance, angle, children }: CourtDiagramProps) {
  const d = Math.min(distance, 34)
  const rad = (angle * Math.PI) / 180
  const markerX = 250 + d * 10 * Math.sin(rad)
  const markerY = 430 - d * 10 * Math.cos(rad)

  return (
    <div style={{ position: 'relative', width: '100%', maxWidth: '500px' }}>
      <svg
        viewBox="0 0 500 470"
        style={{
          width: '100%',
          background: 'var(--navy-dark)',
          borderRadius: '8px',
          display: 'block',
        }}
      >
        {/* Paint / lane */}
        <rect
          x={170} y={240} width={160} height={190}
          fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth={2}
        />
        {/* Free throw circle */}
        <circle
          cx={250} cy={240} r={60}
          fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth={2}
        />
        {/* Restricted area arc */}
        <path
          d="M 210 430 A 40 40 0 0 1 290 430"
          fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth={2}
        />
        {/* Three-point corner lines */}
        <line x1={30} y1={470} x2={30} y2={340} stroke="rgba(255,255,255,0.25)" strokeWidth={2} />
        <line x1={470} y1={470} x2={470} y2={340} stroke="rgba(255,255,255,0.25)" strokeWidth={2} />
        {/* Three-point arc */}
        <path
          d="M 30 340 A 237.5 237.5 0 0 1 470 340"
          fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth={2}
        />
        {/* Baseline */}
        <line x1={0} y1={470} x2={500} y2={470} stroke="rgba(255,255,255,0.25)" strokeWidth={2} />
        {/* Backboard */}
        <line x1={215} y1={458} x2={285} y2={458} stroke="rgba(255,255,255,0.5)" strokeWidth={3} />
        {/* Basket */}
        <circle cx={250} cy={430} r={9} fill="none" stroke="var(--red)" strokeWidth={2} />
        {/* Shot marker — CSS transition via transform */}
        <g
          transform={`translate(${markerX}, ${markerY})`}
          style={{ transition: 'transform 0.15s ease' }}
        >
          <circle
            r={10}
            fill="var(--red)"
            style={{ filter: 'drop-shadow(0 0 6px var(--red))' }}
          />
        </g>
      </svg>
      {children}
    </div>
  )
}
