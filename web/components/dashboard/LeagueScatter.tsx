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

  const CustomDot = (props: Record<string, unknown>) => {
    const cx = props.cx as number
    const cy = props.cy as number
    const payload = props.payload as Point
    const isHL = payload.name === highlighted
    const delta = payload.y - payload.x
    const dotColor = isHL ? '#FF1744' : delta >= 0 ? '#00E676' : '#FF5252'

    return (
      <g
        style={{ cursor: 'pointer' }}
        onClick={() => setHighlighted(isHL ? null : payload.name)}
      >
        {isHL && <circle cx={cx} cy={cy} r={16} fill="rgba(255,23,68,0.15)" />}
        <circle
          cx={cx}
          cy={cy}
          r={isHL ? 7 : 5}
          fill={dotColor}
          style={{
            filter: isHL ? 'drop-shadow(0 0 6px #FF1744)' : 'none',
            transition: 'r 0.15s ease',
          }}
        />
        {isHL && (
          <text
            x={cx + 11}
            y={cy + 4}
            fill="#FFFFFF"
            fontSize={11}
            fontWeight={700}
            fontFamily="var(--font-mono)"
            letterSpacing="0.06em"
          >
            {ABBREV[payload.name] ?? payload.name}
          </text>
        )}
      </g>
    )
  }

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: { payload: Point }[] }) => {
    if (!active || !payload?.length) return null
    const p = payload[0].payload
    const delta = p.y - p.x
    const color = delta >= 0 ? '#00E676' : '#FF1744'
    return (
      <div style={{
        background: 'rgba(13,13,13,0.95)',
        border: `1px solid ${color}`,
        borderRadius: '4px',
        padding: '10px 14px',
        pointerEvents: 'none',
        boxShadow: `0 0 20px rgba(${delta >= 0 ? '0,230,118' : '255,23,68'}, 0.2)`,
      }}>
        <div style={{ fontFamily: 'var(--font-body)', fontSize: '14px', fontWeight: 700, marginBottom: '6px' }}>
          {p.name}
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: '#8A9BB0', marginBottom: '2px' }}>
          EXP  {p.x.toFixed(1)}%
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: '#8A9BB0', marginBottom: '4px' }}>
          ACT  {p.y.toFixed(1)}%
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color, fontWeight: 600 }}>
          {delta >= 0 ? '+' : ''}{delta.toFixed(1)}%
        </div>
      </div>
    )
  }

  return (
    <div>
      <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '20px' }}>
        Teams above the diagonal outperform model expectations · Click a dot to label it
      </p>
      <ResponsiveContainer width="100%" height={440}>
        <ScatterChart margin={{ top: 20, right: 40, bottom: 56, left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
          <XAxis
            type="number"
            dataKey="x"
            domain={[lo, hi]}
            tick={{ fill: '#3E4C5E', fontSize: 11, fontFamily: 'var(--font-mono)' }}
            tickLine={false}
            axisLine={{ stroke: 'rgba(255,255,255,0.08)' }}
          >
            <Label
              value="Expected FG% →"
              position="insideBottom"
              offset={-16}
              fill="#3E4C5E"
              fontSize={10}
              fontFamily="var(--font-mono)"
              letterSpacing="0.1em"
              style={{ textTransform: 'uppercase' }}
            />
          </XAxis>
          <YAxis
            type="number"
            dataKey="y"
            domain={[lo, hi]}
            tick={{ fill: '#3E4C5E', fontSize: 11, fontFamily: 'var(--font-mono)' }}
            tickLine={false}
            axisLine={{ stroke: 'rgba(255,255,255,0.08)' }}
          >
            <Label
              value="Actual FG% →"
              angle={-90}
              position="insideLeft"
              fill="#3E4C5E"
              fontSize={10}
              fontFamily="var(--font-mono)"
              letterSpacing="0.1em"
              style={{ textTransform: 'uppercase' }}
            />
          </YAxis>
          <ReferenceLine
            segment={[{ x: lo, y: lo }, { x: hi, y: hi }]}
            stroke="rgba(255,255,255,0.12)"
            strokeDasharray="5 5"
          />
          <Tooltip content={<CustomTooltip />} />
          <Scatter data={data} shape={<CustomDot />} />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  )
}
