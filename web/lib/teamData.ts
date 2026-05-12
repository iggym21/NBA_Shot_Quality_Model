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

interface SeasonData {
  teams: TeamData[]
}

interface TeamStats {
  seasons: Record<string, SeasonData>
  generated: string
}

import rawData from '@/data/team_stats.json'

const data = rawData as TeamStats

export function getSeasons(): string[] {
  return Object.keys(data.seasons).sort().reverse()
}

export function getTeamsBySeason(season: string): TeamData[] {
  return data.seasons[season]?.teams ?? []
}

export function getLatestSeason(): string {
  return getSeasons()[0]
}
