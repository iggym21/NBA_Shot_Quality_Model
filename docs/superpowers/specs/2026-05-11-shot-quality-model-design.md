# NBA Shot Quality Model — Design Spec

**Date:** 2026-05-11  
**Status:** Implemented

## Purpose

Predict NBA shot make probability from shot context features to enable team-level shot quality analysis and interactive exploration. Structured for GitHub sharing and future web app conversion.

## Architecture

`src/nba_shot_quality/` Python package (data, features, model, evaluate) + five ordered Jupyter notebooks. nba_api data is fetched once and cached to Parquet. The `ShotQualityModel.predict_proba(features: dict) -> float` interface is web-ready.

## Features

| Feature | Source | Type | Notes |
|---|---|---|---|
| shot_distance | ShotChartDetail SHOT_DISTANCE | Continuous | Feet from basket |
| shot_angle | Computed from LOC_X/LOC_Y via atan2 | Continuous | Clipped to [-90°, 90°] |
| defender_distance | LeagueDashPlayerPtShot (player-season dominant category) | Ordinal 0–3 | Tight/Close/Open/Wide Open |
| seconds_in_period | ShotChartDetail MINUTES/SECONDS_REMAINING | Continuous | Proxy for game urgency |
| quarter | ShotChartDetail PERIOD | Ordinal 1–5 | 5 = OT |
| score_differential | PlayByPlayV2 SCOREMARGIN join | Continuous | Post-play score; see known limitations |

## Model

XGBClassifier: n_estimators=200, max_depth=5, learning_rate=0.1, eval_metric=logloss.  
80/20 stratified train/test split. Output: make probability (0–1).

## Evaluation

Confusion matrix, ROC-AUC curve, feature importance (XGBoost built-in), calibration curve, team actual-vs-expected FG% bar chart.

## Seasons

2019-20 through 2023-24 regular season (~500k+ shot attempts).

## Known Limitations

1. **Defender distance is a player-season aggregate**, not per-shot tracking data. The model learns "this player is typically tightly defended" rather than the specific coverage on each shot.
2. **Score differential is post-play** for made baskets (the 2 or 3 points are already credited). This creates a subtle label-feature correlation for made shots.
3. **Behind-basket shots** (LOC_Y < 0, e.g., tip-ins) have their angle clipped to ±90° rather than being filtered. These shots (~1% of FGA) are edge cases with potentially noisy features.

## Web App Path

```python
@app.post("/predict")
def predict(features: ShotFeatures) -> float:
    return model.predict_proba(features.dict())
```

No changes to `model.py` needed — just add a FastAPI wrapper.
