# NBA Shot Quality Model — Frontend Design Spec

**Date:** 2026-05-11  
**Status:** Approved

## Purpose

A web application that makes the NBA Shot Quality Model accessible to anyone without needing Python or Jupyter. Two interactive tools: a live shot probability predictor and a team shot quality dashboard.

## Architecture

**Frontend:** Next.js (React), deployed to Vercel.  
**Backend:** FastAPI (Python), deployed to Railway. Loads the saved XGBoost model (`models/shot_quality_model.json`) on startup and exposes a single prediction endpoint.  
**Team data:** Pre-computed JSON file generated from real shot data and bundled into the Next.js app — no live API call needed for the dashboard.

```
web/
├── app/                        # Next.js App Router
│   ├── page.tsx                # Root — renders tabbed layout
│   ├── layout.tsx              # Global layout, nav, theme
│   └── globals.css             # Global styles
├── components/
│   ├── TabNav.tsx              # Predictor | Dashboard tab switcher
│   ├── predictor/
│   │   ├── ShotPredictor.tsx   # Top-level predictor tab
│   │   ├── CourtDiagram.tsx    # SVG half-court with animated shot marker
│   │   ├── SliderGrid.tsx      # 6-slider 3-column input grid
│   │   └── ProbabilityOverlay.tsx  # Probability number + label on court
│   └── dashboard/
│       ├── TeamDashboard.tsx   # Top-level dashboard tab
│       ├── ViewToggle.tsx      # Zone | Scatter | Leaderboard switcher
│       ├── ZoneBreakdown.tsx   # Team selector + zone FG% bars
│       ├── LeagueScatter.tsx   # All 30 teams scatter plot
│       └── Leaderboard.tsx     # Ranked actual-minus-expected table
├── lib/
│   ├── api.ts                  # predict() function → POST /predict
│   └── teamData.ts             # Loads pre-computed team JSON
├── data/
│   └── team_stats.json         # Pre-computed team actual vs expected FG%
└── data/
    └── team_stats.json         # Pre-computed team actual vs expected FG%

api/                            # FastAPI backend (separate deployment, sibling of web/)
├── main.py                     # FastAPI app, /predict endpoint
└── requirements.txt            # fastapi, uvicorn, xgboost, pandas, scikit-learn
```

## Page 1 — Shot Predictor Tab

**Hero element:** Half-court SVG diagram (dark navy). A glowing red dot (shot marker) animates to the position on the court matching the current distance and angle slider values as the user adjusts them.

**Probability display:** Large percentage number overlaid directly on the court diagram (top-right corner). Updates on every slider change via debounced API call to `POST /predict`.

**Inputs:** 6 sliders in a 3-column grid below the court:

| Slider | Range | Default |
|---|---|---|
| Distance | 0–35 ft | 15 ft |
| Angle | -90° to 90° | 0° |
| Defender Distance | 0 (Tight) – 3 (Wide Open) | 2 (Open) |
| Seconds in Period | 0–720 | 300 |
| Quarter | 1–5 | 2 |
| Score Differential | -30 to +30 | 0 |

**API call:** `POST /predict` with `{ shot_distance, shot_angle, defender_distance, seconds_in_period, quarter, score_differential }` → `{ probability: float }`. Debounced 150ms to avoid hammering the API on every slider tick.

## Page 2 — Team Dashboard Tab

Three sub-views toggled by a button row at the top.

### Sub-view 1: Zone Breakdown
Team selector dropdown (all 30 NBA teams). Horizontal stacked bar chart showing actual FG% vs model-expected FG% for 4 shot zones: At Rim, Mid-Range, Corner 3, Above Break 3. Data sourced from `team_stats.json`.

### Sub-view 2: League Scatter
Scatter plot of all 30 teams. X-axis = expected FG%, Y-axis = actual FG%. A diagonal reference line represents the model baseline (actual = expected). Teams above the line outperform the model; below the line underperform. Clicking a dot labels it with the team name. Rendered with Recharts.

### Sub-view 3: Leaderboard
All 30 teams ranked by `actual FG% − expected FG%` delta. Each row shows team name, delta value, and a colored sparkbar (green = positive, red = negative). Sortable by clicking the column header.

## Data Pipeline

A one-time Python script (`scripts/generate_team_stats.py`) runs `load_or_fetch()`, calls `model.predict_proba_batch()` on all shots, groups by team and shot zone, and writes `web/data/team_stats.json`. This script is re-run whenever new season data is cached.

`team_stats.json` structure:
```json
{
  "teams": [
    {
      "name": "Boston Celtics",
      "overall": { "actual": 0.478, "expected": 0.461 },
      "zones": {
        "At Rim": { "actual": 0.682, "expected": 0.641, "fga": 2341 },
        "Mid-Range": { "actual": 0.412, "expected": 0.438, "fga": 891 },
        "Corner 3": { "actual": 0.391, "expected": 0.362, "fga": 1203 },
        "Above Break 3": { "actual": 0.354, "expected": 0.361, "fga": 3102 }
      }
    }
  ],
  "season": "2023-24",
  "generated": "2026-05-11"
}
```

## FastAPI Backend

**Endpoint:** `POST /predict`  
**Request body:** `{ shot_distance: float, shot_angle: float, defender_distance: int, seconds_in_period: float, quarter: int, score_differential: int }`  
**Response:** `{ probability: float }`  
**Startup:** Loads `models/shot_quality_model.json` once into memory.  
**CORS:** Enabled for the Vercel frontend domain.

## Styling

Dark navy + red accent color scheme matching the court diagram mockup.  
Font: Inter (Google Fonts).  
Charting library: Recharts (React-native, no D3 dependency).  
Court diagram: SVG drawn in code (no image assets).

## Deployment

| Service | Platform | Notes |
|---|---|---|
| Next.js frontend | Vercel | Auto-deploy from `web/` directory |
| FastAPI backend | Railway | `uvicorn main:app`, model file included |

`NEXT_PUBLIC_API_URL` env var in Vercel points to the Railway FastAPI URL.

## Known Constraints

- FastAPI cold starts on Railway free tier can take ~2-3 seconds. The predictor should show a loading state while the first prediction resolves.
- Team dashboard data is static — reflects whatever seasons were fetched when `generate_team_stats.py` last ran.
- Defender distance is a player-season aggregate (not per-shot), so the predictor's "defender" slider represents a player archetype, not a specific coverage.
