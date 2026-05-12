import time
import os
import pandas as pd
from nba_api.stats.endpoints import (
    ShotChartDetail,
    PlayByPlayV2,
    LeagueDashPlayerPtShot,
)
from nba_shot_quality.features import (
    compute_angle,
    encode_defender_distance,
    compute_seconds_in_period,
)

_SEASONS = ["2019-20", "2020-21", "2021-22", "2022-23", "2023-24"]
_SLEEP = 0.6  # seconds between nba_api calls to respect rate limits


def _cache_path(season: str, cache_dir: str) -> str:
    return os.path.join(cache_dir, f"shots_{season}.parquet")


def _load_from_cache(season: str, cache_dir: str):
    path = _cache_path(season, cache_dir)
    if os.path.exists(path):
        return pd.read_parquet(path)
    return None


def _save_to_cache(df: pd.DataFrame, season: str, cache_dir: str) -> None:
    os.makedirs(cache_dir, exist_ok=True)
    df.to_parquet(_cache_path(season, cache_dir), index=False)


def add_engineered_features(df: pd.DataFrame) -> pd.DataFrame:
    """Add shot_angle and seconds_in_period columns to a raw shots DataFrame.

    Clips shot_angle to [-90, 90] to handle behind-basket shots (LOC_Y < 0),
    which represent tip-ins and putbacks where angle is not meaningful.
    """
    import numpy as np
    df = df.copy()
    df["shot_angle"] = np.degrees(np.arctan2(df["LOC_X"], df["LOC_Y"])).clip(-90, 90)
    df["seconds_in_period"] = df["MINUTES_REMAINING"] * 60 + df["SECONDS_REMAINING"]
    return df


def _fetch_shot_chart_raw(season: str) -> pd.DataFrame:
    """Fetch all shot attempts for a season from nba_api."""
    response = ShotChartDetail(
        team_id=0,
        player_id=0,
        season_nullable=season,
        season_type_all_star="Regular Season",
        context_measure_simple="FGA",
    )
    time.sleep(_SLEEP)
    return response.get_data_frames()[0]


def _fetch_defender_distances(season: str) -> pd.DataFrame:
    """Fetch player-season level defender distance categories.

    LeagueDashPlayerPtShot gives aggregate shooting stats per player per close defender
    distance category. We pick the category with the most FGA as that player's 'typical'
    defender distance. This is a player-season approximation, not per-shot.
    """
    dfs = []
    for dist_range in ["0-2 Feet - Very Tight", "2-4 Feet - Tight", "4-6 Feet - Open", "6+ Feet - Wide Open"]:
        response = LeagueDashPlayerPtShot(
            season=season,
            per_mode_simple="PerGame",
            close_def_dist_range_nullable=dist_range,
        )
        df = response.get_data_frames()[0]
        df["CLOSE_DEF_DIST_RANGE"] = dist_range
        dfs.append(df)
        time.sleep(_SLEEP)

    combined = pd.concat(dfs, ignore_index=True)
    # Keep the distance category with the most FGA per player
    idx = combined.groupby("PLAYER_ID")["FGA"].idxmax()
    dominant = combined.loc[idx, ["PLAYER_ID", "CLOSE_DEF_DIST_RANGE"]].copy()
    dominant["defender_distance"] = dominant["CLOSE_DEF_DIST_RANGE"].map(encode_defender_distance)
    return dominant[["PLAYER_ID", "defender_distance"]]


def _fetch_score_differentials(game_ids: list) -> pd.DataFrame:
    """Fetch score margin at each play event for a list of game IDs."""
    dfs = []
    for game_id in game_ids:
        response = PlayByPlayV2(game_id=game_id)
        df = response.get_data_frames()[0]
        df["SCOREMARGIN_INT"] = (
            pd.to_numeric(df["SCOREMARGIN"].replace("TIE", "0"), errors="coerce")
            .fillna(0)
            .astype(int)
        )
        dfs.append(df[["GAME_ID", "EVENTNUM", "SCOREMARGIN_INT"]])
        time.sleep(_SLEEP)
    return pd.concat(dfs, ignore_index=True)


def load_or_fetch(seasons: list = None, cache_dir: str = "data") -> pd.DataFrame:
    """Return enriched shots DataFrame, using cache when available.

    Full fetch for 5 seasons takes ~20-30 minutes due to nba_api rate limits.
    Subsequent calls return instantly from Parquet cache.
    """
    if seasons is None:
        seasons = _SEASONS

    all_dfs = []
    for season in seasons:
        cached = _load_from_cache(season, cache_dir)
        if cached is not None:
            print(f"{season}: loaded from cache ({len(cached):,} shots)")
            all_dfs.append(cached)
            continue

        print(f"{season}: fetching from nba_api...")
        shots = _fetch_shot_chart_raw(season)
        defender_df = _fetch_defender_distances(season)
        shots = shots.merge(defender_df, on="PLAYER_ID", how="left")
        shots["defender_distance"] = shots["defender_distance"].fillna(-1).astype(int)

        unique_games = shots["GAME_ID"].unique().tolist()
        print(f"  fetching play-by-play for {len(unique_games)} games...")
        pbp = _fetch_score_differentials(unique_games)
        shots = shots.merge(
            pbp.rename(columns={"EVENTNUM": "GAME_EVENT_ID", "SCOREMARGIN_INT": "score_differential"}),
            on=["GAME_ID", "GAME_EVENT_ID"],
            how="left",
        )
        shots["score_differential"] = shots["score_differential"].fillna(0).astype(int)

        shots = add_engineered_features(shots)
        shots["shot_distance"] = shots["SHOT_DISTANCE"]
        shots["quarter"] = shots["PERIOD"]

        _save_to_cache(shots, season, cache_dir)
        print(f"  saved to cache: {_cache_path(season, cache_dir)}")
        all_dfs.append(shots)

    if not all_dfs:
        return pd.DataFrame()
    return pd.concat(all_dfs, ignore_index=True)
