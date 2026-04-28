"""
Pollution Forecaster using Prophet
- Loads all available years (2017-2025) per station
- Trains on pre-policy data
- Forecasts what pollution would be without intervention
- Simulates policy effect on actual readings
"""

import os
import glob as glob_module
import pandas as pd
import numpy as np
from functools import lru_cache
from hf_loader import load_csv_from_hf
import logging
logging.getLogger("prophet").setLevel(logging.WARNING)
logging.getLogger("cmdstanpy").setLevel(logging.WARNING)

CPCB_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "..", "..", "cpcb_hyderabad")

STATION_PREFIX = {
    "Somajiguda":         "Somajiguda_ Hyderabad - TSPCB",
    "Kompally":           "Kompally Municipal Office_ Hyderabad - TSPCB",
    "IITH Kandi":         "IITH Kandi_ Hyderabad - TSPCB",
    "ICRISAT Patancheru": "ICRISAT Patancheru_ Hyderabad - TSPCB",
    "IDA Pashamylaram":   "IDA Pashamylaram_ Hyderabad - TSPCB",
    "Central University": "Central University_ Hyderabad - TSPCB",
    "Zoo Park":           "Zoo Park_ Hyderabad - TSPCB",
}

STATION_FILES = {k: f"{v}_2025.csv" for k, v in STATION_PREFIX.items()}

COL_MAP = {
    "PM2.5 (µg/m³)": "pm2_5", "PM10 (µg/m³)": "pm10",
    "NO2 (µg/m³)": "no2",     "SO2 (µg/m³)": "so2",
    "CO (mg/m³)": "co",        "Ozone (µg/m³)": "ozone",
    "AT (°C)": "temp",         "RH (%)": "humidity",
    "WS (m/s)": "wind_speed",  "SR (W/mt2)": "solar_rad",
}


@lru_cache(maxsize=14)
def load_daily(station: str) -> pd.DataFrame:
    prefix = STATION_PREFIX.get(station)
    if not prefix:
        return pd.DataFrame()

    all_dfs = []
    for year in range(2016, 2026):
        filename = f"{prefix}_{year}.csv"
        try:
            df = load_csv_from_hf(filename)
            if df.empty:
                continue
            df = df.rename(columns={"Timestamp": "timestamp", **COL_MAP})
            all_dfs.append(df)
        except Exception as e:
            print(f"  Skipping {filename}: {e}")

    if not all_dfs:
        return pd.DataFrame()

    combined = pd.concat(all_dfs, ignore_index=True)
    combined = combined.set_index("timestamp")
    available = [c for c in COL_MAP.values() if c in combined.columns]
    daily = combined[available].resample("1D").mean()
    daily = daily.interpolate(method="time", limit=3)
    daily = daily.reset_index()
    daily["timestamp"] = daily["timestamp"].dt.strftime("%Y-%m-%d")
    print(f"Loaded {len(daily)} daily rows for {station} ({daily['timestamp'].min()} → {daily['timestamp'].max()})")
    return daily


def run_forecast(
    station: str,
    pollutant: str,
    policy_start: str,
    policy_end: str,
    forecast_days: int = 90,
):
    df = load_daily(station)
    if df.empty:
        return {"error": f"No data for station '{station}'"}
    if pollutant not in df.columns:
        return {"error": f"Pollutant '{pollutant}' not found"}

    df["timestamp"] = pd.to_datetime(df["timestamp"])
    policy_start_dt = pd.to_datetime(policy_start)
    policy_end_dt   = pd.to_datetime(policy_end)

    # Train on all data before policy window
    train_df = df[df["timestamp"] < policy_start_dt].copy()
    train = train_df[["timestamp", pollutant]].dropna()
    train = train.rename(columns={"timestamp": "ds", pollutant: "y"})

    if len(train) < 30:
        return {"error": f"Not enough pre-policy data ({len(train)} days)."}

    print(f"Training Prophet on {len(train)} days ({train['ds'].min().date()} → {train['ds'].max().date()})")

    from prophet import Prophet  # lazy import — saves ~150MB RAM at startup

    # Met regressors — skip if too many NaNs
    met_cols = []  # disabled: met data has too many gaps across years

    model = Prophet(
        daily_seasonality=False,
        weekly_seasonality=True,
        yearly_seasonality=True,
        changepoint_prior_scale=0.05,
        seasonality_prior_scale=10,
        interval_width=0.90,
    )

    train = train.dropna(subset=["y"])
    model.fit(train)

    # Forecast to end of policy + buffer
    future_end = max(df["timestamp"].max(), policy_end_dt) + pd.Timedelta(days=14)
    n_periods  = int((future_end - train["ds"].max()).days)
    future     = model.make_future_dataframe(periods=n_periods, freq="D")
    forecast_df = model.predict(future)

    # Actual values map — real data, no simulation
    actual_map = dict(zip(df["timestamp"].dt.strftime("%Y-%m-%d"), df[pollutant]))

    result = []
    for _, row in forecast_df.iterrows():
        date_str     = row["ds"].strftime("%Y-%m-%d")
        in_policy    = bool(policy_start_dt <= row["ds"] <= policy_end_dt)
        forecast_val = float(row["yhat"])

        actual = actual_map.get(date_str)
        actual_val = float(actual) if actual is not None and not np.isnan(float(actual)) else None

        result.append({
            "date":          date_str,
            "actual":        round(actual_val, 2) if actual_val is not None else None,
            "forecast":      round(forecast_val, 2),
            "forecast_low":  round(float(row["yhat_lower"]), 2),
            "forecast_high": round(float(row["yhat_upper"]), 2),
            "in_policy":     in_policy,
        })

    # Impact stats
    policy_rows = [r for r in result if r["in_policy"] and r["actual"] is not None]
    impact = {}
    if policy_rows:
        avg_actual   = float(np.mean([r["actual"]   for r in policy_rows]))
        avg_forecast = float(np.mean([r["forecast"] for r in policy_rows]))
        reduction    = avg_forecast - avg_actual
        impact = {
            "avg_actual":       round(avg_actual, 2),
            "avg_forecast":     round(avg_forecast, 2),
            "avg_reduction":    round(reduction, 2),
            "reduction_pct":    round((reduction / avg_forecast) * 100, 1) if avg_forecast else 0,
            "policy_effective": bool(reduction > 0),
        }

    return {
        "station":      station,
        "pollutant":    pollutant,
        "policy_start": policy_start,
        "policy_end":   policy_end,
        "train_rows":   len(train),
        "impact":       impact,
        "data":         result,
    }
