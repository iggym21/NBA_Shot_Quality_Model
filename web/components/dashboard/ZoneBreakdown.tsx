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

  const maxFg = Math.max(...ZONES.flatMap((z) => [team.zones[z].actual, team.zones[z].expected]))

  return (
    <div>
      {/* Team selector */}
      <div style={{ marginBottom: '32px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '9px',
            letterSpacing: '0.14em',
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            flexShrink: 0,
          }}
        >
          TEAM
        </span>
        <select
          value={selectedName}
          onChange={(e) => setSelectedName(e.target.value)}
          style={{
            background: 'var(--bg-card)',
            color: 'var(--text)',
            border: '1px solid var(--border-2)',
            borderRadius: '3px',
            padding: '7px 36px 7px 14px',
            fontSize: '14px',
            fontFamily: 'var(--font-body), sans-serif',
            fontWeight: 600,
            cursor: 'pointer',
            outline: 'none',
            appearance: 'none',
            WebkitAppearance: 'none',
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%233E4C5E' strokeWidth='1.5' fill='none' strokeLinecap='round'/%3E%3C/svg%3E")`,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right 12px center',
          }}
        >
          {teams.map((t) => (
            <option key={t.name} value={t.name}>{t.name}</option>
          ))}
        </select>

        {/* Overall delta badge */}
        {(() => {
          const d = team.overall.actual - team.overall.expected
          const color = d >= 0 ? 'var(--green)' : 'var(--red)'
          const bg = d >= 0 ? 'var(--green-dim)' : 'var(--red-dim)'
          return (
            <div style={{
              background: bg,
              border: `1px solid ${color}`,
              borderRadius: '3px',
              padding: '4px 10px',
              fontFamily: 'var(--font-mono)',
              fontSize: '12px',
              color,
              letterSpacing: '0.06em',
            }}>
              {d >= 0 ? '+' : ''}{(d * 100).toFixed(1)}% OVERALL
            </div>
          )
        })()}
      </div>

      {/* Zone bars */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {ZONES.map((zone) => {
          const { actual, expected, fga } = team.zones[zone]
          const delta = actual - expected
          const deltaColor = delta >= 0 ? 'var(--green)' : 'var(--red)'
          const actualW = (actual / maxFg) * 100
          const expectedW = (expected / maxFg) * 100

          return (
            <div key={zone}>
              {/* Zone header */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  marginBottom: '10px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
                  <span
                    style={{
                      fontFamily: 'var(--font-body)',
                      fontSize: '15px',
                      fontWeight: 700,
                      letterSpacing: '0.04em',
                      textTransform: 'uppercase',
                      color: 'var(--text)',
                    }}
                  >
                    {zone}
                  </span>
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '9px',
                      color: 'var(--text-muted)',
                      letterSpacing: '0.08em',
                    }}
                  >
                    {fga.toLocaleString()} FGA
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: '22px', color: 'var(--text)' }}>
                    {(actual * 100).toFixed(1)}%
                  </span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)' }}>
                    vs {(expected * 100).toFixed(1)}% exp
                  </span>
                  <span style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '12px',
                    color: deltaColor,
                    fontWeight: 600,
                  }}>
                    ({delta >= 0 ? '+' : ''}{(delta * 100).toFixed(1)}%)
                  </span>
                </div>
              </div>

              {/* Actual bar */}
              <div style={{ marginBottom: '4px' }}>
                <div style={{
                  height: '10px',
                  background: 'var(--bg-elevated)',
                  borderRadius: '1px',
                  overflow: 'hidden',
                }}>
                  <div style={{
                    width: `${actualW}%`,
                    height: '100%',
                    background: 'var(--red)',
                    borderRadius: '1px',
                    transition: 'width 0.4s cubic-bezier(0.25,0.46,0.45,0.94)',
                    boxShadow: '4px 0 12px rgba(255,23,68,0.4)',
                  }} />
                </div>
              </div>

              {/* Expected bar */}
              <div style={{
                height: '4px',
                background: 'var(--bg-elevated)',
                borderRadius: '1px',
                overflow: 'hidden',
              }}>
                <div style={{
                  width: `${expectedW}%`,
                  height: '100%',
                  background: 'rgba(255,255,255,0.2)',
                  borderRadius: '1px',
                  transition: 'width 0.4s cubic-bezier(0.25,0.46,0.45,0.94)',
                }} />
              </div>
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: '24px', marginTop: '28px' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '20px', height: '8px', background: 'var(--red)', borderRadius: '1px' }} />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Actual FG%
          </span>
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '20px', height: '4px', background: 'rgba(255,255,255,0.2)', borderRadius: '1px' }} />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Expected FG%
          </span>
        </span>
      </div>
    </div>
  )
}
