import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from sklearn.metrics import (
    ConfusionMatrixDisplay,
    confusion_matrix,
    roc_curve,
    auc,
)
from sklearn.calibration import calibration_curve
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
    scores = model.feature_importances_
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
    df = shots_df.copy()
    df["_predicted"] = model.predict_proba_batch(df)
    result = df.groupby("TEAM_NAME").agg(
        actual=("SHOT_MADE_FLAG", "mean"),
        expected=("_predicted", "mean"),
    )

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
