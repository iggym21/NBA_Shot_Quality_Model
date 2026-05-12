#!/usr/bin/env python3
"""Generate web/data/team_stats.json from the trained model and cached shot data.

Run from project root:
    python scripts/generate_team_stats.py

Prerequisites:
    - Run notebook 01_data.ipynb to cache shot data in data/
    - Run notebook 03_train.ipynb to save model to models/shot_quality_model.json
"""

import json
import sys
from datetime import date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

import pandas as pd
from nba_shot_quality.data import load_or_fetch
from nba_shot_quality.features import FEATURE_COLS
from nba_shot_quality.model import ShotQualityModel

ZONE_MAP = {
    "Restricted Area": "At Rim",
    "In The Paint (Non-RA)": "Mid-Range",
    "Mid-Range": "Mid-Range",
    "Left Corner 3": "Corner 3",
    "Right Corner 3": "Corner 3",
    "Above the Break 3": "Above Break 3",
    "Backcourt": None,
}
ZONES = ["At Rim", "Mid-Range", "Corner 3", "Above Break 3"]


def build_team_stats(df: pd.DataFrame, model: ShotQualityModel) -> list[dict]:
    df = df.copy()
    df["_zone"] = df["SHOT_ZONE_BASIC"].map(ZONE_MAP)
    df = df[df["_zone"].notna()].copy()
    df["_expected"] = model.predict_proba_batch(df[FEATURE_COLS])

    teams = []
    for team_name, team_df in df.groupby("TEAM_NAME"):
        zones: dict[str, dict] = {}
        for zone in ZONES:
            zone_df = team_df[team_df["_zone"] == zone]
            if zone_df.empty:
                zones[zone] = {"actual": 0.0, "expected": 0.0, "fga": 0}
            else:
                zones[zone] = {
                    "actual": round(float(zone_df["SHOT_MADE_FLAG"].mean()), 4),
                    "expected": round(float(zone_df["_expected"].mean()), 4),
                    "fga": len(zone_df),
                }

        teams.append(
            {
                "name": team_name,
                "overall": {
                    "actual": round(float(team_df["SHOT_MADE_FLAG"].mean()), 4),
                    "expected": round(float(team_df["_expected"].mean()), 4),
                },
                "zones": zones,
            }
        )

    teams.sort(
        key=lambda t: t["overall"]["actual"] - t["overall"]["expected"], reverse=True
    )
    return teams


def main() -> None:
    model_path = Path("models/shot_quality_model.json")
    if not model_path.exists():
        print(
            f"Error: model not found at {model_path}. "
            "Run notebook 03_train.ipynb first.",
            file=sys.stderr,
        )
        sys.exit(1)

    print("Loading model...")
    model = ShotQualityModel()
    model.load(str(model_path))

    print("Loading shot data (may take a moment on first run)...")
    df = load_or_fetch()
    if df.empty:
        print(
            "Error: no shot data. Run notebook 01_data.ipynb first.",
            file=sys.stderr,
        )
        sys.exit(1)

    df = df.dropna(subset=FEATURE_COLS + ["SHOT_ZONE_BASIC", "TEAM_NAME"])
    print(
        f"Loaded {len(df):,} shots across "
        f"{df['TEAM_NAME'].nunique()} teams."
    )

    print("Computing team stats...")
    teams = build_team_stats(df, model)

    season = df["SEASON_ID"].iloc[0] if "SEASON_ID" in df.columns else "2023-24"
    output = {
        "teams": teams,
        "season": str(season),
        "generated": str(date.today()),
    }

    out_path = Path("web/data/team_stats.json")
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with open(out_path, "w") as f:
        json.dump(output, f, indent=2)

    print(f"Written to {out_path} ({len(teams)} teams).")


if __name__ == "__main__":
    main()
