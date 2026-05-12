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
    .sort((a, b) =>
      sortDir === 'desc' ? b.delta - a.delta : a.delta - b.delta
    )

  const maxAbs = Math.max(...rows.map((r) => Math.abs(r.delta)))

  const th: React.CSSProperties = {
    padding: '10px 12px',
    textAlign: 'left',
    color: 'var(--text-muted)',
    fontSize: '12px',
    fontWeight: 500,
    borderBottom: '1px solid rgba(255,255,255,0.15)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
        <thead>
          <tr>
            <th style={th}>#</th>
            <th style={th}>Team</th>
            <th style={{ ...th, textAlign: 'right' }}>Actual</th>
            <th style={{ ...th, textAlign: 'right' }}>Expected</th>
            <th
              style={{ ...th, textAlign: 'right', cursor: 'pointer' }}
              onClick={() => setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'))}
            >
              Delta {sortDir === 'desc' ? '↓' : '↑'}
            </th>
            <th style={{ ...th, width: '90px' }}></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const color = row.delta >= 0 ? 'var(--green)' : 'var(--red)'
            const barPct = (Math.abs(row.delta) / maxAbs) * 100
            return (
              <tr
                key={row.name}
                style={{
                  borderBottom: '1px solid rgba(255,255,255,0.05)',
                }}
              >
                <td
                  style={{
                    padding: '12px',
                    color: 'var(--text-muted)',
                    fontSize: '13px',
                  }}
                >
                  {i + 1}
                </td>
                <td style={{ padding: '12px' }}>{row.name}</td>
                <td style={{ padding: '12px', textAlign: 'right' }}>
                  {(row.actual * 100).toFixed(1)}%
                </td>
                <td
                  style={{
                    padding: '12px',
                    textAlign: 'right',
                    color: 'var(--text-muted)',
                  }}
                >
                  {(row.expected * 100).toFixed(1)}%
                </td>
                <td
                  style={{
                    padding: '12px',
                    textAlign: 'right',
                    color,
                    fontWeight: 600,
                  }}
                >
                  {row.delta >= 0 ? '+' : ''}
                  {(row.delta * 100).toFixed(1)}%
                </td>
                <td style={{ padding: '12px' }}>
                  <div
                    style={{
                      background: 'var(--navy-mid)',
                      borderRadius: '3px',
                      height: '8px',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        width: `${barPct}%`,
                        height: '100%',
                        background: color,
                        borderRadius: '3px',
                        transition: 'width 0.3s ease',
                      }}
                    />
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
