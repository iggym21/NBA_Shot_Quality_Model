'use client'

import type React from 'react'

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

  const line = 'rgba(255,255,255,0.18)'
  const lineStrong = 'rgba(255,255,255,0.3)'

  return (
    <div style={{ position: 'relative', width: '100%', maxWidth: '520px' }}>
      <svg
        viewBox="0 0 500 470"
        style={{
          width: '100%',
          background: '#0b0f18',
          borderRadius: '6px',
          display: 'block',
          border: '1px solid var(--border-2)',
        }}
      >
        <defs>
          <radialGradient id="floorGlow" cx="50%" cy="92%" r="55%">
            <stop offset="0%" stopColor="#FF1744" stopOpacity="0.06" />
            <stop offset="100%" stopColor="#FF1744" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="shotGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FF1744" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#FF1744" stopOpacity="0" />
          </radialGradient>
          <filter id="glowFilter">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Floor ambient glow near basket */}
        <rect x={0} y={0} width={500} height={470} fill="url(#floorGlow)" />

        {/* Paint / lane */}
        <rect x={170} y={240} width={160} height={190} fill="rgba(255,23,68,0.04)" stroke={line} strokeWidth={1.5} />

        {/* Lane tick marks */}
        {[260, 290, 320, 350, 380, 410].map((y) => (
          <g key={y}>
            <line x1={170} y1={y} x2={182} y2={y} stroke={line} strokeWidth={1} />
            <line x1={318} y1={y} x2={330} y2={y} stroke={line} strokeWidth={1} />
          </g>
        ))}

        {/* Free throw line */}
        <line x1={170} y1={240} x2={330} y2={240} stroke={lineStrong} strokeWidth={2} />

        {/* Free throw circle — top half dashed, bottom solid */}
        <path d="M 190 240 A 60 60 0 0 1 310 240" fill="none" stroke={line} strokeWidth={1.5} />
        <path d="M 190 240 A 60 60 0 0 0 310 240" fill="none" stroke={line} strokeWidth={1.5} strokeDasharray="5 4" />

        {/* Restricted area arc */}
        <path d="M 210 430 A 40 40 0 0 1 290 430" fill="none" stroke={line} strokeWidth={1.5} />

        {/* Three-point corner lines */}
        <line x1={30} y1={470} x2={30} y2={340} stroke={line} strokeWidth={1.5} />
        <line x1={470} y1={470} x2={470} y2={340} stroke={line} strokeWidth={1.5} />

        {/* Three-point arc */}
        <path d="M 30 340 A 237.5 237.5 0 0 1 470 340" fill="none" stroke={line} strokeWidth={1.5} />

        {/* Baseline */}
        <line x1={0} y1={470} x2={500} y2={470} stroke={lineStrong} strokeWidth={2} />

        {/* Sidelines (partial) */}
        <line x1={0} y1={0} x2={0} y2={470} stroke={line} strokeWidth={1} />
        <line x1={500} y1={0} x2={500} y2={470} stroke={line} strokeWidth={1} />

        {/* Backboard */}
        <rect x={215} y={452} width={70} height={6} rx={1} fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.5)" strokeWidth={2} />

        {/* Basket ring */}
        <circle cx={250} cy={430} r={9} fill="none" stroke="var(--red)" strokeWidth={2} filter="url(#glowFilter)" />

        {/* Shot marker */}
        <g
          transform={`translate(${markerX}, ${markerY})`}
          style={{ transition: 'transform 0.12s cubic-bezier(0.25, 0.46, 0.45, 0.94)' }}
        >
          <circle r={24} fill="url(#shotGlow)" />
          <circle r={10} fill="var(--red)" />
          <circle r={10} fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth={1.5} />
          <circle r={3} fill="rgba(255,255,255,0.8)" />
        </g>

        {/* Distance label at bottom */}
        <text
          x={250}
          y={20}
          textAnchor="middle"
          fontFamily="var(--font-mono)"
          fontSize={10}
          fill="rgba(255,255,255,0.2)"
          letterSpacing="0.1em"
        >
          HALF COURT
        </text>
      </svg>
      {children}
    </div>
  )
}
