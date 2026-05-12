'use client'

import { useState, useEffect, useRef } from 'react'
import CourtDiagram from './CourtDiagram'
import SliderGrid from './SliderGrid'
import ProbabilityOverlay from './ProbabilityOverlay'
import { predict } from '@/lib/api'
import type { ShotParams } from './SliderGrid'

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
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(async () => {
      setIsLoading(true)
      try {
        const prob = await predict(params)
        setProbability(prob)
      } catch {
        // Keep showing previous probability if API is unreachable
      } finally {
        setIsLoading(false)
      }
    }, 150)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [params])

  return (
    <div>
      <h1 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '20px' }}>
        Shot Predictor
      </h1>
      <CourtDiagram distance={params.shot_distance} angle={params.shot_angle}>
        <ProbabilityOverlay probability={probability} isLoading={isLoading} />
      </CourtDiagram>
      <SliderGrid params={params} onChange={setParams} />
    </div>
  )
}
