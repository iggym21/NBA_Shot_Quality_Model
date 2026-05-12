import os
import tempfile
import pandas as pd
import pytest
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
