export interface ZoneStats {
  actual: number
  expected: number
  fga: number
}

export interface TeamData {
  name: string
  overall: { actual: number; expected: number }
  zones: {
    'At Rim': ZoneStats
    'Mid-Range': ZoneStats
    'Corner 3': ZoneStats
    'Above Break 3': ZoneStats
  }
}

export interface TeamStats {
  teams: TeamData[]
  season: string
  generated: string
}

import rawData from '@/data/team_stats.json'

export function getTeams(): TeamData[] {
  return (rawData as TeamStats).teams
}

export function getSeason(): string {
  return (rawData as TeamStats).season
}
