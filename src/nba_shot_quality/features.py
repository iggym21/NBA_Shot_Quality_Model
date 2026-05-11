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
    At-basket shots (loc_x=0, loc_y=0) return 0.0 by atan2 convention.
    """
    return math.degrees(math.atan2(loc_x, loc_y))


def encode_defender_distance(category: str) -> int:
    """Map nba_api defender distance string to ordinal 0-3. Returns -1 for unknown."""
    return DEFENDER_DISTANCE_MAP.get(category, -1)


def compute_seconds_in_period(minutes_remaining: float, seconds_remaining: float) -> float:
    """Total seconds remaining in the current period."""
    return minutes_remaining * 60 + seconds_remaining


def build_feature_matrix(df: pd.DataFrame) -> tuple[pd.DataFrame, "pd.Series"]:
    """Return (X, y) from an enriched shots DataFrame.

    Expects df to already contain all FEATURE_COLS plus SHOT_MADE_FLAG.
    """
    X = df[FEATURE_COLS].copy()
    y = df["SHOT_MADE_FLAG"]
    return X, y
