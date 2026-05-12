export interface ShotParams {
  shot_distance: number
  shot_angle: number
  defender_distance: number
  seconds_in_period: number
  quarter: number
  score_differential: number
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

export async function predict(params: ShotParams): Promise<number> {
  const res = await fetch(`${API_URL}/predict`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })
  if (!res.ok) throw new Error(`predict failed: ${res.status}`)
  const data = (await res.json()) as { probability: number }
  return data.probability
}
