# NBA Shot Quality Model — Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Next.js + FastAPI web app with an interactive shot probability predictor and a three-view team shot quality dashboard.

**Architecture:** Next.js 14 App Router frontend (tab layout: Shot Predictor | Team Dashboard) calls a FastAPI `/predict` endpoint for live predictions; team dashboard reads a pre-computed `team_stats.json` bundled into Next.js. FastAPI loads the saved XGBoost model once at startup via lifespan context manager.

**Tech Stack:** Next.js 14, React 18, TypeScript, Recharts 2.x, FastAPI, Pydantic v2, XGBoost, pandas, pytest

---

## File Map

```
web/
├── app/
│   ├── page.tsx                    # Root — tab state, renders ShotPredictor or TeamDashboard
│   ├── layout.tsx                  # HTML shell, Inter font, metadata
│   └── globals.css                 # CSS custom properties (colors), reset
├── components/
│   ├── TabNav.tsx                  # Predictor | Dashboard tab buttons
│   ├── predictor/
│   │   ├── ShotPredictor.tsx       # State owner: params + probability; debounced API calls
│   │   ├── CourtDiagram.tsx        # SVG half-court with animated shot marker
│   │   ├── SliderGrid.tsx          # 6-slider 3-column input grid
│   │   └── ProbabilityOverlay.tsx  # % + label overlaid on court (absolute positioned)
│   └── dashboard/
│       ├── TeamDashboard.tsx       # Loads teams, owns sub-view state
│       ├── ViewToggle.tsx          # Zone | Scatter | Leaderboard switcher
│       ├── ZoneBreakdown.tsx       # Team selector + 4-zone actual/expected bars
│       ├── LeagueScatter.tsx       # Recharts scatter plot (all 30 teams)
│       └── Leaderboard.tsx         # Ranked table with sparkbars, sortable
├── lib/
│   ├── api.ts                      # predict() → POST /predict; exports ShotParams type
│   └── teamData.ts                 # getTeams(), getSeason(); exports TeamData type
├── data/
│   └── team_stats.json             # Pre-computed 30-team data (4 zones each)
├── package.json
├── tsconfig.json
└── next.config.js

api/
├── main.py                         # FastAPI app: /predict + /health
├── requirements.txt
├── pytest.ini
└── tests/
    ├── conftest.py                 # sys.path setup
    └── test_main.py                # 4 tests for /predict + /health

scripts/
└── generate_team_stats.py          # One-time script: model → web/data/team_stats.json
```

---

## Task 1: Project Scaffold

**Files:**
- Create: `web/package.json`
- Create: `web/tsconfig.json`
- Create: `web/next.config.js`
- Create: `web/.env.local`
- Create: `api/requirements.txt`
- Create: `api/pytest.ini`
- Create: `api/tests/__init__.py`
- Create: `api/tests/conftest.py`

- [ ] **Step 1: Create web/package.json**

```json
{
  "name": "nba-shot-quality-web",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  },
  "dependencies": {
    "next": "14.2.3",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "recharts": "^2.12.7"
  },
  "devDependencies": {
    "@types/node": "^20.12.12",
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "typescript": "^5.4.5"
  }
}
```

- [ ] **Step 2: Create web/tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "es5",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 3: Create web/next.config.js**

```js
/** @type {import('next').NextConfig} */
const nextConfig = {}
module.exports = nextConfig
```

- [ ] **Step 4: Create web/.env.local**

```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

- [ ] **Step 5: Create api/requirements.txt**

```
fastapi==0.111.0
uvicorn[standard]==0.29.0
xgboost==2.0.3
pandas==2.2.2
pydantic==2.7.1
httpx==0.27.0
pytest==8.2.0
```

- [ ] **Step 6: Create api/pytest.ini**

```ini
[pytest]
testpaths = tests
```

- [ ] **Step 7: Create api/tests/__init__.py (empty) and conftest.py**

`api/tests/__init__.py` — empty file.

`api/tests/conftest.py`:
```python
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
```

- [ ] **Step 8: Create required directories**

```bash
mkdir -p web/app web/components/predictor web/components/dashboard web/lib web/data api/tests scripts
```

- [ ] **Step 9: Install web dependencies**

```bash
cd web && npm install
```

Expected: `node_modules/` created, no errors.

- [ ] **Step 10: Install api dependencies**

```bash
cd api && pip install -r requirements.txt
```

Expected: all packages installed, no errors.

- [ ] **Step 11: Commit scaffold**

```bash
git add web/ api/requirements.txt api/pytest.ini api/tests/
git commit -m "feat: scaffold web/ (Next.js) and api/ (FastAPI) structure"
```

---

## Task 2: FastAPI Backend

**Files:**
- Create: `api/main.py`
- Create: `api/tests/test_main.py`

- [ ] **Step 1: Write the failing tests first**

Create `api/tests/test_main.py`:

```python
import numpy as np
import pytest
from fastapi.testclient import TestClient
from unittest.mock import MagicMock

import main as main_module

VALID_PAYLOAD = {
    "shot_distance": 15.0,
    "shot_angle": 0.0,
    "defender_distance": 2,
    "seconds_in_period": 300.0,
    "quarter": 2,
    "score_differential": 0,
}


@pytest.fixture(autouse=True)
def mock_model(monkeypatch):
    m = MagicMock()
    m.predict_proba.return_value = np.array([[0.38, 0.62]])
    monkeypatch.setattr(main_module, "model", m)
    return m


@pytest.fixture
def client():
    return TestClient(main_module.app)


def test_predict_returns_probability(client):
    response = client.post("/predict", json=VALID_PAYLOAD)
    assert response.status_code == 200
    assert response.json()["probability"] == pytest.approx(0.62)


def test_predict_uses_correct_feature_order(client, mock_model):
    client.post("/predict", json=VALID_PAYLOAD)
    X = mock_model.predict_proba.call_args[0][0]
    assert list(X.columns) == [
        "shot_distance", "shot_angle", "defender_distance",
        "seconds_in_period", "quarter", "score_differential",
    ]
    assert float(X["shot_distance"].iloc[0]) == 15.0


def test_predict_rejects_missing_fields(client):
    response = client.post("/predict", json={"shot_distance": 15.0})
    assert response.status_code == 422


def test_health_returns_ok(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
cd api && python -m pytest tests/test_main.py -v
```

Expected: `ModuleNotFoundError: No module named 'main'`

- [ ] **Step 3: Implement api/main.py**

```python
import os
from contextlib import asynccontextmanager

import pandas as pd
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from xgboost import XGBClassifier

FEATURE_COLS = [
    "shot_distance", "shot_angle", "defender_distance",
    "seconds_in_period", "quarter", "score_differential",
]

model: XGBClassifier | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global model
    model_path = os.getenv("MODEL_PATH", "../models/shot_quality_model.json")
    if os.path.exists(model_path):
        m = XGBClassifier()
        m.load_model(model_path)
        model = m
    yield
    model = None


app = FastAPI(title="NBA Shot Quality API", lifespan=lifespan)

origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)


class ShotFeatures(BaseModel):
    shot_distance: float
    shot_angle: float
    defender_distance: int
    seconds_in_period: float
    quarter: int
    score_differential: int


class PredictResponse(BaseModel):
    probability: float


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.post("/predict", response_model=PredictResponse)
def predict(features: ShotFeatures) -> PredictResponse:
    if model is None:
        from fastapi import HTTPException
        raise HTTPException(status_code=503, detail="Model not loaded")
    X = pd.DataFrame([features.model_dump()])[FEATURE_COLS]
    prob = float(model.predict_proba(X)[0, 1])
    return PredictResponse(probability=prob)
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
cd api && python -m pytest tests/test_main.py -v
```

Expected: `4 passed`

- [ ] **Step 5: Verify dev server starts**

```bash
cd api && uvicorn main:app --reload &
curl http://localhost:8000/health
```

Expected: `{"status":"ok"}`

Kill the background process after verifying: `kill %1`

- [ ] **Step 6: Commit**

```bash
git add api/main.py api/tests/test_main.py
git commit -m "feat: add FastAPI /predict and /health endpoints with tests"
```

---

## Task 3: Global Styles + Layout

**Files:**
- Create: `web/app/globals.css`
- Create: `web/app/layout.tsx`

- [ ] **Step 1: Create web/app/globals.css**

```css
:root {
  --navy: #1a1a2e;
  --navy-dark: #0f3460;
  --navy-mid: #16213e;
  --red: #e94560;
  --text: #eeeeee;
  --text-muted: #aaaaaa;
  --green: #50c878;
}

*,
*::before,
*::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  background: var(--navy);
  color: var(--text);
  font-family: var(--inter), sans-serif;
  min-height: 100vh;
}

input[type="range"] {
  width: 100%;
  accent-color: var(--red);
  cursor: pointer;
}

select {
  font-family: inherit;
}

button {
  font-family: inherit;
}
```

- [ ] **Step 2: Create web/app/layout.tsx**

```tsx
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--inter' })

export const metadata: Metadata = {
  title: 'NBA Shot Quality Model',
  description: 'Interactive NBA shot make probability predictor and team dashboard',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.variable}>{children}</body>
    </html>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add web/app/globals.css web/app/layout.tsx
git commit -m "feat: add Next.js global styles and layout with Inter font"
```

---

## Task 4: TabNav + Root Page

**Files:**
- Create: `web/components/TabNav.tsx`
- Create: `web/app/page.tsx`

- [ ] **Step 1: Create web/components/TabNav.tsx**

```tsx
'use client'

type Tab = 'predictor' | 'dashboard'

interface TabNavProps {
  activeTab: Tab
  onTabChange: (tab: Tab) => void
}

export default function TabNav({ activeTab, onTabChange }: TabNavProps) {
  return (
    <nav
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '24px',
        padding: '14px 24px',
        background: 'var(--navy-dark)',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
      }}
    >
      <span style={{ fontWeight: 700, color: 'var(--red)', fontSize: '17px' }}>
        🏀 NBA Shot Quality
      </span>
      {(['predictor', 'dashboard'] as Tab[]).map((tab) => (
        <button
          key={tab}
          onClick={() => onTabChange(tab)}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: activeTab === tab ? 'var(--text)' : 'var(--text-muted)',
            fontSize: '15px',
            fontWeight: activeTab === tab ? 600 : 400,
            borderBottom: activeTab === tab ? '2px solid var(--red)' : '2px solid transparent',
            paddingBottom: '4px',
          }}
        >
          {tab === 'predictor' ? 'Shot Predictor' : 'Team Dashboard'}
        </button>
      ))}
    </nav>
  )
}
```

- [ ] **Step 2: Create web/app/page.tsx**

```tsx
'use client'

import { useState } from 'react'
import TabNav from '@/components/TabNav'

type Tab = 'predictor' | 'dashboard'

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>('predictor')

  return (
    <main>
      <TabNav activeTab={activeTab} onTabChange={setActiveTab} />
      <div style={{ padding: '28px 24px', maxWidth: '960px', margin: '0 auto' }}>
        {activeTab === 'predictor' ? (
          <p style={{ color: 'var(--text-muted)' }}>Predictor placeholder</p>
        ) : (
          <p style={{ color: 'var(--text-muted)' }}>Dashboard placeholder</p>
        )}
      </div>
    </main>
  )
}
```

- [ ] **Step 3: Verify dev server renders**

```bash
cd web && npm run dev
```

Open http://localhost:3000 — verify dark navy background, red "🏀 NBA Shot Quality" title, two tab buttons that switch the placeholder text. Kill server.

- [ ] **Step 4: Commit**

```bash
git add web/components/TabNav.tsx web/app/page.tsx
git commit -m "feat: add TabNav and root page with tab switching"
```

---

## Task 5: CourtDiagram Component

**Files:**
- Create: `web/components/predictor/CourtDiagram.tsx`

The court SVG uses these coordinates (viewBox `0 0 500 470`):
- Scale: 10 px per foot
- Basket center: `(250, 430)`
- Paint: 16 ft × 19 ft → 160 × 190 px, x 170–330, y 240–430
- Free throw circle: center `(250, 240)`, r 60
- Three-point arc radius: 237.5 px from basket; corners at x=30 and x=470; arc from `(30, 340)` to `(470, 340)`
- Shot marker x = `250 + d×10×sin(angle°)`, y = `430 − d×10×cos(angle°)`

- [ ] **Step 1: Create web/components/predictor/CourtDiagram.tsx**

```tsx
interface CourtDiagramProps {
  distance: number
  angle: number
  children?: React.ReactNode
}

export default function CourtDiagram({ distance, angle, children }: CourtDiagramProps) {
  const d = Math.min(distance, 34)
  const rad = (angle * Math.PI) / 180
  const markerX = 250 + d * 10 * Math.sin(rad)
  const markerY = 430 - d * 10 * Math.cos(rad)

  return (
    <div style={{ position: 'relative', width: '100%', maxWidth: '500px' }}>
      <svg
        viewBox="0 0 500 470"
        style={{
          width: '100%',
          background: 'var(--navy-dark)',
          borderRadius: '8px',
          display: 'block',
        }}
      >
        {/* Paint / lane */}
        <rect
          x={170} y={240} width={160} height={190}
          fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth={2}
        />
        {/* Free throw circle */}
        <circle
          cx={250} cy={240} r={60}
          fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth={2}
        />
        {/* Restricted area arc */}
        <path
          d="M 210 430 A 40 40 0 0 1 290 430"
          fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth={2}
        />
        {/* Three-point corner lines */}
        <line x1={30} y1={470} x2={30} y2={340} stroke="rgba(255,255,255,0.25)" strokeWidth={2} />
        <line x1={470} y1={470} x2={470} y2={340} stroke="rgba(255,255,255,0.25)" strokeWidth={2} />
        {/* Three-point arc */}
        <path
          d="M 30 340 A 237.5 237.5 0 0 1 470 340"
          fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth={2}
        />
        {/* Baseline */}
        <line x1={0} y1={470} x2={500} y2={470} stroke="rgba(255,255,255,0.25)" strokeWidth={2} />
        {/* Backboard */}
        <line x1={215} y1={458} x2={285} y2={458} stroke="rgba(255,255,255,0.5)" strokeWidth={3} />
        {/* Basket */}
        <circle cx={250} cy={430} r={9} fill="none" stroke="var(--red)" strokeWidth={2} />
        {/* Shot marker — uses CSS transition via transform */}
        <g
          transform={`translate(${markerX}, ${markerY})`}
          style={{ transition: 'transform 0.15s ease' }}
        >
          <circle
            r={10}
            fill="var(--red)"
            style={{ filter: 'drop-shadow(0 0 6px var(--red))' }}
          />
        </g>
      </svg>
      {children}
    </div>
  )
}
```

- [ ] **Step 2: Verify the math**

Open Node.js REPL (`node`) and run:

```js
// angle=0, distance=15 → straight ahead 15 ft
const d=15, angle=0, rad=0
const x = 250 + d*10*Math.sin(rad)   // 250
const y = 430 - d*10*Math.cos(rad)   // 280
console.log(x, y)  // expected: 250 280

// angle=45, distance=22 → right-side mid-range
const r2 = 45*Math.PI/180
console.log(250 + 22*10*Math.sin(r2), 430 - 22*10*Math.cos(r2))
// expected: ~405.6, ~274.4  (within court bounds)
```

- [ ] **Step 3: Commit**

```bash
git add web/components/predictor/CourtDiagram.tsx
git commit -m "feat: add SVG CourtDiagram with animated shot marker"
```

---

## Task 6: SliderGrid Component

**Files:**
- Create: `web/components/predictor/SliderGrid.tsx`

- [ ] **Step 1: Create web/components/predictor/SliderGrid.tsx**

```tsx
'use client'

export interface ShotParams {
  shot_distance: number
  shot_angle: number
  defender_distance: number
  seconds_in_period: number
  quarter: number
  score_differential: number
}

interface SliderConfig {
  key: keyof ShotParams
  label: string
  min: number
  max: number
  step: number
  format: (v: number) => string
}

const SLIDERS: SliderConfig[] = [
  {
    key: 'shot_distance',
    label: 'Distance',
    min: 0, max: 35, step: 0.5,
    format: (v) => `${v} ft`,
  },
  {
    key: 'shot_angle',
    label: 'Angle',
    min: -90, max: 90, step: 1,
    format: (v) => `${v}°`,
  },
  {
    key: 'defender_distance',
    label: 'Defender',
    min: 0, max: 3, step: 1,
    format: (v) => ['Tight', 'Close', 'Open', 'Wide Open'][v] ?? String(v),
  },
  {
    key: 'seconds_in_period',
    label: 'Seconds',
    min: 0, max: 720, step: 10,
    format: (v) => `${v}s`,
  },
  {
    key: 'quarter',
    label: 'Quarter',
    min: 1, max: 5, step: 1,
    format: (v) => `Q${v}`,
  },
  {
    key: 'score_differential',
    label: 'Score Diff',
    min: -30, max: 30, step: 1,
    format: (v) => (v > 0 ? `+${v}` : String(v)),
  },
]

interface SliderGridProps {
  params: ShotParams
  onChange: (params: ShotParams) => void
}

export default function SliderGrid({ params, onChange }: SliderGridProps) {
  const handleChange = (key: keyof ShotParams, value: number) => {
    onChange({ ...params, [key]: value })
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '20px',
        marginTop: '20px',
      }}
    >
      {SLIDERS.map(({ key, label, min, max, step, format }) => (
        <div key={key}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: '6px',
              fontSize: '13px',
            }}
          >
            <span style={{ color: 'var(--text-muted)' }}>{label}</span>
            <span style={{ fontWeight: 600, color: 'var(--red)' }}>
              {format(params[key])}
            </span>
          </div>
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={params[key]}
            onChange={(e) => handleChange(key, parseFloat(e.target.value))}
          />
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add web/components/predictor/SliderGrid.tsx
git commit -m "feat: add 6-slider SliderGrid component with ShotParams type"
```

---

## Task 7: ProbabilityOverlay Component

**Files:**
- Create: `web/components/predictor/ProbabilityOverlay.tsx`

- [ ] **Step 1: Create web/components/predictor/ProbabilityOverlay.tsx**

```tsx
interface ProbabilityOverlayProps {
  probability: number | null
  isLoading: boolean
}

export default function ProbabilityOverlay({ probability, isLoading }: ProbabilityOverlayProps) {
  const label =
    probability === null ? null
    : probability >= 0.55 ? 'Likely Make'
    : probability >= 0.45 ? 'Contested'
    : 'Likely Miss'

  const color =
    probability === null ? 'var(--text-muted)'
    : probability >= 0.55 ? 'var(--green)'
    : probability >= 0.45 ? '#f4a261'
    : 'var(--red)'

  return (
    <div
      style={{
        position: 'absolute',
        top: '12px',
        right: '12px',
        textAlign: 'right',
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          fontSize: '38px',
          fontWeight: 700,
          lineHeight: 1,
          color,
          textShadow: '0 2px 8px rgba(0,0,0,0.6)',
        }}
      >
        {isLoading ? '…' : probability !== null ? `${Math.round(probability * 100)}%` : '—'}
      </div>
      {label && !isLoading && (
        <div
          style={{
            marginTop: '5px',
            fontSize: '12px',
            fontWeight: 600,
            background: color,
            color: '#fff',
            borderRadius: '4px',
            padding: '2px 8px',
            display: 'inline-block',
          }}
        >
          {label}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add web/components/predictor/ProbabilityOverlay.tsx
git commit -m "feat: add ProbabilityOverlay with Likely Make/Contested/Likely Miss labels"
```

---

## Task 8: api.ts + ShotPredictor

**Files:**
- Create: `web/lib/api.ts`
- Create: `web/components/predictor/ShotPredictor.tsx`

- [ ] **Step 1: Create web/lib/api.ts**

```typescript
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
```

- [ ] **Step 2: Create web/components/predictor/ShotPredictor.tsx**

```tsx
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
```

- [ ] **Step 3: Wire ShotPredictor into page.tsx**

Edit `web/app/page.tsx` — replace the predictor placeholder:

```tsx
'use client'

import { useState } from 'react'
import TabNav from '@/components/TabNav'
import ShotPredictor from '@/components/predictor/ShotPredictor'

type Tab = 'predictor' | 'dashboard'

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>('predictor')

  return (
    <main>
      <TabNav activeTab={activeTab} onTabChange={setActiveTab} />
      <div style={{ padding: '28px 24px', maxWidth: '960px', margin: '0 auto' }}>
        {activeTab === 'predictor' ? (
          <ShotPredictor />
        ) : (
          <p style={{ color: 'var(--text-muted)' }}>Dashboard placeholder</p>
        )}
      </div>
    </main>
  )
}
```

- [ ] **Step 4: Start both servers and test predictor end-to-end**

Terminal 1 — API server:
```bash
cd api && uvicorn main:app --reload
```

Terminal 2 — Next.js dev server:
```bash
cd web && npm run dev
```

Open http://localhost:3000. Verify:
- Half-court SVG renders with dark navy background, court lines, red basket circle
- Glowing red shot marker is visible at default position (15 ft, straight ahead)
- Moving Distance slider → shot marker animates smoothly on the court
- Moving Angle slider → shot marker moves left/right
- Probability updates (shows `…` briefly then a percentage)
- Labels: "Likely Make" (green), "Contested" (orange), "Likely Miss" (red)

Kill both servers after verification.

- [ ] **Step 5: Commit**

```bash
git add web/lib/api.ts web/components/predictor/ShotPredictor.tsx web/app/page.tsx
git commit -m "feat: wire ShotPredictor with debounced API calls and court animation"
```

---

## Task 9: Team Data — teamData.ts + team_stats.json

**Files:**
- Create: `web/lib/teamData.ts`
- Create: `web/data/team_stats.json`

- [ ] **Step 1: Create web/lib/teamData.ts**

```typescript
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
```

- [ ] **Step 2: Create web/data/team_stats.json**

This is sample data for all 30 NBA teams (2023-24 season). The `generate_team_stats.py` script (Task 15) replaces this with real model outputs.

```json
{
  "teams": [
    {
      "name": "Boston Celtics",
      "overall": { "actual": 0.480, "expected": 0.462 },
      "zones": {
        "At Rim": { "actual": 0.682, "expected": 0.641, "fga": 2341 },
        "Mid-Range": { "actual": 0.412, "expected": 0.438, "fga": 891 },
        "Corner 3": { "actual": 0.391, "expected": 0.362, "fga": 1203 },
        "Above Break 3": { "actual": 0.354, "expected": 0.361, "fga": 3102 }
      }
    },
    {
      "name": "Oklahoma City Thunder",
      "overall": { "actual": 0.473, "expected": 0.457 },
      "zones": {
        "At Rim": { "actual": 0.675, "expected": 0.638, "fga": 2198 },
        "Mid-Range": { "actual": 0.405, "expected": 0.431, "fga": 743 },
        "Corner 3": { "actual": 0.383, "expected": 0.359, "fga": 1124 },
        "Above Break 3": { "actual": 0.351, "expected": 0.358, "fga": 2987 }
      }
    },
    {
      "name": "Golden State Warriors",
      "overall": { "actual": 0.472, "expected": 0.459 },
      "zones": {
        "At Rim": { "actual": 0.663, "expected": 0.634, "fga": 2102 },
        "Mid-Range": { "actual": 0.421, "expected": 0.435, "fga": 812 },
        "Corner 3": { "actual": 0.387, "expected": 0.361, "fga": 1356 },
        "Above Break 3": { "actual": 0.358, "expected": 0.360, "fga": 3201 }
      }
    },
    {
      "name": "Denver Nuggets",
      "overall": { "actual": 0.471, "expected": 0.460 },
      "zones": {
        "At Rim": { "actual": 0.671, "expected": 0.637, "fga": 2276 },
        "Mid-Range": { "actual": 0.428, "expected": 0.441, "fga": 967 },
        "Corner 3": { "actual": 0.372, "expected": 0.358, "fga": 1089 },
        "Above Break 3": { "actual": 0.349, "expected": 0.358, "fga": 2834 }
      }
    },
    {
      "name": "Indiana Pacers",
      "overall": { "actual": 0.470, "expected": 0.460 },
      "zones": {
        "At Rim": { "actual": 0.659, "expected": 0.632, "fga": 2187 },
        "Mid-Range": { "actual": 0.408, "expected": 0.429, "fga": 723 },
        "Corner 3": { "actual": 0.375, "expected": 0.356, "fga": 1178 },
        "Above Break 3": { "actual": 0.356, "expected": 0.358, "fga": 3087 }
      }
    },
    {
      "name": "Cleveland Cavaliers",
      "overall": { "actual": 0.468, "expected": 0.459 },
      "zones": {
        "At Rim": { "actual": 0.664, "expected": 0.637, "fga": 2089 },
        "Mid-Range": { "actual": 0.419, "expected": 0.433, "fga": 892 },
        "Corner 3": { "actual": 0.368, "expected": 0.355, "fga": 1034 },
        "Above Break 3": { "actual": 0.352, "expected": 0.357, "fga": 2876 }
      }
    },
    {
      "name": "Milwaukee Bucks",
      "overall": { "actual": 0.466, "expected": 0.459 },
      "zones": {
        "At Rim": { "actual": 0.678, "expected": 0.644, "fga": 2312 },
        "Mid-Range": { "actual": 0.415, "expected": 0.436, "fga": 834 },
        "Corner 3": { "actual": 0.363, "expected": 0.356, "fga": 1102 },
        "Above Break 3": { "actual": 0.342, "expected": 0.355, "fga": 2543 }
      }
    },
    {
      "name": "Miami Heat",
      "overall": { "actual": 0.464, "expected": 0.456 },
      "zones": {
        "At Rim": { "actual": 0.658, "expected": 0.633, "fga": 2034 },
        "Mid-Range": { "actual": 0.416, "expected": 0.430, "fga": 801 },
        "Corner 3": { "actual": 0.381, "expected": 0.358, "fga": 1243 },
        "Above Break 3": { "actual": 0.347, "expected": 0.355, "fga": 2678 }
      }
    },
    {
      "name": "Sacramento Kings",
      "overall": { "actual": 0.461, "expected": 0.456 },
      "zones": {
        "At Rim": { "actual": 0.657, "expected": 0.633, "fga": 2123 },
        "Mid-Range": { "actual": 0.422, "expected": 0.434, "fga": 876 },
        "Corner 3": { "actual": 0.369, "expected": 0.356, "fga": 1098 },
        "Above Break 3": { "actual": 0.349, "expected": 0.356, "fga": 2901 }
      }
    },
    {
      "name": "Minnesota Timberwolves",
      "overall": { "actual": 0.461, "expected": 0.455 },
      "zones": {
        "At Rim": { "actual": 0.654, "expected": 0.631, "fga": 2067 },
        "Mid-Range": { "actual": 0.404, "expected": 0.428, "fga": 756 },
        "Corner 3": { "actual": 0.371, "expected": 0.354, "fga": 1112 },
        "Above Break 3": { "actual": 0.350, "expected": 0.355, "fga": 2743 }
      }
    },
    {
      "name": "New York Knicks",
      "overall": { "actual": 0.461, "expected": 0.457 },
      "zones": {
        "At Rim": { "actual": 0.660, "expected": 0.634, "fga": 2098 },
        "Mid-Range": { "actual": 0.427, "expected": 0.437, "fga": 891 },
        "Corner 3": { "actual": 0.365, "expected": 0.355, "fga": 1023 },
        "Above Break 3": { "actual": 0.344, "expected": 0.356, "fga": 2645 }
      }
    },
    {
      "name": "Dallas Mavericks",
      "overall": { "actual": 0.462, "expected": 0.459 },
      "zones": {
        "At Rim": { "actual": 0.662, "expected": 0.636, "fga": 2143 },
        "Mid-Range": { "actual": 0.418, "expected": 0.434, "fga": 812 },
        "Corner 3": { "actual": 0.371, "expected": 0.357, "fga": 1134 },
        "Above Break 3": { "actual": 0.353, "expected": 0.358, "fga": 2934 }
      }
    },
    {
      "name": "New Orleans Pelicans",
      "overall": { "actual": 0.457, "expected": 0.455 },
      "zones": {
        "At Rim": { "actual": 0.652, "expected": 0.631, "fga": 2087 },
        "Mid-Range": { "actual": 0.407, "expected": 0.428, "fga": 743 },
        "Corner 3": { "actual": 0.364, "expected": 0.354, "fga": 1067 },
        "Above Break 3": { "actual": 0.347, "expected": 0.355, "fga": 2712 }
      }
    },
    {
      "name": "Los Angeles Lakers",
      "overall": { "actual": 0.455, "expected": 0.455 },
      "zones": {
        "At Rim": { "actual": 0.648, "expected": 0.630, "fga": 2012 },
        "Mid-Range": { "actual": 0.413, "expected": 0.430, "fga": 823 },
        "Corner 3": { "actual": 0.362, "expected": 0.354, "fga": 1009 },
        "Above Break 3": { "actual": 0.342, "expected": 0.354, "fga": 2543 }
      }
    },
    {
      "name": "Memphis Grizzlies",
      "overall": { "actual": 0.452, "expected": 0.451 },
      "zones": {
        "At Rim": { "actual": 0.642, "expected": 0.628, "fga": 1989 },
        "Mid-Range": { "actual": 0.402, "expected": 0.425, "fga": 698 },
        "Corner 3": { "actual": 0.359, "expected": 0.352, "fga": 978 },
        "Above Break 3": { "actual": 0.343, "expected": 0.352, "fga": 2634 }
      }
    },
    {
      "name": "LA Clippers",
      "overall": { "actual": 0.458, "expected": 0.459 },
      "zones": {
        "At Rim": { "actual": 0.653, "expected": 0.632, "fga": 2056 },
        "Mid-Range": { "actual": 0.412, "expected": 0.432, "fga": 812 },
        "Corner 3": { "actual": 0.367, "expected": 0.355, "fga": 1089 },
        "Above Break 3": { "actual": 0.347, "expected": 0.357, "fga": 2812 }
      }
    },
    {
      "name": "Philadelphia 76ers",
      "overall": { "actual": 0.457, "expected": 0.459 },
      "zones": {
        "At Rim": { "actual": 0.654, "expected": 0.633, "fga": 2103 },
        "Mid-Range": { "actual": 0.420, "expected": 0.435, "fga": 867 },
        "Corner 3": { "actual": 0.362, "expected": 0.355, "fga": 1012 },
        "Above Break 3": { "actual": 0.342, "expected": 0.356, "fga": 2687 }
      }
    },
    {
      "name": "Phoenix Suns",
      "overall": { "actual": 0.453, "expected": 0.456 },
      "zones": {
        "At Rim": { "actual": 0.647, "expected": 0.630, "fga": 2034 },
        "Mid-Range": { "actual": 0.411, "expected": 0.429, "fga": 812 },
        "Corner 3": { "actual": 0.362, "expected": 0.354, "fga": 1078 },
        "Above Break 3": { "actual": 0.342, "expected": 0.355, "fga": 2756 }
      }
    },
    {
      "name": "Toronto Raptors",
      "overall": { "actual": 0.450, "expected": 0.454 },
      "zones": {
        "At Rim": { "actual": 0.641, "expected": 0.627, "fga": 1978 },
        "Mid-Range": { "actual": 0.405, "expected": 0.427, "fga": 734 },
        "Corner 3": { "actual": 0.358, "expected": 0.352, "fga": 1023 },
        "Above Break 3": { "actual": 0.341, "expected": 0.354, "fga": 2678 }
      }
    },
    {
      "name": "Orlando Magic",
      "overall": { "actual": 0.447, "expected": 0.452 },
      "zones": {
        "At Rim": { "actual": 0.638, "expected": 0.626, "fga": 2012 },
        "Mid-Range": { "actual": 0.398, "expected": 0.424, "fga": 712 },
        "Corner 3": { "actual": 0.355, "expected": 0.351, "fga": 1034 },
        "Above Break 3": { "actual": 0.337, "expected": 0.353, "fga": 2634 }
      }
    },
    {
      "name": "Atlanta Hawks",
      "overall": { "actual": 0.455, "expected": 0.461 },
      "zones": {
        "At Rim": { "actual": 0.649, "expected": 0.633, "fga": 2143 },
        "Mid-Range": { "actual": 0.415, "expected": 0.435, "fga": 856 },
        "Corner 3": { "actual": 0.363, "expected": 0.357, "fga": 1089 },
        "Above Break 3": { "actual": 0.343, "expected": 0.358, "fga": 2901 }
      }
    },
    {
      "name": "Houston Rockets",
      "overall": { "actual": 0.449, "expected": 0.455 },
      "zones": {
        "At Rim": { "actual": 0.638, "expected": 0.626, "fga": 2023 },
        "Mid-Range": { "actual": 0.401, "expected": 0.424, "fga": 723 },
        "Corner 3": { "actual": 0.355, "expected": 0.351, "fga": 1009 },
        "Above Break 3": { "actual": 0.340, "expected": 0.354, "fga": 2634 }
      }
    },
    {
      "name": "Utah Jazz",
      "overall": { "actual": 0.449, "expected": 0.456 },
      "zones": {
        "At Rim": { "actual": 0.637, "expected": 0.626, "fga": 1978 },
        "Mid-Range": { "actual": 0.406, "expected": 0.428, "fga": 745 },
        "Corner 3": { "actual": 0.354, "expected": 0.352, "fga": 989 },
        "Above Break 3": { "actual": 0.339, "expected": 0.354, "fga": 2567 }
      }
    },
    {
      "name": "Portland Trail Blazers",
      "overall": { "actual": 0.449, "expected": 0.457 },
      "zones": {
        "At Rim": { "actual": 0.636, "expected": 0.625, "fga": 1923 },
        "Mid-Range": { "actual": 0.403, "expected": 0.426, "fga": 712 },
        "Corner 3": { "actual": 0.354, "expected": 0.352, "fga": 978 },
        "Above Break 3": { "actual": 0.340, "expected": 0.356, "fga": 2512 }
      }
    },
    {
      "name": "Brooklyn Nets",
      "overall": { "actual": 0.447, "expected": 0.456 },
      "zones": {
        "At Rim": { "actual": 0.635, "expected": 0.625, "fga": 1945 },
        "Mid-Range": { "actual": 0.399, "expected": 0.425, "fga": 698 },
        "Corner 3": { "actual": 0.351, "expected": 0.351, "fga": 967 },
        "Above Break 3": { "actual": 0.340, "expected": 0.355, "fga": 2489 }
      }
    },
    {
      "name": "Chicago Bulls",
      "overall": { "actual": 0.450, "expected": 0.460 },
      "zones": {
        "At Rim": { "actual": 0.641, "expected": 0.630, "fga": 2023 },
        "Mid-Range": { "actual": 0.409, "expected": 0.431, "fga": 789 },
        "Corner 3": { "actual": 0.357, "expected": 0.354, "fga": 1023 },
        "Above Break 3": { "actual": 0.341, "expected": 0.358, "fga": 2712 }
      }
    },
    {
      "name": "San Antonio Spurs",
      "overall": { "actual": 0.442, "expected": 0.453 },
      "zones": {
        "At Rim": { "actual": 0.628, "expected": 0.620, "fga": 1867 },
        "Mid-Range": { "actual": 0.395, "expected": 0.421, "fga": 678 },
        "Corner 3": { "actual": 0.348, "expected": 0.348, "fga": 923 },
        "Above Break 3": { "actual": 0.337, "expected": 0.352, "fga": 2456 }
      }
    },
    {
      "name": "Washington Wizards",
      "overall": { "actual": 0.443, "expected": 0.455 },
      "zones": {
        "At Rim": { "actual": 0.630, "expected": 0.622, "fga": 1923 },
        "Mid-Range": { "actual": 0.397, "expected": 0.422, "fga": 689 },
        "Corner 3": { "actual": 0.349, "expected": 0.349, "fga": 934 },
        "Above Break 3": { "actual": 0.337, "expected": 0.354, "fga": 2489 }
      }
    },
    {
      "name": "Charlotte Hornets",
      "overall": { "actual": 0.444, "expected": 0.457 },
      "zones": {
        "At Rim": { "actual": 0.631, "expected": 0.623, "fga": 1934 },
        "Mid-Range": { "actual": 0.398, "expected": 0.424, "fga": 701 },
        "Corner 3": { "actual": 0.351, "expected": 0.350, "fga": 945 },
        "Above Break 3": { "actual": 0.338, "expected": 0.355, "fga": 2512 }
      }
    },
    {
      "name": "Detroit Pistons",
      "overall": { "actual": 0.437, "expected": 0.452 },
      "zones": {
        "At Rim": { "actual": 0.622, "expected": 0.618, "fga": 1812 },
        "Mid-Range": { "actual": 0.389, "expected": 0.418, "fga": 654 },
        "Corner 3": { "actual": 0.343, "expected": 0.346, "fga": 889 },
        "Above Break 3": { "actual": 0.334, "expected": 0.351, "fga": 2398 }
      }
    }
  ],
  "season": "2023-24",
  "generated": "2026-05-11"
}
```

- [ ] **Step 3: Verify TypeScript is happy**

```bash
cd web && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add web/lib/teamData.ts web/data/team_stats.json
git commit -m "feat: add teamData.ts with TeamData types and 30-team sample JSON"
```

---

## Task 10: ZoneBreakdown Component

**Files:**
- Create: `web/components/dashboard/ZoneBreakdown.tsx`

- [ ] **Step 1: Create web/components/dashboard/ZoneBreakdown.tsx**

```tsx
'use client'

import { useState } from 'react'
import type { TeamData } from '@/lib/teamData'

const ZONES = ['At Rim', 'Mid-Range', 'Corner 3', 'Above Break 3'] as const

interface ZoneBreakdownProps {
  teams: TeamData[]
}

export default function ZoneBreakdown({ teams }: ZoneBreakdownProps) {
  const [selectedName, setSelectedName] = useState(teams[0]?.name ?? '')
  const team = teams.find((t) => t.name === selectedName) ?? teams[0]

  if (!team) return null

  const maxFg = Math.max(
    ...ZONES.map((z) => Math.max(team.zones[z].actual, team.zones[z].expected))
  )

  return (
    <div>
      <select
        value={selectedName}
        onChange={(e) => setSelectedName(e.target.value)}
        style={{
          background: 'var(--navy-dark)',
          color: 'var(--text)',
          border: '1px solid rgba(255,255,255,0.2)',
          borderRadius: '6px',
          padding: '8px 14px',
          fontSize: '14px',
          marginBottom: '28px',
          cursor: 'pointer',
          width: '220px',
        }}
      >
        {teams.map((t) => (
          <option key={t.name} value={t.name}>
            {t.name}
          </option>
        ))}
      </select>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {ZONES.map((zone) => {
          const { actual, expected } = team.zones[zone]
          const delta = actual - expected
          const actualPct = (actual / maxFg) * 100
          const expectedPct = (expected / maxFg) * 100
          const deltaColor = delta >= 0 ? 'var(--green)' : 'var(--red)'

          return (
            <div key={zone}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: '8px',
                  fontSize: '13px',
                }}
              >
                <span style={{ color: 'var(--text-muted)' }}>{zone}</span>
                <span>
                  Actual <b>{(actual * 100).toFixed(1)}%</b>
                  {' · '}
                  Expected <b>{(expected * 100).toFixed(1)}%</b>
                  {' '}
                  <span style={{ color: deltaColor, fontWeight: 600 }}>
                    ({delta >= 0 ? '+' : ''}
                    {(delta * 100).toFixed(1)}%)
                  </span>
                </span>
              </div>
              {/* Actual FG% bar */}
              <div
                style={{
                  height: '10px',
                  background: 'var(--navy-mid)',
                  borderRadius: '5px',
                  overflow: 'hidden',
                  marginBottom: '4px',
                }}
              >
                <div
                  style={{
                    width: `${actualPct}%`,
                    height: '100%',
                    background: 'var(--red)',
                    borderRadius: '5px',
                    transition: 'width 0.3s ease',
                  }}
                />
              </div>
              {/* Expected FG% bar */}
              <div
                style={{
                  height: '10px',
                  background: 'var(--navy-mid)',
                  borderRadius: '5px',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: `${expectedPct}%`,
                    height: '100%',
                    background: 'transparent',
                    border: '1px solid rgba(255,255,255,0.4)',
                    borderRadius: '5px',
                    transition: 'width 0.3s ease',
                  }}
                />
              </div>
            </div>
          )
        })}
      </div>

      <div
        style={{
          display: 'flex',
          gap: '20px',
          marginTop: '20px',
          fontSize: '12px',
          color: 'var(--text-muted)',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span
            style={{
              width: '16px',
              height: '8px',
              background: 'var(--red)',
              borderRadius: '2px',
              display: 'inline-block',
            }}
          />
          Actual FG%
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span
            style={{
              width: '16px',
              height: '8px',
              border: '1px solid rgba(255,255,255,0.4)',
              borderRadius: '2px',
              display: 'inline-block',
            }}
          />
          Expected FG%
        </span>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add web/components/dashboard/ZoneBreakdown.tsx
git commit -m "feat: add ZoneBreakdown component with team selector and zone bars"
```

---

## Task 11: LeagueScatter Component

**Files:**
- Create: `web/components/dashboard/LeagueScatter.tsx`

- [ ] **Step 1: Create web/components/dashboard/LeagueScatter.tsx**

```tsx
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
            {payload.name
              .replace('Golden State Warriors', 'GSW')
              .replace('Oklahoma City Thunder', 'OKC')
              .replace('Los Angeles Lakers', 'LAL')
              .replace('LA Clippers', 'LAC')
              .replace('Portland Trail Blazers', 'POR')
              .replace('San Antonio Spurs', 'SAS')
              .replace('New Orleans Pelicans', 'NOP')
              .replace('Charlotte Hornets', 'CHA')
              .replace('Washington Wizards', 'WAS')}
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
```

- [ ] **Step 2: Commit**

```bash
git add web/components/dashboard/LeagueScatter.tsx
git commit -m "feat: add LeagueScatter Recharts scatter plot with click-to-label"
```

---

## Task 12: Leaderboard Component

**Files:**
- Create: `web/components/dashboard/Leaderboard.tsx`

- [ ] **Step 1: Create web/components/dashboard/Leaderboard.tsx**

```tsx
'use client'

import { useState } from 'react'
import type { TeamData } from '@/lib/teamData'

type SortDir = 'desc' | 'asc'

interface LeaderboardProps {
  teams: TeamData[]
}

export default function Leaderboard({ teams }: LeaderboardProps) {
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  const rows = teams
    .map((t) => ({
      name: t.name,
      actual: t.overall.actual,
      expected: t.overall.expected,
      delta: t.overall.actual - t.overall.expected,
    }))
    .sort((a, b) =>
      sortDir === 'desc' ? b.delta - a.delta : a.delta - b.delta
    )

  const maxAbs = Math.max(...rows.map((r) => Math.abs(r.delta)))

  const th: React.CSSProperties = {
    padding: '10px 12px',
    textAlign: 'left',
    color: 'var(--text-muted)',
    fontSize: '12px',
    fontWeight: 500,
    borderBottom: '1px solid rgba(255,255,255,0.15)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
        <thead>
          <tr>
            <th style={th}>#</th>
            <th style={th}>Team</th>
            <th style={{ ...th, textAlign: 'right' }}>Actual</th>
            <th style={{ ...th, textAlign: 'right' }}>Expected</th>
            <th
              style={{ ...th, textAlign: 'right', cursor: 'pointer' }}
              onClick={() => setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'))}
            >
              Delta {sortDir === 'desc' ? '↓' : '↑'}
            </th>
            <th style={{ ...th, width: '90px' }}></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const color = row.delta >= 0 ? 'var(--green)' : 'var(--red)'
            const barPct = (Math.abs(row.delta) / maxAbs) * 100
            return (
              <tr
                key={row.name}
                style={{
                  borderBottom: '1px solid rgba(255,255,255,0.05)',
                }}
              >
                <td
                  style={{
                    padding: '12px',
                    color: 'var(--text-muted)',
                    fontSize: '13px',
                  }}
                >
                  {i + 1}
                </td>
                <td style={{ padding: '12px' }}>{row.name}</td>
                <td style={{ padding: '12px', textAlign: 'right' }}>
                  {(row.actual * 100).toFixed(1)}%
                </td>
                <td
                  style={{
                    padding: '12px',
                    textAlign: 'right',
                    color: 'var(--text-muted)',
                  }}
                >
                  {(row.expected * 100).toFixed(1)}%
                </td>
                <td
                  style={{
                    padding: '12px',
                    textAlign: 'right',
                    color,
                    fontWeight: 600,
                  }}
                >
                  {row.delta >= 0 ? '+' : ''}
                  {(row.delta * 100).toFixed(1)}%
                </td>
                <td style={{ padding: '12px' }}>
                  <div
                    style={{
                      background: 'var(--navy-mid)',
                      borderRadius: '3px',
                      height: '8px',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        width: `${barPct}%`,
                        height: '100%',
                        background: color,
                        borderRadius: '3px',
                        transition: 'width 0.3s ease',
                      }}
                    />
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add web/components/dashboard/Leaderboard.tsx
git commit -m "feat: add sortable Leaderboard with delta sparkbars"
```

---

## Task 13: ViewToggle + TeamDashboard

**Files:**
- Create: `web/components/dashboard/ViewToggle.tsx`
- Create: `web/components/dashboard/TeamDashboard.tsx`

- [ ] **Step 1: Create web/components/dashboard/ViewToggle.tsx**

```tsx
'use client'

export type DashboardView = 'zones' | 'scatter' | 'leaderboard'

interface ViewToggleProps {
  activeView: DashboardView
  onViewChange: (view: DashboardView) => void
}

const VIEWS: { key: DashboardView; label: string }[] = [
  { key: 'zones', label: 'Zone Breakdown' },
  { key: 'scatter', label: 'League Scatter' },
  { key: 'leaderboard', label: 'Leaderboard' },
]

export default function ViewToggle({ activeView, onViewChange }: ViewToggleProps) {
  return (
    <div style={{ display: 'flex', gap: '8px', marginBottom: '28px' }}>
      {VIEWS.map(({ key, label }) => (
        <button
          key={key}
          onClick={() => onViewChange(key)}
          style={{
            background: activeView === key ? 'var(--red)' : 'var(--navy-mid)',
            color: 'var(--text)',
            border: 'none',
            borderRadius: '6px',
            padding: '8px 18px',
            fontSize: '14px',
            fontWeight: activeView === key ? 600 : 400,
            cursor: 'pointer',
          }}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Create web/components/dashboard/TeamDashboard.tsx**

```tsx
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
```

- [ ] **Step 3: Wire TeamDashboard into page.tsx**

Edit `web/app/page.tsx` — replace the dashboard placeholder import and render:

```tsx
'use client'

import { useState } from 'react'
import TabNav from '@/components/TabNav'
import ShotPredictor from '@/components/predictor/ShotPredictor'
import TeamDashboard from '@/components/dashboard/TeamDashboard'

type Tab = 'predictor' | 'dashboard'

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>('predictor')

  return (
    <main>
      <TabNav activeTab={activeTab} onTabChange={setActiveTab} />
      <div style={{ padding: '28px 24px', maxWidth: '960px', margin: '0 auto' }}>
        {activeTab === 'predictor' ? <ShotPredictor /> : <TeamDashboard />}
      </div>
    </main>
  )
}
```

- [ ] **Step 4: Run full TypeScript check**

```bash
cd web && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Run dev server and verify all dashboard views**

```bash
cd web && npm run dev
```

Open http://localhost:3000 and click "Team Dashboard":
- "Zone Breakdown" button active by default — see team dropdown + 4 zone bars with actual (red) and expected (outlined)
- Click "League Scatter" — scatter plot renders with 30 dots, reference diagonal line; click a dot and team name appears
- Click "Leaderboard" — ranked table with delta column and sparkbars; click "Delta ↓" header to sort ascending
- Click back to "Shot Predictor" — court and sliders still render

Kill server.

- [ ] **Step 6: Commit**

```bash
git add web/components/dashboard/ViewToggle.tsx web/components/dashboard/TeamDashboard.tsx web/app/page.tsx
git commit -m "feat: add ViewToggle, TeamDashboard, and wire all dashboard sub-views"
```

---

## Task 14: generate_team_stats.py

**Files:**
- Create: `scripts/generate_team_stats.py`

This script loads the trained model and cached shot data, computes actual vs expected FG% per team per shot zone, and writes `web/data/team_stats.json`. Run it once after training the model (notebook 03_train.ipynb) to populate real data.

- [ ] **Step 1: Create scripts/generate_team_stats.py**

```python
#!/usr/bin/env python3
"""Generate web/data/team_stats.json from the trained model and cached shot data.

Run from project root:
    python scripts/generate_team_stats.py

Prerequisites:
    - Run notebook 01_data.ipynb to cache shot data in data/
    - Run notebook 03_train.ipynb to save model to models/shot_quality_model.json
"""

import json
import sys
from datetime import date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

import pandas as pd
from nba_shot_quality.data import load_or_fetch
from nba_shot_quality.features import FEATURE_COLS
from nba_shot_quality.model import ShotQualityModel

ZONE_MAP = {
    "Restricted Area": "At Rim",
    "In The Paint (Non-RA)": "Mid-Range",
    "Mid-Range": "Mid-Range",
    "Left Corner 3": "Corner 3",
    "Right Corner 3": "Corner 3",
    "Above the Break 3": "Above Break 3",
    "Backcourt": None,
}
ZONES = ["At Rim", "Mid-Range", "Corner 3", "Above Break 3"]


def classify_zone(shot_zone_basic: str) -> str | None:
    return ZONE_MAP.get(shot_zone_basic)


def build_team_stats(df: pd.DataFrame, model: ShotQualityModel) -> list[dict]:
    df = df.copy()
    df["_zone"] = df["SHOT_ZONE_BASIC"].map(ZONE_MAP)
    df = df[df["_zone"].notna()].copy()
    df["_expected"] = model.predict_proba_batch(df[FEATURE_COLS])

    teams = []
    for team_name, team_df in df.groupby("TEAM_NAME"):
        zones: dict[str, dict] = {}
        for zone in ZONES:
            zone_df = team_df[team_df["_zone"] == zone]
            if zone_df.empty:
                zones[zone] = {"actual": 0.0, "expected": 0.0, "fga": 0}
            else:
                zones[zone] = {
                    "actual": round(float(zone_df["SHOT_MADE_FLAG"].mean()), 4),
                    "expected": round(float(zone_df["_expected"].mean()), 4),
                    "fga": len(zone_df),
                }

        teams.append(
            {
                "name": team_name,
                "overall": {
                    "actual": round(float(team_df["SHOT_MADE_FLAG"].mean()), 4),
                    "expected": round(float(team_df["_expected"].mean()), 4),
                },
                "zones": zones,
            }
        )

    teams.sort(
        key=lambda t: t["overall"]["actual"] - t["overall"]["expected"], reverse=True
    )
    return teams


def main() -> None:
    model_path = Path("models/shot_quality_model.json")
    if not model_path.exists():
        print(
            f"Error: model not found at {model_path}. "
            "Run notebook 03_train.ipynb first.",
            file=sys.stderr,
        )
        sys.exit(1)

    print("Loading model...")
    model = ShotQualityModel()
    model.load(str(model_path))

    print("Loading shot data (may take a moment on first run)...")
    df = load_or_fetch()
    if df.empty:
        print(
            "Error: no shot data. Run notebook 01_data.ipynb first.",
            file=sys.stderr,
        )
        sys.exit(1)

    df = df.dropna(subset=FEATURE_COLS + ["SHOT_ZONE_BASIC", "TEAM_NAME"])
    print(
        f"Loaded {len(df):,} shots across "
        f"{df['TEAM_NAME'].nunique()} teams."
    )

    print("Computing team stats...")
    teams = build_team_stats(df, model)

    season = df["SEASON_ID"].iloc[0] if "SEASON_ID" in df.columns else "2023-24"
    output = {
        "teams": teams,
        "season": str(season),
        "generated": str(date.today()),
    }

    out_path = Path("web/data/team_stats.json")
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with open(out_path, "w") as f:
        json.dump(output, f, indent=2)

    print(f"Written to {out_path} ({len(teams)} teams).")


if __name__ == "__main__":
    main()
```

- [ ] **Step 2: Verify the script is syntactically correct**

```bash
python -m py_compile scripts/generate_team_stats.py && echo "OK"
```

Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add scripts/generate_team_stats.py
git commit -m "feat: add generate_team_stats.py script to produce web/data/team_stats.json"
```

---

## Task 15: Deployment Configuration

**Files:**
- Create: `api/Procfile`
- Create: `web/.gitignore`
- Create: `api/.gitignore`

- [ ] **Step 1: Create api/Procfile (Railway)**

```
web: uvicorn main:app --host 0.0.0.0 --port $PORT
```

- [ ] **Step 2: Create web/.gitignore**

```
.next/
node_modules/
.env.local
```

- [ ] **Step 3: Create api/.gitignore**

```
__pycache__/
*.pyc
.env
```

- [ ] **Step 4: Add deployment env var documentation**

Create `api/.env.example`:

```
MODEL_PATH=../models/shot_quality_model.json
ALLOWED_ORIGINS=https://your-app.vercel.app
PORT=8000
```

Create `web/.env.example`:

```
NEXT_PUBLIC_API_URL=https://your-api.railway.app
```

- [ ] **Step 5: Run Next.js build to verify no TypeScript/build errors**

```bash
cd web && npm run build
```

Expected: build completes with no errors. (Warnings about unused variables are fine.)

- [ ] **Step 6: Run API tests one final time**

```bash
cd api && python -m pytest tests/ -v
```

Expected: `4 passed`

- [ ] **Step 7: Final commit**

```bash
git add api/Procfile api/.gitignore api/.env.example web/.gitignore web/.env.example
git commit -m "feat: add deployment config for Vercel (Next.js) and Railway (FastAPI)"
```

---

## Deployment Steps (after all tasks complete)

**FastAPI on Railway:**
1. Create new Railway project → "Deploy from GitHub repo"
2. Set root directory to `api/`
3. Add environment variable: `MODEL_PATH` pointing to the model file (or upload model to Railway volume)
4. Add environment variable: `ALLOWED_ORIGINS=https://your-app.vercel.app`
5. Note the Railway public URL (e.g., `https://nba-api.railway.app`)

**Next.js on Vercel:**
1. Connect GitHub repo to Vercel
2. Set root directory to `web/`
3. Add environment variable: `NEXT_PUBLIC_API_URL=https://nba-api.railway.app`
4. Deploy

**Model file:** The FastAPI server needs `models/shot_quality_model.json` accessible. On Railway free tier, include the model file in the `api/` directory or use a Railway volume.
