'use client'

import { useState, useEffect, useRef } from 'react'
import CourtDiagram from './CourtDiagram'
import SliderGrid from './SliderGrid'
import ProbabilityOverlay from './ProbabilityOverlay'
import { predict } from '@/lib/api'
import type { ShotParams } from '@/lib/api'

const DEFAULT_PARAMS: ShotParams = {
  shot_distance: 15,
  shot_angle: 0,
  defender_distance: 2,
  seconds_in_period: 300,
  quarter: 2,
  score_differential: 0,
}

export default function ShotPredictor() {
  const [params, setParams] = useState<ShotParams>(DEFAULT_PARAMS)
  const [probability, setProbability] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [apiOnline, setApiOnline] = useState<boolean | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(async () => {
      setIsLoading(true)
      try {
        const prob = await predict(params)
        setProbability(prob)
        setApiOnline(true)
      } catch {
        setApiOnline(false)
      } finally {
        setIsLoading(false)
      }
    }, 150)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [params])

  return (
    <div style={{ paddingTop: '4px' }}>
      {/* Section header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: '12px',
          marginBottom: '16px',
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
          SHOT PREDICTOR
        </h2>
        {/* API status dot */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <div
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background:
                apiOnline === null
                  ? 'var(--text-muted)'
                  : apiOnline
                  ? 'var(--green)'
                  : 'var(--red)',
              boxShadow:
                apiOnline === true
                  ? '0 0 8px rgba(0,230,118,0.8)'
                  : apiOnline === false
                  ? '0 0 8px rgba(255,23,68,0.8)'
                  : 'none',
            }}
          />
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '10px',
              letterSpacing: '0.1em',
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
            }}
          >
            {apiOnline === null ? 'CONNECTING' : apiOnline ? 'LIVE' : 'OFFLINE — start uvicorn to enable predictions'}
          </span>
        </div>
      </div>

      {/* Two-column layout */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '2px',
          alignItems: 'start',
        }}
      >
        {/* Left: court */}
        <div>
          <CourtDiagram distance={params.shot_distance} angle={params.shot_angle}>
            <ProbabilityOverlay probability={probability} isLoading={isLoading} />
          </CourtDiagram>
        </div>

        {/* Right: slider grid as 2 columns */}
        <div>
          <SliderGrid params={params} onChange={setParams} twoCol />
        </div>
      </div>
    </div>
  )
}
