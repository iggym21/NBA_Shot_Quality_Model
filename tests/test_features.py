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
