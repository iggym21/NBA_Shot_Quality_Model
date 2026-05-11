import numpy as np
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

    @property
    def feature_importances_(self) -> "np.ndarray":
        return self._model.feature_importances_

    def train(self, X_train: pd.DataFrame, y_train) -> None:
        self._model.fit(X_train[FEATURE_COLS], y_train)

    def predict_proba(self, features: dict) -> float:
        """Return make probability for a single shot. Web-ready interface."""
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
