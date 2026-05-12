'use client'

import { useState } from 'react'
import type { TeamData } from '@/lib/teamData'

type SortDir = 'desc' | 'asc'

interface LeaderboardProps {
  teams: TeamData[]
}

export default function Leaderboard({ teams }: LeaderboardProps) {
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  const rows = teams
    .map((t) => ({
      name: t.name,
      actual: t.overall.actual,
      expected: t.overall.expected,
      delta: t.overall.actual - t.overall.expected,
    }))
    .sort((a, b) => (sortDir === 'desc' ? b.delta - a.delta : a.delta - b.delta))

  const maxAbs = Math.max(...rows.map((r) => Math.abs(r.delta)))

  const thStyle: React.CSSProperties = {
    fontFamily: 'var(--font-mono)',
    fontSize: '9px',
    letterSpacing: '0.14em',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    padding: '10px 14px',
    textAlign: 'left',
    borderBottom: '1px solid var(--border-2)',
    fontWeight: 400,
    background: 'var(--bg-2)',
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ ...thStyle, width: '48px' }}>#</th>
            <th style={thStyle}>Team</th>
            <th style={{ ...thStyle, textAlign: 'right' }}>Actual</th>
            <th style={{ ...thStyle, textAlign: 'right' }}>Expected</th>
            <th
              style={{ ...thStyle, textAlign: 'right', cursor: 'pointer', userSelect: 'none', color: 'var(--text-2)' }}
              onClick={() => setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'))}
            >
              DELTA {sortDir === 'desc' ? '↓' : '↑'}
            </th>
            <th style={{ ...thStyle, width: '100px' }}></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const isTop3 = sortDir === 'desc' ? i < 3 : i >= rows.length - 3
            const color = row.delta >= 0 ? 'var(--green)' : 'var(--red)'
            const barPct = (Math.abs(row.delta) / maxAbs) * 100

            return (
              <tr
                key={row.name}
                style={{
                  borderBottom: '1px solid var(--border)',
                  background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)',
                }}
              >
                {/* Rank */}
                <td style={{ padding: '13px 14px' }}>
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '12px',
                      color: isTop3 ? color : 'var(--text-muted)',
                      fontWeight: isTop3 ? 600 : 400,
                    }}
                  >
                    {i + 1}
                  </span>
                </td>

                {/* Team name */}
                <td style={{ padding: '13px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {/* Left accent bar for top/bottom 3 */}
                    {isTop3 && (
                      <div style={{
                        width: '3px',
                        height: '16px',
                        background: color,
                        borderRadius: '1px',
                        flexShrink: 0,
                        boxShadow: `0 0 8px ${color === 'var(--green)' ? 'rgba(0,230,118,0.5)' : 'rgba(255,23,68,0.5)'}`,
                      }} />
                    )}
                    <span style={{
                      fontSize: '14px',
                      fontWeight: isTop3 ? 600 : 400,
                      color: isTop3 ? 'var(--text)' : 'var(--text-2)',
                    }}>
                      {row.name}
                    </span>
                  </div>
                </td>

                {/* Actual */}
                <td style={{ padding: '13px 14px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: '13px' }}>
                  {(row.actual * 100).toFixed(1)}%
                </td>

                {/* Expected */}
                <td style={{ padding: '13px 14px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--text-muted)' }}>
                  {(row.expected * 100).toFixed(1)}%
                </td>

                {/* Delta */}
                <td style={{ padding: '13px 14px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: '13px', color, fontWeight: 600, letterSpacing: '0.04em' }}>
                  {row.delta >= 0 ? '+' : ''}{(row.delta * 100).toFixed(1)}%
                </td>

                {/* Sparkbar */}
                <td style={{ padding: '13px 14px' }}>
                  <div style={{ background: 'var(--bg-elevated)', borderRadius: '1px', height: '6px', overflow: 'hidden' }}>
                    <div style={{
                      width: `${barPct}%`,
                      height: '100%',
                      background: color,
                      borderRadius: '1px',
                      transition: 'width 0.3s ease',
                    }} />
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
