# NBA Shot Quality Model

An XGBoost classifier that predicts NBA shot make probability (0–1) from six contextual features. Built with `nba_api`, pandas, and XGBoost.

## Features

| Feature | Description |
|---|---|
| `shot_distance` | Distance from basket in feet |
| `shot_angle` | Angle from center line (negative = left, positive = right). Clipped to [-90°, 90°]. |
| `defender_distance` | 0 = Very Tight (0-2ft), 1 = Tight (2-4ft), 2 = Open (4-6ft), 3 = Wide Open (6+ft). Player-season aggregate. |
| `seconds_in_period` | Seconds remaining in the current quarter (proxy for game urgency) |
| `quarter` | Period (1–4, 5 = OT) |
| `score_differential` | Positive = shooting team leading. Sourced from play-by-play post-event score. |

## Setup

```bash
git clone https://github.com/your-username/NBA_Shot_Quality_Model.git
cd NBA_Shot_Quality_Model
pip install -e .
# or for development:
pip install -e ".[dev]"
```

## Notebook Run Order

Run notebooks in order — each depends on the previous:

| Notebook | Purpose | Runtime |
|---|---|---|
| `notebooks/01_data.ipynb` | Fetch and cache shot data from nba_api | ~20-30 min (first run only) |
| `notebooks/02_eda.ipynb` | Exploratory data analysis | Instant |
| `notebooks/03_train.ipynb` | Train and save the XGBoost model | ~1-2 min |
| `notebooks/04_evaluate.ipynb` | Confusion matrix, ROC-AUC, feature importance, calibration, team comparison | Instant |
| `notebooks/05_predict.ipynb` | Interactive shot probability predictor (ipywidgets) | Instant |

## Python API

```python
from nba_shot_quality import ShotQualityModel

model = ShotQualityModel()
model.load("models/shot_quality_model.json")

# Predict make probability for a single shot
prob = model.predict_proba({
    "shot_distance": 22.0,
    "shot_angle": -15.0,
    "defender_distance": 1,
    "seconds_in_period": 120.0,
    "quarter": 4,
    "score_differential": -3,
})
print(f"Make probability: {prob:.1%}")

# Batch prediction (vectorized)
import pandas as pd
shots_df = pd.read_parquet("data/shots_2023-24.parquet")
probs = model.predict_proba_batch(shots_df)
```

## Data

Shots from the 2019-20 through 2023-24 NBA regular seasons via `nba_api`.
Data is cached locally to `data/` (gitignored) after the first fetch.
Full fetch takes ~20-30 minutes per season due to nba_api rate limits.

## Project Structure

```
src/nba_shot_quality/
├── data.py       # nba_api fetching + Parquet cache
├── features.py   # feature engineering (angle, encoding, feature matrix)
├── model.py      # ShotQualityModel: train/predict/evaluate/save/load
└── evaluate.py   # matplotlib plots: confusion matrix, ROC-AUC, feature importance, calibration, team comparison
notebooks/
├── 01_data.ipynb
├── 02_eda.ipynb
├── 03_train.ipynb
├── 04_evaluate.ipynb
└── 05_predict.ipynb
```

## Future: Web App

`ShotQualityModel.predict_proba(features: dict) -> float` is designed as a web-ready interface:

```python
# FastAPI endpoint — no changes to model.py needed
@app.post("/predict")
def predict(features: ShotFeatures) -> float:
    return model.predict_proba(features.dict())
```
