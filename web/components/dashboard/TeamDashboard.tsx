'use client'

import { useState } from 'react'
import ViewToggle, { type DashboardView } from './ViewToggle'
import ZoneBreakdown from './ZoneBreakdown'
import LeagueScatter from './LeagueScatter'
import Leaderboard from './Leaderboard'
import { getTeams, getSeason } from '@/lib/teamData'

export default function TeamDashboard() {
  const [view, setView] = useState<DashboardView>('zones')
  const teams = getTeams()
  const season = getSeason()

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginBottom: '24px',
        }}
      >
        <h1 style={{ fontSize: '22px', fontWeight: 700 }}>Team Dashboard</h1>
        <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
          {season}
        </span>
      </div>
      <ViewToggle activeView={view} onViewChange={setView} />
      {view === 'zones' && <ZoneBreakdown teams={teams} />}
      {view === 'scatter' && <LeagueScatter teams={teams} />}
      {view === 'leaderboard' && <Leaderboard teams={teams} />}
    </div>
  )
}
