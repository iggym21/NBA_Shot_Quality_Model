# NBA Shot Quality Model — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an XGBoost classifier that predicts NBA shot make probability (0–1) from 6 contextual features, structured as an installable Python package with Jupyter notebooks and a web-ready prediction interface.

**Architecture:** A `src/nba_shot_quality/` package exposes four modules (data, features, model, evaluate) consumed by five ordered notebooks. Data from `nba_api` is fetched once and cached to Parquet. The `ShotQualityModel.predict_proba(features: dict)` signature is intentionally web-ready for a future FastAPI layer.

**Tech Stack:** Python 3.9+, nba_api, pandas, XGBoost, scikit-learn, matplotlib, SHAP, ipywidgets, pyarrow, pytest

---

## File Map

| File | Role |
|---|---|
| `src/nba_shot_quality/__init__.py` | Exports `ShotQualityModel` |
| `src/nba_shot_quality/data.py` | nba_api fetching + Parquet cache |
| `src/nba_shot_quality/features.py` | Angle computation, score differential join, defender distance encoding, feature matrix |
| `src/nba_shot_quality/model.py` | `ShotQualityModel`: train, predict_proba, evaluate, save, load |
| `src/nba_shot_quality/evaluate.py` | Five matplotlib plot functions |
| `tests/test_features.py` | Unit tests for all functions in features.py |
| `tests/test_model.py` | Unit tests for ShotQualityModel |
| `tests/test_evaluate.py` | Smoke tests for evaluate.py plots |
| `tests/test_data.py` | Unit tests for caching logic in data.py |
| `notebooks/01_data.ipynb` | Fetch and cache raw data |
| `notebooks/02_eda.ipynb` | Exploratory data analysis |
| `notebooks/03_train.ipynb` | Feature engineering + model training |
| `notebooks/04_evaluate.ipynb` | Full evaluation dashboard |
| `notebooks/05_predict.ipynb` | Interactive what-if prediction |
| `pyproject.toml` | Package metadata and dependencies |
| `requirements.txt` | Pinned dev dependencies |
| `.gitignore` | Excludes data/, models/, .ipynb_checkpoints/ |
| `README.md` | Setup, run order, feature descriptions |

---

## Task 1: Project Scaffold

**Files:**
- Create: `src/nba_shot_quality/__init__.py`
- Create: `pyproject.toml`
- Create: `requirements.txt`
- Create: `.gitignore`
- Create: `tests/__init__.py`
- Create: `data/.gitkeep`
- Create: `models/.gitkeep`

- [ ] **Step 1: Create directory structure**

```bash
mkdir -p src/nba_shot_quality tests notebooks data models docs/superpowers/specs
touch src/nba_shot_quality/__init__.py
touch src/nba_shot_quality/data.py
touch src/nba_shot_quality/features.py
touch src/nba_shot_quality/model.py
touch src/nba_shot_quality/evaluate.py
touch tests/__init__.py
touch data/.gitkeep
touch models/.gitkeep
```

- [ ] **Step 2: Create `pyproject.toml`**

```toml
[build-system]
requires = ["setuptools>=68", "wheel"]
build-backend = "setuptools.backends.legacy:build"

[project]
name = "nba-shot-quality"
version = "0.1.0"
description = "NBA shot quality model — XGBoost classifier predicting shot make probability"
readme = "README.md"
requires-python = ">=3.9"
dependencies = [
    "nba_api>=1.4.1",
    "pandas>=2.0.0",
    "xgboost>=2.0.0",
    "matplotlib>=3.7.0",
    "shap>=0.44.0",
    "ipywidgets>=8.0.0",
    "scikit-learn>=1.3.0",
    "pyarrow>=14.0.0",
    "jupyter>=1.0.0",
    "notebook>=7.0.0",
]

[tool.setuptools.packages.find]
where = ["src"]
```

- [ ] **Step 3: Create `requirements.txt`**

```
pytest>=7.4.0
pytest-cov>=4.1.0
```

- [ ] **Step 4: Create `.gitignore`**

```
data/
models/*.json
.ipynb_checkpoints/
__pycache__/
*.pyc
.pytest_cache/
*.egg-info/
dist/
build/
.DS_Store
```

Note: `data/.gitkeep` and `models/.gitkeep` stay tracked so the empty directories exist for new clones.

- [ ] **Step 5: Install the package in editable mode**

```bash
pip install -e ".[dev]" 2>/dev/null || pip install -e .
pip install pytest pytest-cov
```

Expected: No errors. `from nba_shot_quality import ShotQualityModel` will fail until Task 3 but the package is registered.

- [ ] **Step 6: Commit**

```bash
git init
git add pyproject.toml requirements.txt .gitignore src/ tests/ data/.gitkeep models/.gitkeep
git commit -m "feat: initial project scaffold"
```

---

## Task 2: Feature Engineering Module

**Files:**
- Create: `src/nba_shot_quality/features.py`
- Create: `tests/test_features.py`

- [ ] **Step 1: Write failing tests for `compute_angle`**

Create `tests/test_features.py`:

```python
import math
import pandas as pd
import pytest
from nba_shot_quality.features import (
    compute_angle,
    encode_defender_distance,
    compute_seconds_in_period,
    build_feature_matrix,
    FEATURE_COLS,
)


def test_compute_angle_straight_on():
    # Directly in front of basket (loc_x=0, any positive loc_y)
    assert abs(compute_angle(0, 200)) < 0.01


def test_compute_angle_right_baseline():
    # Right baseline: loc_x positive, loc_y=0 → ~90 degrees
    assert abs(compute_angle(200, 0) - 90.0) < 0.01


def test_compute_angle_left_baseline():
    # Left baseline: loc_x negative, loc_y=0 → ~-90 degrees
    assert abs(compute_angle(-200, 0) + 90.0) < 0.01


def test_compute_angle_symmetry():
    # Symmetric shots from left and right should have equal magnitude
    assert abs(compute_angle(100, 150)) == abs(compute_angle(-100, 150))


def test_encode_defender_distance_all_categories():
    assert encode_defender_distance("0-2 Feet - Very Tight") == 0
    assert encode_defender_distance("2-4 Feet - Tight") == 1
    assert encode_defender_distance("4-6 Feet - Open") == 2
    assert encode_defender_distance("6+ Feet - Wide Open") == 3


def test_encode_defender_distance_unknown_returns_minus_one():
    assert encode_defender_distance("unknown category") == -1


def test_compute_seconds_in_period():
    assert compute_seconds_in_period(2, 30) == 150.0
    assert compute_seconds_in_period(0, 0) == 0.0
    assert compute_seconds_in_period(12, 0) == 720.0


def test_build_feature_matrix_returns_correct_columns():
    df = pd.DataFrame({
        "shot_distance": [15.0, 22.0],
        "shot_angle": [10.0, -5.0],
        "defender_distance": [1, 3],
        "seconds_in_period": [300.0, 120.0],
        "quarter": [2, 4],
        "score_differential": [5, -3],
        "SHOT_MADE_FLAG": [1, 0],
    })
    X, y = build_feature_matrix(df)
    assert list(X.columns) == FEATURE_COLS
    assert list(y) == [1, 0]


def test_build_feature_matrix_no_nulls():
    df = pd.DataFrame({
        "shot_distance": [15.0],
        "shot_angle": [10.0],
        "defender_distance": [1],
        "seconds_in_period": [300.0],
        "quarter": [2],
        "score_differential": [5],
        "SHOT_MADE_FLAG": [1],
    })
    X, y = build_feature_matrix(df)
    assert X.isnull().sum().sum() == 0
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pytest tests/test_features.py -v
```

Expected: `ImportError` or `ModuleNotFoundError` — features.py is empty.

- [ ] **Step 3: Implement `features.py`**

```python
import math
import pandas as pd

FEATURE_COLS = [
    "shot_distance",
    "shot_angle",
    "defender_distance",
    "seconds_in_period",
    "quarter",
    "score_differential",
]

DEFENDER_DISTANCE_MAP = {
    "0-2 Feet - Very Tight": 0,
    "2-4 Feet - Tight": 1,
    "4-6 Feet - Open": 2,
    "6+ Feet - Wide Open": 3,
}


def compute_angle(loc_x: float, loc_y: float) -> float:
    """Angle in degrees from the straight-on line to the shot location.
    
    nba_api coordinates: loc_x = horizontal (tenths of feet, negative=left),
    loc_y = forward distance from basket (tenths of feet).
    Returns negative for left side, positive for right side.
    """
    return math.degrees(math.atan2(loc_x, loc_y))


def encode_defender_distance(category: str) -> int:
    """Map nba_api defender distance string to ordinal 0–3. Returns -1 for unknown."""
    return DEFENDER_DISTANCE_MAP.get(category, -1)


def compute_seconds_in_period(minutes_remaining: float, seconds_remaining: float) -> float:
    """Total seconds remaining in the current period."""
    return minutes_remaining * 60 + seconds_remaining


def build_feature_matrix(df: pd.DataFrame):
    """Return (X, y) from an enriched shots DataFrame.
    
    Expects df to already contain all FEATURE_COLS plus SHOT_MADE_FLAG.
    """
    X = df[FEATURE_COLS].copy()
    y = df["SHOT_MADE_FLAG"]
    return X, y
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pytest tests/test_features.py -v
```

Expected: All 10 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/nba_shot_quality/features.py tests/test_features.py
git commit -m "feat: add feature engineering module with tests"
```

---

## Task 3: Model Module

**Files:**
- Create: `src/nba_shot_quality/model.py`
- Create: `tests/test_model.py`

- [ ] **Step 1: Write failing tests for `ShotQualityModel`**

Create `tests/test_model.py`:

```python
import os
import tempfile
import numpy as np
import pandas as pd
import pytest
from sklearn.datasets import make_classification
from nba_shot_quality.model import ShotQualityModel
from nba_shot_quality.features import FEATURE_COLS


@pytest.fixture
def trained_model():
    """A ShotQualityModel trained on synthetic data."""
    X_raw, y = make_classification(n_samples=200, n_features=6, random_state=42)
    X = pd.DataFrame(X_raw, columns=FEATURE_COLS)
    model = ShotQualityModel()
    model.train(X, y)
    return model, X, y


def test_predict_proba_returns_float(trained_model):
    model, X, _ = trained_model
    features = dict(zip(FEATURE_COLS, X.iloc[0].tolist()))
    result = model.predict_proba(features)
    assert isinstance(result, float)


def test_predict_proba_in_unit_interval(trained_model):
    model, X, _ = trained_model
    for i in range(10):
        features = dict(zip(FEATURE_COLS, X.iloc[i].tolist()))
        prob = model.predict_proba(features)
        assert 0.0 <= prob <= 1.0


def test_evaluate_returns_roc_auc_and_accuracy(trained_model):
    model, X, y = trained_model
    metrics = model.evaluate(X, y)
    assert "roc_auc" in metrics
    assert "accuracy" in metrics
    assert 0.0 <= metrics["roc_auc"] <= 1.0
    assert 0.0 <= metrics["accuracy"] <= 1.0


def test_save_and_load_round_trip(trained_model):
    model, X, _ = trained_model
    features = dict(zip(FEATURE_COLS, X.iloc[0].tolist()))
    prob_before = model.predict_proba(features)

    with tempfile.TemporaryDirectory() as tmpdir:
        path = os.path.join(tmpdir, "model.json")
        model.save(path)
        assert os.path.exists(path)

        loaded = ShotQualityModel()
        loaded.load(path)
        prob_after = loaded.predict_proba(features)

    assert abs(prob_before - prob_after) < 1e-6


def test_roc_auc_above_baseline_on_synthetic(trained_model):
    model, X, y = trained_model
    metrics = model.evaluate(X, y)
    # Synthetic data with signal should exceed 0.60
    assert metrics["roc_auc"] > 0.60
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pytest tests/test_model.py -v
```

Expected: `ImportError` — model.py is empty.

- [ ] **Step 3: Implement `model.py`**

```python
import pandas as pd
from xgboost import XGBClassifier
from sklearn.metrics import roc_auc_score, accuracy_score
from nba_shot_quality.features import FEATURE_COLS


class ShotQualityModel:
    def __init__(self):
        self._model = XGBClassifier(
            n_estimators=200,
            max_depth=5,
            learning_rate=0.1,
            eval_metric="logloss",
            random_state=42,
            verbosity=0,
        )

    def train(self, X_train: pd.DataFrame, y_train) -> None:
        self._model.fit(X_train[FEATURE_COLS], y_train)

    def predict_proba(self, features: dict) -> float:
        """Return make probability for a single shot. web-ready interface."""
        X = pd.DataFrame([features])[FEATURE_COLS]
        return float(self._model.predict_proba(X)[0, 1])

    def evaluate(self, X_test: pd.DataFrame, y_test) -> dict:
        y_proba = self._model.predict_proba(X_test[FEATURE_COLS])[:, 1]
        y_pred = (y_proba >= 0.5).astype(int)
        return {
            "roc_auc": roc_auc_score(y_test, y_proba),
            "accuracy": accuracy_score(y_test, y_pred),
        }

    def save(self, path: str) -> None:
        self._model.save_model(path)

    def load(self, path: str) -> None:
        self._model.load_model(path)
```

- [ ] **Step 4: Update `src/nba_shot_quality/__init__.py`**

```python
from nba_shot_quality.model import ShotQualityModel

__all__ = ["ShotQualityModel"]
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
pytest tests/test_model.py -v
```

Expected: All 5 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/nba_shot_quality/model.py src/nba_shot_quality/__init__.py tests/test_model.py
git commit -m "feat: add ShotQualityModel with train/predict/save/load"
```

---

## Task 4: Evaluate Module

**Files:**
- Create: `src/nba_shot_quality/evaluate.py`
- Create: `tests/test_evaluate.py`

- [ ] **Step 1: Write failing tests for evaluate functions**

Create `tests/test_evaluate.py`:

```python
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use("Agg")  # non-interactive backend for tests
import matplotlib.pyplot as plt
import pytest
from nba_shot_quality.evaluate import (
    plot_confusion_matrix,
    plot_roc_auc,
    plot_feature_importance,
    plot_calibration_curve,
    plot_team_comparison,
)
from nba_shot_quality.model import ShotQualityModel
from nba_shot_quality.features import FEATURE_COLS
from sklearn.datasets import make_classification


@pytest.fixture
def binary_preds():
    rng = np.random.default_rng(42)
    y_true = rng.integers(0, 2, size=100)
    y_proba = rng.uniform(0, 1, size=100)
    y_pred = (y_proba >= 0.5).astype(int)
    return y_true, y_pred, y_proba


@pytest.fixture
def trained_model_and_shots():
    X_raw, y = make_classification(n_samples=300, n_features=6, random_state=0)
    X = pd.DataFrame(X_raw, columns=FEATURE_COLS)
    model = ShotQualityModel()
    model.train(X, y)

    shots = X.copy()
    shots["SHOT_MADE_FLAG"] = y
    shots["TEAM_NAME"] = ["Celtics", "Lakers", "Warriors"] * 100
    return model, shots


def test_plot_confusion_matrix_returns_figure(binary_preds):
    y_true, y_pred, _ = binary_preds
    fig = plot_confusion_matrix(y_true, y_pred)
    assert isinstance(fig, plt.Figure)
    plt.close(fig)


def test_plot_roc_auc_returns_figure(binary_preds):
    y_true, _, y_proba = binary_preds
    fig = plot_roc_auc(y_true, y_proba)
    assert isinstance(fig, plt.Figure)
    plt.close(fig)


def test_plot_feature_importance_returns_figure(trained_model_and_shots):
    model, _ = trained_model_and_shots
    fig = plot_feature_importance(model)
    assert isinstance(fig, plt.Figure)
    plt.close(fig)


def test_plot_calibration_curve_returns_figure(binary_preds):
    y_true, _, y_proba = binary_preds
    fig = plot_calibration_curve(y_true, y_proba)
    assert isinstance(fig, plt.Figure)
    plt.close(fig)


def test_plot_team_comparison_returns_figure(trained_model_and_shots):
    model, shots = trained_model_and_shots
    fig = plot_team_comparison(shots, model)
    assert isinstance(fig, plt.Figure)
    plt.close(fig)


def test_plot_team_comparison_includes_all_teams(trained_model_and_shots):
    model, shots = trained_model_and_shots
    fig = plot_team_comparison(shots, model)
    ax = fig.axes[0]
    team_labels = [t.get_text() for t in ax.get_xticklabels()]
    assert set(team_labels) == {"Celtics", "Lakers", "Warriors"}
    plt.close(fig)
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pytest tests/test_evaluate.py -v
```

Expected: `ImportError` — evaluate.py is empty.

- [ ] **Step 3: Implement `evaluate.py`**

```python
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from sklearn.metrics import (
    ConfusionMatrixDisplay,
    confusion_matrix,
    roc_curve,
    auc,
    calibration_curve,
)
from nba_shot_quality.features import FEATURE_COLS


def plot_confusion_matrix(y_true, y_pred) -> plt.Figure:
    fig, ax = plt.subplots(figsize=(5, 4))
    cm = confusion_matrix(y_true, y_pred)
    ConfusionMatrixDisplay(cm, display_labels=["Miss", "Make"]).plot(ax=ax, colorbar=False)
    ax.set_title("Confusion Matrix")
    return fig


def plot_roc_auc(y_true, y_proba) -> plt.Figure:
    fpr, tpr, _ = roc_curve(y_true, y_proba)
    roc_auc = auc(fpr, tpr)
    fig, ax = plt.subplots(figsize=(5, 5))
    ax.plot(fpr, tpr, label=f"AUC = {roc_auc:.3f}")
    ax.plot([0, 1], [0, 1], "k--", label="Random")
    ax.set_xlabel("False Positive Rate")
    ax.set_ylabel("True Positive Rate")
    ax.set_title("ROC Curve")
    ax.legend()
    return fig


def plot_feature_importance(model) -> plt.Figure:
    scores = model._model.feature_importances_
    fig, ax = plt.subplots(figsize=(7, 4))
    ax.barh(FEATURE_COLS, scores)
    ax.set_xlabel("Importance")
    ax.set_title("XGBoost Feature Importance")
    ax.invert_yaxis()
    return fig


def plot_calibration_curve(y_true, y_proba, n_bins: int = 10) -> plt.Figure:
    fraction_of_positives, mean_predicted = calibration_curve(y_true, y_proba, n_bins=n_bins)
    fig, ax = plt.subplots(figsize=(5, 5))
    ax.plot(mean_predicted, fraction_of_positives, "s-", label="Model")
    ax.plot([0, 1], [0, 1], "k--", label="Perfect")
    ax.set_xlabel("Mean Predicted Probability")
    ax.set_ylabel("Fraction of Positives")
    ax.set_title("Calibration Curve")
    ax.legend()
    return fig


def plot_team_comparison(shots_df: pd.DataFrame, model) -> plt.Figure:
    """Bar chart: actual FG% vs model-expected FG% per team."""
    rows = []
    for team, group in shots_df.groupby("TEAM_NAME"):
        actual_fg = group["SHOT_MADE_FLAG"].mean()
        expected_fg = np.mean([
            model.predict_proba(dict(zip(FEATURE_COLS, row)))
            for row in group[FEATURE_COLS].itertuples(index=False)
        ])
        rows.append({"team": team, "actual": actual_fg, "expected": expected_fg})

    result = pd.DataFrame(rows).set_index("team")
    fig, ax = plt.subplots(figsize=(max(8, len(result)), 5))
    x = np.arange(len(result))
    width = 0.35
    ax.bar(x - width / 2, result["actual"], width, label="Actual FG%")
    ax.bar(x + width / 2, result["expected"], width, label="Expected FG%")
    ax.set_xticks(x)
    ax.set_xticklabels(result.index, rotation=45, ha="right")
    ax.set_ylabel("FG%")
    ax.set_title("Actual vs Expected FG% by Team")
    ax.legend()
    fig.tight_layout()
    return fig
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pytest tests/test_evaluate.py -v
```

Expected: All 6 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/nba_shot_quality/evaluate.py tests/test_evaluate.py
git commit -m "feat: add evaluation module with confusion matrix, ROC, feature importance, calibration, team comparison"
```

---

## Task 5: Data Module

**Files:**
- Create: `src/nba_shot_quality/data.py`
- Create: `tests/test_data.py`

- [ ] **Step 1: Write failing tests for caching logic**

Create `tests/test_data.py`:

```python
import os
import tempfile
import pandas as pd
import pytest
from unittest.mock import patch, MagicMock
from nba_shot_quality.data import (
    _cache_path,
    _load_from_cache,
    _save_to_cache,
    add_engineered_features,
)
from nba_shot_quality.features import FEATURE_COLS


def make_raw_shots_df():
    return pd.DataFrame({
        "GAME_ID": ["0021900001"],
        "GAME_EVENT_ID": [10],
        "PLAYER_ID": [2544],
        "PLAYER_NAME": ["LeBron James"],
        "TEAM_ID": [1610612739],
        "TEAM_NAME": ["Cleveland Cavaliers"],
        "PERIOD": [2],
        "MINUTES_REMAINING": [5],
        "SECONDS_REMAINING": [30],
        "SHOT_DISTANCE": [15],
        "LOC_X": [100],
        "LOC_Y": [120],
        "SHOT_MADE_FLAG": [1],
        "score_differential": [3],
        "defender_distance": [1],
    })


def test_cache_path_format():
    path = _cache_path("2023-24", "/tmp/data")
    assert path == "/tmp/data/shots_2023-24.parquet"


def test_save_and_load_cache_round_trip():
    df = make_raw_shots_df()
    with tempfile.TemporaryDirectory() as tmpdir:
        _save_to_cache(df, "2023-24", tmpdir)
        loaded = _load_from_cache("2023-24", tmpdir)
    pd.testing.assert_frame_equal(df.reset_index(drop=True), loaded.reset_index(drop=True))


def test_load_from_cache_returns_none_if_missing():
    with tempfile.TemporaryDirectory() as tmpdir:
        result = _load_from_cache("2099-00", tmpdir)
    assert result is None


def test_add_engineered_features_adds_expected_columns():
    df = make_raw_shots_df()
    result = add_engineered_features(df)
    assert "shot_angle" in result.columns
    assert "seconds_in_period" in result.columns


def test_add_engineered_features_angle_range():
    df = make_raw_shots_df()
    result = add_engineered_features(df)
    assert result["shot_angle"].between(-90, 90).all()
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pytest tests/test_data.py -v
```

Expected: `ImportError` — data.py is empty.

- [ ] **Step 3: Implement `data.py`**

```python
import time
import os
import pandas as pd
from nba_api.stats.endpoints import (
    ShotChartDetail,
    PlayByPlayV2,
    LeagueDashPtShotDefend,
)
from nba_shot_quality.features import (
    compute_angle,
    encode_defender_distance,
    compute_seconds_in_period,
)

_SEASONS = ["2019-20", "2020-21", "2021-22", "2022-23", "2023-24"]
_SLEEP = 0.6  # seconds between nba_api calls to respect rate limits


def _cache_path(season: str, cache_dir: str) -> str:
    return os.path.join(cache_dir, f"shots_{season}.parquet")


def _load_from_cache(season: str, cache_dir: str):
    path = _cache_path(season, cache_dir)
    if os.path.exists(path):
        return pd.read_parquet(path)
    return None


def _save_to_cache(df: pd.DataFrame, season: str, cache_dir: str) -> None:
    os.makedirs(cache_dir, exist_ok=True)
    df.to_parquet(_cache_path(season, cache_dir), index=False)


def add_engineered_features(df: pd.DataFrame) -> pd.DataFrame:
    """Add shot_angle and seconds_in_period columns to a raw shots DataFrame."""
    df = df.copy()
    df["shot_angle"] = df.apply(
        lambda r: compute_angle(r["LOC_X"], r["LOC_Y"]), axis=1
    )
    df["seconds_in_period"] = df.apply(
        lambda r: compute_seconds_in_period(r["MINUTES_REMAINING"], r["SECONDS_REMAINING"]),
        axis=1,
    )
    return df


def _fetch_shot_chart_raw(season: str) -> pd.DataFrame:
    """Fetch all shot attempts for a season from nba_api."""
    response = ShotChartDetail(
        team_id=0,
        player_id=0,
        season_nullable=season,
        season_type_all_star="Regular Season",
        context_measure_simple="FGA",
    )
    time.sleep(_SLEEP)
    return response.get_data_frames()[0]


def _fetch_defender_distances(season: str) -> pd.DataFrame:
    """Fetch player-season level defender distance categories.

    LeagueDashPtShotDefend gives aggregate stats per player per distance category.
    We pick the category with the most FGA as that player's 'typical' defender distance.
    This is a player-season approximation, not per-shot.
    """
    dfs = []
    for dist_range in ["0-2 Feet - Very Tight", "2-4 Feet - Tight", "4-6 Feet - Open", "6+ Feet - Wide Open"]:
        response = LeagueDashPtShotDefend(
            season=season,
            per_mode_simple="PerGame",
            close_def_dist_range_nullable=dist_range,
        )
        df = response.get_data_frames()[0]
        df["CLOSE_DEF_DIST_RANGE"] = dist_range
        dfs.append(df)
        time.sleep(_SLEEP)

    combined = pd.concat(dfs, ignore_index=True)
    # Keep the distance category with the most FGA per player
    idx = combined.groupby("PLAYER_ID")["D_FGA"].idxmax()
    dominant = combined.loc[idx, ["PLAYER_ID", "CLOSE_DEF_DIST_RANGE"]].copy()
    dominant["defender_distance"] = dominant["CLOSE_DEF_DIST_RANGE"].map(encode_defender_distance)
    return dominant[["PLAYER_ID", "defender_distance"]]


def _fetch_score_differentials(game_ids: list) -> pd.DataFrame:
    """Fetch score margin at each play event for a list of game IDs."""
    dfs = []
    for game_id in game_ids:
        response = PlayByPlayV2(game_id=game_id)
        df = response.get_data_frames()[0]
        df["SCOREMARGIN_INT"] = (
            pd.to_numeric(df["SCOREMARGIN"].replace("TIE", "0"), errors="coerce")
            .fillna(0)
            .astype(int)
        )
        dfs.append(df[["GAME_ID", "EVENTNUM", "SCOREMARGIN_INT"]])
        time.sleep(_SLEEP)
    return pd.concat(dfs, ignore_index=True)


def load_or_fetch(seasons: list = None, cache_dir: str = "data") -> pd.DataFrame:
    """Return enriched shots DataFrame, using cache when available.

    Full fetch for 5 seasons takes ~20-30 minutes due to nba_api rate limits.
    Subsequent calls return instantly from Parquet cache.
    """
    if seasons is None:
        seasons = _SEASONS

    all_dfs = []
    for season in seasons:
        cached = _load_from_cache(season, cache_dir)
        if cached is not None:
            print(f"{season}: loaded from cache ({len(cached):,} shots)")
            all_dfs.append(cached)
            continue

        print(f"{season}: fetching from nba_api...")
        shots = _fetch_shot_chart_raw(season)
        defender_df = _fetch_defender_distances(season)
        shots = shots.merge(defender_df, on="PLAYER_ID", how="left")
        shots["defender_distance"] = shots["defender_distance"].fillna(-1).astype(int)

        unique_games = shots["GAME_ID"].unique().tolist()
        print(f"  fetching play-by-play for {len(unique_games)} games...")
        pbp = _fetch_score_differentials(unique_games)
        shots = shots.merge(
            pbp.rename(columns={"EVENTNUM": "GAME_EVENT_ID", "SCOREMARGIN_INT": "score_differential"}),
            on=["GAME_ID", "GAME_EVENT_ID"],
            how="left",
        )
        shots["score_differential"] = shots["score_differential"].fillna(0).astype(int)

        shots = add_engineered_features(shots)
        shots["shot_distance"] = shots["SHOT_DISTANCE"]
        shots["quarter"] = shots["PERIOD"]

        _save_to_cache(shots, season, cache_dir)
        print(f"  saved to cache: {_cache_path(season, cache_dir)}")
        all_dfs.append(shots)

    return pd.concat(all_dfs, ignore_index=True)
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pytest tests/test_data.py -v
```

Expected: All 5 tests PASS. (These tests use only cache logic and `add_engineered_features` — no network calls.)

- [ ] **Step 5: Run full test suite to confirm no regressions**

```bash
pytest tests/ -v
```

Expected: All tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/nba_shot_quality/data.py tests/test_data.py
git commit -m "feat: add data module with nba_api fetching and Parquet cache"
```

---

## Task 6: Notebooks

**Files:**
- Create: `notebooks/01_data.ipynb`
- Create: `notebooks/02_eda.ipynb`
- Create: `notebooks/03_train.ipynb`
- Create: `notebooks/04_evaluate.ipynb`
- Create: `notebooks/05_predict.ipynb`

For each notebook, create via `jupyter nbconvert --to notebook` or write the JSON directly. The cell content below is what each notebook should contain.

- [ ] **Step 1: Create `notebooks/01_data.ipynb`**

Cell 1 (markdown):
```
# 01 — Data Fetch & Cache

Fetches shot data for 2019-20 through 2023-24 from nba_api and caches to Parquet.
First run takes 20–30 min. Subsequent runs are instant.
```

Cell 2 (code):
```python
import sys
sys.path.insert(0, "../src")
from nba_shot_quality.data import load_or_fetch

shots = load_or_fetch(cache_dir="../data")
print(f"Total shots loaded: {len(shots):,}")
shots.head()
```

Cell 3 (code):
```python
print("Columns:", shots.columns.tolist())
print("\nShape:", shots.shape)
print("\nMissing values:\n", shots[["shot_distance","shot_angle","defender_distance",
    "seconds_in_period","quarter","score_differential","SHOT_MADE_FLAG"]].isnull().sum())
```

- [ ] **Step 2: Create `notebooks/02_eda.ipynb`**

Cell 1 (markdown):
```
# 02 — Exploratory Data Analysis
```

Cell 2 (code):
```python
import sys, pandas as pd, matplotlib.pyplot as plt
sys.path.insert(0, "../src")
shots = pd.read_parquet("../data/shots_2023-24.parquet")

fig, axes = plt.subplots(1, 3, figsize=(15, 4))
shots["shot_distance"].hist(bins=40, ax=axes[0])
axes[0].set_title("Shot Distance Distribution")
shots["shot_angle"].hist(bins=40, ax=axes[1])
axes[1].set_title("Shot Angle Distribution")
shots.groupby("quarter")["SHOT_MADE_FLAG"].mean().plot(kind="bar", ax=axes[2])
axes[2].set_title("Make Rate by Quarter")
plt.tight_layout()
plt.show()
```

Cell 3 (code):
```python
# Make rate by defender distance category
shots.groupby("defender_distance")["SHOT_MADE_FLAG"].agg(["mean", "count"]).rename(
    columns={"mean": "FG%", "count": "FGA"}
)
```

Cell 4 (code):
```python
# Top 10 teams by shot volume
shots["TEAM_NAME"].value_counts().head(10).plot(kind="barh", figsize=(8, 5))
plt.title("Shot Volume by Team (2023-24)")
plt.tight_layout()
plt.show()
```

- [ ] **Step 3: Create `notebooks/03_train.ipynb`**

Cell 1 (markdown):
```
# 03 — Feature Engineering & Training
```

Cell 2 (code):
```python
import sys, pandas as pd
from pathlib import Path
sys.path.insert(0, "../src")

from nba_shot_quality.data import load_or_fetch
from nba_shot_quality.features import build_feature_matrix, FEATURE_COLS
from nba_shot_quality.model import ShotQualityModel
from sklearn.model_selection import train_test_split

shots = load_or_fetch(cache_dir="../data")
X, y = build_feature_matrix(shots)
print(f"Features: {FEATURE_COLS}")
print(f"X shape: {X.shape}, make rate: {y.mean():.3f}")
```

Cell 3 (code):
```python
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, stratify=y, random_state=42
)
model = ShotQualityModel()
model.train(X_train, y_train)
print("Training complete.")
```

Cell 4 (code):
```python
metrics = model.evaluate(X_test, y_test)
print(f"ROC-AUC: {metrics['roc_auc']:.4f}")
print(f"Accuracy: {metrics['accuracy']:.4f}")
```

Cell 5 (code):
```python
Path("../models").mkdir(exist_ok=True)
model.save("../models/shot_quality_model.json")
print("Model saved to models/shot_quality_model.json")
```

- [ ] **Step 4: Create `notebooks/04_evaluate.ipynb`**

Cell 1 (markdown):
```
# 04 — Evaluation Dashboard
```

Cell 2 (code):
```python
import sys, pandas as pd
sys.path.insert(0, "../src")

from nba_shot_quality.data import load_or_fetch
from nba_shot_quality.features import build_feature_matrix, FEATURE_COLS
from nba_shot_quality.model import ShotQualityModel
from nba_shot_quality.evaluate import (
    plot_confusion_matrix, plot_roc_auc, plot_feature_importance,
    plot_calibration_curve, plot_team_comparison,
)
from sklearn.model_selection import train_test_split
import numpy as np

shots = load_or_fetch(cache_dir="../data")
X, y = build_feature_matrix(shots)
_, X_test, _, y_test = train_test_split(X, y, test_size=0.2, stratify=y, random_state=42)

model = ShotQualityModel()
model.load("../models/shot_quality_model.json")
```

Cell 3 (code):
```python
y_proba = [model.predict_proba(dict(zip(FEATURE_COLS, row))) for row in X_test.itertuples(index=False)]
y_proba = np.array(y_proba)
y_pred = (y_proba >= 0.5).astype(int)
plot_confusion_matrix(y_test, y_pred)
```

Cell 4 (code):
```python
plot_roc_auc(y_test, y_proba)
```

Cell 5 (code):
```python
plot_feature_importance(model)
```

Cell 6 (code):
```python
plot_calibration_curve(y_test, y_proba)
```

Cell 7 (code):
```python
shots_test = X_test.copy()
shots_test["SHOT_MADE_FLAG"] = y_test.values
shots_test["TEAM_NAME"] = shots.loc[X_test.index, "TEAM_NAME"].values
plot_team_comparison(shots_test, model)
```

- [ ] **Step 5: Create `notebooks/05_predict.ipynb`**

Cell 1 (markdown):
```
# 05 — Interactive Shot Predictor

Adjust the sliders to describe a hypothetical shot and see the model's make probability.
```

Cell 2 (code):
```python
import sys
sys.path.insert(0, "../src")
import ipywidgets as widgets
from IPython.display import display
from nba_shot_quality.model import ShotQualityModel

model = ShotQualityModel()
model.load("../models/shot_quality_model.json")

distance    = widgets.FloatSlider(value=15, min=0, max=35, step=0.5, description="Distance (ft):")
angle       = widgets.FloatSlider(value=0, min=-90, max=90, step=1, description="Angle (°):")
defender    = widgets.IntSlider(value=2, min=0, max=3, step=1,
                                description="Defender dist (0=tight…3=wide open):")
seconds     = widgets.FloatSlider(value=300, min=0, max=720, step=1, description="Sec in period:")
quarter     = widgets.IntSlider(value=2, min=1, max=5, step=1, description="Quarter:")
score_diff  = widgets.IntSlider(value=0, min=-30, max=30, step=1, description="Score diff:")
output      = widgets.Output()

def on_change(_):
    features = {
        "shot_distance": distance.value,
        "shot_angle": angle.value,
        "defender_distance": defender.value,
        "seconds_in_period": seconds.value,
        "quarter": quarter.value,
        "score_differential": score_diff.value,
    }
    prob = model.predict_proba(features)
    with output:
        output.clear_output(wait=True)
        print(f"Make probability: {prob:.1%}")

for w in [distance, angle, defender, seconds, quarter, score_diff]:
    w.observe(on_change, names="value")

display(distance, angle, defender, seconds, quarter, score_diff, output)
on_change(None)
```

- [ ] **Step 6: Commit**

```bash
git add notebooks/
git commit -m "feat: add five notebooks for data, EDA, training, evaluation, and interactive prediction"
```

---

## Task 7: Documentation

**Files:**
- Create: `README.md`
- Create: `docs/superpowers/specs/2026-05-11-shot-quality-model-design.md`

- [ ] **Step 1: Create `README.md`**

```markdown
# NBA Shot Quality Model

An XGBoost classifier that predicts NBA shot make probability (0–1) from six contextual features. Built with `nba_api`, pandas, and XGBoost.

## Features

| Feature | Description |
|---|---|
| `shot_distance` | Distance from basket in feet |
| `shot_angle` | Angle from center line (negative = left, positive = right) |
| `defender_distance` | 0 = Very Tight (0-2ft), 1 = Tight (2-4ft), 2 = Open (4-6ft), 3 = Wide Open (6+ft) |
| `seconds_in_period` | Seconds remaining in the current quarter |
| `quarter` | Period (1–4, 5 = OT) |
| `score_differential` | Positive = shooting team leading |

## Setup

```bash
git clone https://github.com/your-username/NBA_Shot_Quality_Model.git
cd NBA_Shot_Quality_Model
pip install -e .
```

## Notebook Run Order

1. `notebooks/01_data.ipynb` — fetch and cache data (20-30 min first run)
2. `notebooks/02_eda.ipynb` — explore the data
3. `notebooks/03_train.ipynb` — train and save the model
4. `notebooks/04_evaluate.ipynb` — view the evaluation dashboard
5. `notebooks/05_predict.ipynb` — interactive shot prediction

## Python API

```python
from nba_shot_quality import ShotQualityModel

model = ShotQualityModel()
model.load("models/shot_quality_model.json")

prob = model.predict_proba({
    "shot_distance": 22.0,
    "shot_angle": -15.0,
    "defender_distance": 1,
    "seconds_in_period": 120.0,
    "quarter": 4,
    "score_differential": -3,
})
print(f"Make probability: {prob:.1%}")
```

## Data

Shots from the 2019-20 through 2023-24 NBA regular seasons via `nba_api`.
Data is cached locally to `data/` (gitignored) after the first fetch.

## Future: Web App

`ShotQualityModel.predict_proba(features: dict) -> float` maps directly to a FastAPI endpoint — see `docs/superpowers/specs/` for the full design.
```

- [ ] **Step 2: Create design spec**

```markdown
# NBA Shot Quality Model — Design Spec
**Date:** 2026-05-11

## Purpose

Predict NBA shot make probability from shot context features to enable team-level shot quality analysis and interactive exploration. Structured for GitHub sharing and future web app conversion.

## Architecture

`src/nba_shot_quality/` Python package (data, features, model, evaluate) + five ordered Jupyter notebooks. nba_api data is fetched once and cached to Parquet. The `ShotQualityModel.predict_proba(features: dict) -> float` interface is web-ready.

## Features

| Feature | Source | Type |
|---|---|---|
| shot_distance | ShotChartDetail SHOT_DISTANCE | Continuous |
| shot_angle | Computed from LOC_X/LOC_Y via atan2 | Continuous |
| defender_distance | LeagueDashPtShotDefend (player-season aggregate) | Ordinal 0–3 |
| seconds_in_period | ShotChartDetail MINUTES/SECONDS_REMAINING | Continuous |
| quarter | ShotChartDetail PERIOD | Ordinal 1–5 |
| score_differential | PlayByPlayV2 SCOREMARGIN join | Continuous |

## Model

XGBClassifier: n_estimators=200, max_depth=5, learning_rate=0.1, eval_metric=logloss.
80/20 stratified train/test split. Output: make probability (0–1).

## Evaluation

Confusion matrix, ROC-AUC curve, feature importance (XGBoost + SHAP), calibration curve, team actual-vs-expected FG% bar chart.

## Seasons

2019-20 through 2023-24 regular season (~500k+ shot attempts).

## Web App Path

```python
@app.post("/predict")
def predict(features: ShotFeatures) -> float:
    return model.predict_proba(features.dict())
```
```

- [ ] **Step 3: Commit**

```bash
git add README.md docs/
git commit -m "docs: add README and design spec"
```

---

## Verification Checklist

- [ ] `pip install -e .` succeeds and `from nba_shot_quality import ShotQualityModel` works
- [ ] `pytest tests/ -v` — all tests pass
- [ ] `notebooks/01_data.ipynb` runs end-to-end; Parquet files appear in `data/`
- [ ] After running `01`, the enriched DataFrame has no nulls in FEATURE_COLS
- [ ] `notebooks/03_train.ipynb` prints ROC-AUC > 0.60
- [ ] `notebooks/04_evaluate.ipynb` renders all 5 plots without error
- [ ] `notebooks/05_predict.ipynb` sliders update probability on change
- [ ] `model.predict_proba(features_dict)` returns a float between 0 and 1
