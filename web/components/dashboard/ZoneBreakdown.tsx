'use client'

import { useState } from 'react'
import type { TeamData } from '@/lib/teamData'

const ZONES = ['At Rim', 'Mid-Range', 'Corner 3', 'Above Break 3'] as const

interface ZoneBreakdownProps {
  teams: TeamData[]
}

export default function ZoneBreakdown({ teams }: ZoneBreakdownProps) {
  const [selectedName, setSelectedName] = useState(teams[0]?.name ?? '')
  const team = teams.find((t) => t.name === selectedName) ?? teams[0]

  if (!team) return null

  const maxFg = Math.max(
    ...ZONES.map((z) => Math.max(team.zones[z].actual, team.zones[z].expected))
  )

  return (
    <div>
      <select
        value={selectedName}
        onChange={(e) => setSelectedName(e.target.value)}
        style={{
          background: 'var(--navy-dark)',
          color: 'var(--text)',
          border: '1px solid rgba(255,255,255,0.2)',
          borderRadius: '6px',
          padding: '8px 14px',
          fontSize: '14px',
          marginBottom: '28px',
          cursor: 'pointer',
          width: '220px',
        }}
      >
        {teams.map((t) => (
          <option key={t.name} value={t.name}>
            {t.name}
          </option>
        ))}
      </select>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {ZONES.map((zone) => {
          const { actual, expected } = team.zones[zone]
          const delta = actual - expected
          const actualPct = (actual / maxFg) * 100
          const expectedPct = (expected / maxFg) * 100
          const deltaColor = delta >= 0 ? 'var(--green)' : 'var(--red)'

          return (
            <div key={zone}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: '8px',
                  fontSize: '13px',
                }}
              >
                <span style={{ color: 'var(--text-muted)' }}>{zone}</span>
                <span>
                  Actual <b>{(actual * 100).toFixed(1)}%</b>
                  {' · '}
                  Expected <b>{(expected * 100).toFixed(1)}%</b>
                  {' '}
                  <span style={{ color: deltaColor, fontWeight: 600 }}>
                    ({delta >= 0 ? '+' : ''}
                    {(delta * 100).toFixed(1)}%)
                  </span>
                </span>
              </div>
              {/* Actual FG% bar */}
              <div
                style={{
                  height: '10px',
                  background: 'var(--navy-mid)',
                  borderRadius: '5px',
                  overflow: 'hidden',
                  marginBottom: '4px',
                }}
              >
                <div
                  style={{
                    width: `${actualPct}%`,
                    height: '100%',
                    background: 'var(--red)',
                    borderRadius: '5px',
                    transition: 'width 0.3s ease',
                  }}
                />
              </div>
              {/* Expected FG% bar */}
              <div
                style={{
                  height: '10px',
                  background: 'var(--navy-mid)',
                  borderRadius: '5px',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: `${expectedPct}%`,
                    height: '100%',
                    background: 'transparent',
                    border: '1px solid rgba(255,255,255,0.4)',
                    borderRadius: '5px',
                    transition: 'width 0.3s ease',
                  }}
                />
              </div>
            </div>
          )
        })}
      </div>

      <div
        style={{
          display: 'flex',
          gap: '20px',
          marginTop: '20px',
          fontSize: '12px',
          color: 'var(--text-muted)',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span
            style={{
              width: '16px',
              height: '8px',
              background: 'var(--red)',
              borderRadius: '2px',
              display: 'inline-block',
            }}
          />
          Actual FG%
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span
            style={{
              width: '16px',
              height: '8px',
              border: '1px solid rgba(255,255,255,0.4)',
              borderRadius: '2px',
              display: 'inline-block',
            }}
          />
          Expected FG%
        </span>
      </div>
    </div>
  )
}
