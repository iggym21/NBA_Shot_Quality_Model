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
