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
