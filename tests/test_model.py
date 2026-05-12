import os
import tempfile
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


def test_predict_proba_batch_returns_array(trained_model):
    model, X, _ = trained_model
    result = model.predict_proba_batch(X)
    import numpy as np
    assert isinstance(result, np.ndarray)
    assert result.shape == (len(X),)
    assert (result >= 0).all() and (result <= 1).all()
