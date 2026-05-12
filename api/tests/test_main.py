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


def test_predict_503_when_model_not_loaded(client, monkeypatch):
    monkeypatch.setattr(main_module, "model", None)
    response = client.post("/predict", json=VALID_PAYLOAD)
    assert response.status_code == 503


def test_health_returns_ok(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"
