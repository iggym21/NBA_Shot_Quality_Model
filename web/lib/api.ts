import type { ShotParams } from '@/components/predictor/SliderGrid'

export type { ShotParams }

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
