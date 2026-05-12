'use client'

import { useState } from 'react'
import ViewToggle, { type DashboardView } from './ViewToggle'
import ZoneBreakdown from './ZoneBreakdown'
import LeagueScatter from './LeagueScatter'
import Leaderboard from './Leaderboard'
import { getSeasons, getTeamsBySeason, getLatestSeason } from '@/lib/teamData'

const SEASONS = getSeasons()

export default function TeamDashboard() {
  const [view, setView] = useState<DashboardView>('zones')
  const [season, setSeason] = useState(getLatestSeason())
  const teams = getTeamsBySeason(season)

  return (
    <div style={{ paddingTop: '4px' }}>
      {/* Header row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '20px',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <h2
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '32px',
            letterSpacing: '0.04em',
            lineHeight: 1,
            color: 'var(--text)',
          }}
        >
          TEAM DASHBOARD
        </h2>

        {/* Season selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '9px',
              letterSpacing: '0.14em',
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
            }}
          >
            SEASON
          </span>
          <select
            value={season}
            onChange={(e) => setSeason(e.target.value)}
            style={{
              background: 'var(--bg-card)',
              color: 'var(--text)',
              border: '1px solid var(--border-2)',
              borderRadius: '3px',
              padding: '6px 32px 6px 12px',
              fontSize: '13px',
              fontFamily: 'var(--font-mono)',
              letterSpacing: '0.06em',
              cursor: 'pointer',
              outline: 'none',
              appearance: 'none',
              WebkitAppearance: 'none',
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%233E4C5E' strokeWidth='1.5' fill='none' strokeLinecap='round'/%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 10px center',
            }}
          >
            {SEASONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      <ViewToggle activeView={view} onViewChange={setView} />

      {view === 'zones' && <ZoneBreakdown teams={teams} />}
      {view === 'scatter' && <LeagueScatter teams={teams} />}
      {view === 'leaderboard' && <Leaderboard teams={teams} />}
    </div>
  )
}
