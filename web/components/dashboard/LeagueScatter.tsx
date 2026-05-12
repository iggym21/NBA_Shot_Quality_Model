'use client'

import { useState } from 'react'
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Label,
} from 'recharts'
import type { TeamData } from '@/lib/teamData'

const ABBREV: Record<string, string> = {
  'Atlanta Hawks': 'ATL',
  'Boston Celtics': 'BOS',
  'Brooklyn Nets': 'BKN',
  'Charlotte Hornets': 'CHA',
  'Chicago Bulls': 'CHI',
  'Cleveland Cavaliers': 'CLE',
  'Dallas Mavericks': 'DAL',
  'Denver Nuggets': 'DEN',
  'Detroit Pistons': 'DET',
  'Golden State Warriors': 'GSW',
  'Houston Rockets': 'HOU',
  'Indiana Pacers': 'IND',
  'LA Clippers': 'LAC',
  'Los Angeles Lakers': 'LAL',
  'Memphis Grizzlies': 'MEM',
  'Miami Heat': 'MIA',
  'Milwaukee Bucks': 'MIL',
  'Minnesota Timberwolves': 'MIN',
  'New Orleans Pelicans': 'NOP',
  'New York Knicks': 'NYK',
  'Oklahoma City Thunder': 'OKC',
  'Orlando Magic': 'ORL',
  'Philadelphia 76ers': 'PHI',
  'Phoenix Suns': 'PHX',
  'Portland Trail Blazers': 'POR',
  'Sacramento Kings': 'SAC',
  'San Antonio Spurs': 'SAS',
  'Toronto Raptors': 'TOR',
  'Utah Jazz': 'UTA',
  'Washington Wizards': 'WAS',
}

interface LeagueScatterProps {
  teams: TeamData[]
}

interface Point {
  x: number
  y: number
  name: string
}

export default function LeagueScatter({ teams }: LeagueScatterProps) {
  const [highlighted, setHighlighted] = useState<string | null>(null)

  const data: Point[] = teams.map((t) => ({
    x: parseFloat((t.overall.expected * 100).toFixed(2)),
    y: parseFloat((t.overall.actual * 100).toFixed(2)),
    name: t.name,
  }))

  const allVals = data.flatMap((d) => [d.x, d.y])
  const lo = Math.floor(Math.min(...allVals)) - 0.5
  const hi = Math.ceil(Math.max(...allVals)) + 0.5

  const CustomDot = (props: any) => {
    const { cx, cy, payload } = props
    const isHL = payload.name === highlighted
    return (
      <g
        style={{ cursor: 'pointer' }}
        onClick={() => setHighlighted(isHL ? null : payload.name)}
      >
        <circle
          cx={cx}
          cy={cy}
          r={isHL ? 8 : 5}
          fill={isHL ? 'var(--red)' : '#4a90d9'}
          style={{ filter: isHL ? 'drop-shadow(0 0 5px var(--red))' : 'none' }}
        />
        {isHL && (
          <text
            x={cx + 10}
            y={cy + 4}
            fill="var(--text)"
            fontSize={11}
            fontWeight={600}
          >
            {ABBREV[payload.name] ?? payload.name}
          </text>
        )}
      </g>
    )
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null
    const p = payload[0].payload as Point
    const delta = p.y - p.x
    return (
      <div
        style={{
          background: 'var(--navy-dark)',
          border: '1px solid rgba(255,255,255,0.2)',
          borderRadius: '6px',
          padding: '10px 14px',
          fontSize: '13px',
          pointerEvents: 'none',
        }}
      >
        <div style={{ fontWeight: 700, marginBottom: '4px' }}>{p.name}</div>
        <div style={{ color: 'var(--text-muted)' }}>
          Expected: {p.x.toFixed(1)}%
        </div>
        <div style={{ color: 'var(--text-muted)' }}>
          Actual: {p.y.toFixed(1)}%
        </div>
        <div
          style={{
            color: delta >= 0 ? 'var(--green)' : 'var(--red)',
            fontWeight: 600,
            marginTop: '4px',
          }}
        >
          {delta >= 0 ? '+' : ''}
          {delta.toFixed(1)}%
        </div>
      </div>
    )
  }

  return (
    <div>
      <p
        style={{
          color: 'var(--text-muted)',
          fontSize: '13px',
          marginBottom: '16px',
        }}
      >
        Teams above the diagonal outperform the model. Click a dot to label it.
      </p>
      <ResponsiveContainer width="100%" height={420}>
        <ScatterChart margin={{ top: 20, right: 30, bottom: 50, left: 20 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(255,255,255,0.08)"
          />
          <XAxis
            type="number"
            dataKey="x"
            domain={[lo, hi]}
            tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
            tickLine={{ stroke: 'var(--text-muted)' }}
            axisLine={{ stroke: 'rgba(255,255,255,0.2)' }}
          >
            <Label
              value="Expected FG% →"
              position="insideBottom"
              offset={-10}
              fill="var(--text-muted)"
              fontSize={12}
            />
          </XAxis>
          <YAxis
            type="number"
            dataKey="y"
            domain={[lo, hi]}
            tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
            tickLine={{ stroke: 'var(--text-muted)' }}
            axisLine={{ stroke: 'rgba(255,255,255,0.2)' }}
          >
            <Label
              value="Actual FG% →"
              angle={-90}
              position="insideLeft"
              fill="var(--text-muted)"
              fontSize={12}
            />
          </YAxis>
          <ReferenceLine
            segment={[
              { x: lo, y: lo },
              { x: hi, y: hi },
            ]}
            stroke="rgba(255,255,255,0.2)"
            strokeDasharray="4 4"
          />
          <Tooltip content={<CustomTooltip />} />
          <Scatter data={data} shape={<CustomDot />} />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  )
}
