import os
import re
import json
import difflib
import uvicorn
import glob as glob_module
import pandas as pd
import numpy as np
from functools import lru_cache
from fastapi import FastAPI, HTTPException, Query
from pydantic import BaseModel
from typing import Optional
from groq import Groq
from dotenv import load_dotenv
from fastapi.middleware.cors import CORSMiddleware
from hf_loader import load_csv_from_hf

# ── Setup ─────────────────────────────────────────────────────────────────────
load_dotenv()
app = FastAPI(title="Clarity.AI — AQI + Policy Chatbot")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten to your Vercel URL in production if needed
    allow_methods=["*"],
    allow_headers=["*"],
)

client = Groq(api_key=os.getenv("GROQ_API_KEY"))
STORAGE_ROOT = "./storage"
MODEL_NAME   = "llama-3.1-8b-instant"

# ── Zone metadata ─────────────────────────────────────────────────────────────
ZONE_LABELS = {
    "hyd-somajiguda-tspcb-2024-25":               "Somajiguda",
    "hyd-kompally-municipal-office-tspcb-2024-25": "Kompally",
    "hyd-iith-kandi-tspcb-2024-25":               "IITH Kandi",
    "hyd-icrisat-patancheru-tspcb-2024-25":        "ICRISAT Patancheru",
    "hyd-ida-pashamylaram-tspcb-2024-25":          "IDA Pashamylaram",
    "hyd-central-university-tspcb-2024-25":        "Central University",
    "hyd-zoo-park-tspcb-2024-25":                  "Zoo Park",
}

ZONE_COORDS = {
    "hyd-somajiguda-tspcb-2024-25":               {"lat": 17.4239, "lng": 78.4738},
    "hyd-kompally-municipal-office-tspcb-2024-25": {"lat": 17.5406, "lng": 78.4867},
    "hyd-iith-kandi-tspcb-2024-25":               {"lat": 17.5936, "lng": 78.1320},
    "hyd-icrisat-patancheru-tspcb-2024-25":        {"lat": 17.5169, "lng": 78.2674},
    "hyd-ida-pashamylaram-tspcb-2024-25":          {"lat": 17.5169, "lng": 78.2674},
    "hyd-central-university-tspcb-2024-25":        {"lat": 17.4586, "lng": 78.3318},
    "hyd-zoo-park-tspcb-2024-25":                  {"lat": 17.3616, "lng": 78.4513},
}

# ── Policy dashboard config ───────────────────────────────────────────────────
CPCB_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "..", "..", "cpcb_hyderabad")

CORE_STATIONS = {
    "Somajiguda":         "Somajiguda_ Hyderabad - TSPCB_2025.csv",
    "Kompally":           "Kompally Municipal Office_ Hyderabad - TSPCB_2025.csv",
    "IITH Kandi":         "IITH Kandi_ Hyderabad - TSPCB_2025.csv",
    "ICRISAT Patancheru": "ICRISAT Patancheru_ Hyderabad - TSPCB_2025.csv",
    "IDA Pashamylaram":   "IDA Pashamylaram_ Hyderabad - TSPCB_2025.csv",
    "Central University": "Central University_ Hyderabad - TSPCB_2025.csv",
    "Zoo Park":           "Zoo Park_ Hyderabad - TSPCB_2025.csv",
}

EXTRA_STATIONS = {
    "Bollaram Industrial": "Bollaram Industrial Area_ Hyderabad - TSPCB_2025.csv",
    "ECIL Kapra":          "ECIL Kapra_ Hyderabad - TSPCB_2025.csv",
    "Kokapet":             "Kokapet_ Hyderabad - TSPCB_2025.csv",
    "Nacharam TSIIC":      "Nacharam_TSIIC IALA_ Hyderabad - TSPCB_2025.csv",
    "New Malakpet":        "New Malakpet_ Hyderabad - TSPCB_2025.csv",
    "Ramachandrapuram":    "Ramachandrapuram_ Hyderabad - TSPCB_2025.csv",
    "Sanathnagar":         "Sanathnagar_ Hyderabad - TSPCB_2025.csv",
}

COL_MAP = {
    "PM2.5 (µg/m³)": "pm2_5", "PM10 (µg/m³)": "pm10",
    "NO2 (µg/m³)": "no2",     "SO2 (µg/m³)": "so2",
    "CO (mg/m³)": "co",        "Ozone (µg/m³)": "ozone",
    "NO (µg/m³)": "no",        "NOx (ppb)": "nox",
    "NH3 (µg/m³)": "nh3",      "Benzene (µg/m³)": "benzene",
    "Toluene (µg/m³)": "toluene", "Xylene (µg/m³)": "xylene",
    "AT (°C)": "temp",         "RH (%)": "humidity",
    "WS (m/s)": "wind_speed",  "WD (deg)": "wind_dir",
    "SR (W/mt2)": "solar_rad", "RF (mm)": "rain_fall",
}

STATION_PREFIX_MAP = {k: v.replace("_2025.csv", "") for k, v in CORE_STATIONS.items()}

# Known year ranges per station (from actual data analysis) — used as fast fallback
# when local files aren't available and HF fetching would be too slow
STATION_YEAR_RANGES = {
    "Somajiguda":          list(range(2022, 2026)),
    "Kompally":            list(range(2022, 2026)),
    "IITH Kandi":          list(range(2022, 2026)),
    "ICRISAT Patancheru":  list(range(2017, 2026)),
    "IDA Pashamylaram":    list(range(2016, 2026)),
    "Central University":  list(range(2017, 2026)),
    "Zoo Park":            list(range(2015, 2026)),
    "Bollaram Industrial": list(range(2017, 2026)),
    "ECIL Kapra":          list(range(2022, 2026)),
    "Kokapet":             list(range(2022, 2026)),
    "Nacharam TSIIC":      list(range(2022, 2026)),
    "New Malakpet":        list(range(2022, 2026)),
    "Ramachandrapuram":    list(range(2022, 2026)),
    "Sanathnagar":         list(range(2015, 2026)),
}

NEON_URL = "postgresql://neondb_owner:npg_BKeulphnN0I2@ep-withered-moon-a169dqm7-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

# ── Helpers ───────────────────────────────────────────────────────────────────
def compute_aqi(pm25: float) -> int:
    breakpoints = [
        (0.0, 12.0, 0, 50), (12.1, 35.4, 51, 100), (35.5, 55.4, 101, 150),
        (55.5, 150.4, 151, 200), (150.5, 250.4, 201, 300),
        (250.5, 350.4, 301, 400), (350.5, 500.4, 401, 500),
    ]
    for c_lo, c_hi, i_lo, i_hi in breakpoints:
        if c_lo <= pm25 <= c_hi:
            return round(((i_hi - i_lo) / (c_hi - c_lo)) * (pm25 - c_lo) + i_lo)
    return 500


def get_neon_conn():
    import psycopg2
    return psycopg2.connect(NEON_URL)


@lru_cache(maxsize=20)
def load_station_csv(label: str, resample: str = "1D", year: int = 2025):
    all_stations = {**CORE_STATIONS, **EXTRA_STATIONS}
    fname_2025 = all_stations.get(label)
    if not fname_2025:
        return None
    fname = fname_2025.replace("_2025.csv", f"_{year}.csv")
    df = load_csv_from_hf(fname)
    if df.empty:
        return None
    df = df.rename(columns={"Timestamp": "timestamp", **COL_MAP})
    df = df.set_index("timestamp")
    safe_resample = resample.replace("ME", "M").replace("1ME", "M")
    df = df.select_dtypes(include="number").resample(safe_resample).mean().reset_index()
    df["timestamp"] = df["timestamp"].dt.strftime("%Y-%m-%d")
    for c in df.select_dtypes(include="number").columns:
        df[c] = df[c].round(2)
    return df.dropna(how="all", subset=[c for c in df.columns if c != "timestamp"]).replace({float("nan"): None})


@lru_cache(maxsize=10)
def load_multiyear(station: str, resample: str = "MS") -> pd.DataFrame:
    prefix = STATION_PREFIX_MAP.get(station)
    if not prefix:
        return pd.DataFrame()
    dfs = []
    for year in range(2017, 2026):
        filename = f"{prefix}_{year}.csv"
        try:
            df = load_csv_from_hf(filename)
            if df.empty:
                continue
            df = df.rename(columns={"Timestamp": "timestamp", **COL_MAP})
            dfs.append(df)
        except Exception:
            continue
    if not dfs:
        return pd.DataFrame()
    combined  = pd.concat(dfs, ignore_index=True).set_index("timestamp")
    available = [c for c in COL_MAP.values() if c in combined.columns]
    safe_resample = resample.replace("ME", "M").replace("1ME", "M")
    resampled = combined[available].resample(safe_resample).mean().reset_index()
    resampled["timestamp"] = resampled["timestamp"].dt.strftime("%Y-%m-%d")
    for c in resampled.select_dtypes(include="number").columns:
        resampled[c] = resampled[c].round(2)
    return resampled.dropna(how="all", subset=available).replace({float("nan"): None})


# ── Live Neon DB endpoints ────────────────────────────────────────────────────
@app.get("/live/latest")
def get_live_latest():
    try:
        conn = get_neon_conn()
        cur  = conn.cursor()
        cur.execute("SELECT DISTINCT ON (zone_id) * FROM aqi_measurements_live ORDER BY zone_id, timestamp DESC")
        rows = cur.fetchall()
        cols = [d[0] for d in cur.description]
        conn.close()
        result = []
        for row in rows:
            d    = dict(zip(cols, row))
            pm25 = float(d["pm2_5"]) if d["pm2_5"] is not None else 0
            d["aqi"]       = compute_aqi(pm25)
            d["label"]     = ZONE_LABELS.get(d["zone_id"], d["zone_id"])
            d["lat"]       = ZONE_COORDS.get(d["zone_id"], {}).get("lat", 17.38)
            d["lng"]       = ZONE_COORDS.get(d["zone_id"], {}).get("lng", 78.48)
            d["timestamp"] = d["timestamp"].isoformat() if d["timestamp"] else None
            for k, v in d.items():
                if isinstance(v, float):
                    d[k] = round(v, 3)
            result.append(d)
        return result
    except Exception as e:
        return {"error": str(e)}


@app.get("/live/history")
def get_live_history(zone_id: str = Query(...), limit: int = Query(default=100, le=1000)):
    try:
        conn = get_neon_conn()
        cur  = conn.cursor()
        cur.execute("""
            SELECT timestamp, zone_id, pm2_5, pm10, no2, so2, co, ozone,
                   temp, humidity, wind_speed, no, nox, nh3,
                   benzene, toluene, xylene, wind_dir, solar_rad, rain_fall
            FROM aqi_measurements_live WHERE zone_id = %s
            ORDER BY timestamp DESC LIMIT %s
        """, (zone_id, limit))
        rows = cur.fetchall()
        cols = [d[0] for d in cur.description]
        conn.close()
        result = []
        for row in rows:
            d    = dict(zip(cols, row))
            pm25 = float(d["pm2_5"]) if d["pm2_5"] is not None else 0
            d["aqi"]       = compute_aqi(pm25)
            d["timestamp"] = d["timestamp"].isoformat() if d["timestamp"] else None
            for k, v in d.items():
                if isinstance(v, float):
                    d[k] = round(v, 3)
            result.append(d)
        return list(reversed(result))
    except Exception as e:
        return {"error": str(e)}


# ── Policy data endpoints ─────────────────────────────────────────────────────
@app.get("/policy/stations")
def get_policy_stations():
    return {"core": list(CORE_STATIONS.keys()), "extra": list(EXTRA_STATIONS.keys())}


@app.get("/policy/years")
def get_policy_years(station: str = Query(...)):
    all_stations = {**CORE_STATIONS, **EXTRA_STATIONS}
    fname_2025   = all_stations.get(station)
    if not fname_2025:
        return []

    # Fast path: use known year ranges if local files not available
    local_check = os.path.join(CPCB_DIR, fname_2025)
    if not os.path.exists(local_check) and station in STATION_YEAR_RANGES:
        return sorted(STATION_YEAR_RANGES[station], reverse=True)

    years = []
    for y in range(2009, 2026):
        fname = fname_2025.replace("_2025.csv", f"_{y}.csv")
        local_path = os.path.join(CPCB_DIR, fname)
        if os.path.exists(local_path):
            try:
                df = pd.read_csv(local_path, usecols=["PM2.5 (µg/m³)"], nrows=100)
                if df["PM2.5 (µg/m³)"].notnull().sum() > 0:
                    years.append(y)
            except Exception:
                years.append(y)
        else:
            try:
                df = load_csv_from_hf(fname)
                if not df.empty:
                    if "PM2.5 (µg/m³)" in df.columns:
                        if df["PM2.5 (µg/m³)"].notnull().sum() > 0:
                            years.append(y)
                    else:
                        years.append(y)
            except Exception:
                pass
    return sorted(years, reverse=True)


@app.get("/policy/daterange")
def get_policy_daterange(station: str = Query(...)):
    """Return the min/max years that have actual data as date strings."""
    all_stations = {**CORE_STATIONS, **EXTRA_STATIONS}
    fname_2025   = all_stations.get(station)
    if not fname_2025:
        return {"min": None, "max": None}

    # Fast path: use known year ranges if local files not available
    local_check = os.path.join(CPCB_DIR, fname_2025)
    if not os.path.exists(local_check) and station in STATION_YEAR_RANGES:
        yrs = STATION_YEAR_RANGES[station]
        return {"min": f"{min(yrs)}-01-01", "max": f"{max(yrs)}-12-31"}

    years = []
    for y in range(2009, 2026):
        fname = fname_2025.replace("_2025.csv", f"_{y}.csv")
        local_path = os.path.join(CPCB_DIR, fname)
        if os.path.exists(local_path):
            try:
                df = pd.read_csv(local_path, usecols=["PM2.5 (µg/m³)"], nrows=100)
                if df["PM2.5 (µg/m³)"].notnull().sum() > 0:
                    years.append(y)
            except Exception:
                years.append(y)
        else:
            try:
                df = load_csv_from_hf(fname)
                if not df.empty:
                    if "PM2.5 (µg/m³)" in df.columns:
                        if df["PM2.5 (µg/m³)"].notnull().sum() > 0:
                            years.append(y)
                    else:
                        years.append(y)
            except Exception:
                pass

    if not years:
        return {"min": None, "max": None}
    return {"min": f"{min(years)}-01-01", "max": f"{max(years)}-12-31"}


@app.get("/policy/data")
def get_policy_data(station: str = Query(...), resample: str = Query(default="1D"), year: int = Query(default=2025)):
    df = load_station_csv(station, resample, year)
    if df is None:
        return {"error": f"Station '{station}' not found"}
    return df.to_dict(orient="records")


@app.get("/trends/data")
def get_trends(station: str = Query(...), resample: str = Query(default="MS"),
               date_from: str = Query(default=None), date_to: str = Query(default=None)):
    df = load_multiyear(station, resample)
    if df.empty:
        return {"error": f"No multi-year data for '{station}'"}
    if date_from:
        df = df[df["timestamp"] >= date_from]
    if date_to:
        df = df[df["timestamp"] <= date_to]
    return df.to_dict(orient="records")


# ── Prediction endpoint ───────────────────────────────────────────────────────
class PredictRequest(BaseModel):
    timestamp: str
    zone_id: str
    target: str
    known: Optional[dict] = {}


@app.post("/predict")
def predict_pollutant(req: PredictRequest):
    from predictor import predict
    return predict(timestamp=req.timestamp, zone_id=req.zone_id, known=req.known, target=req.target)


@app.get("/predict/columns")
def get_predictable_columns():
    return {
        "pollutants": ["pm2_5","pm10","no2","so2","co","ozone","no","nox","nh3","benzene","toluene","xylene"],
        "meteorology": ["temp","humidity","wind_speed","wind_dir","solar_rad","rain_fall"],
        "zones": list(ZONE_LABELS.keys()),
    }


# ── Forecast endpoint ─────────────────────────────────────────────────────────
class ForecastRequest(BaseModel):
    station: str
    pollutant: str = "pm2_5"
    policy_start: str = "2020-03-25"
    policy_end: str   = "2020-06-30"
    forecast_days: int = 90


@app.post("/forecast/policy")
def forecast_policy_impact(req: ForecastRequest):
    from forecaster import run_forecast
    return run_forecast(station=req.station, pollutant=req.pollutant,
                        policy_start=req.policy_start, policy_end=req.policy_end,
                        forecast_days=req.forecast_days)


# ── Chatbot (Groq + RAG) ──────────────────────────────────────────────────────
class ChatRequest(BaseModel):
    query: str


def classify_query(query: str) -> dict:
    resp = client.chat.completions.create(
        messages=[{"role": "user", "content": f"""Classify this query for an Indian Environmental Policy assistant.
Categories: "policy" (Indian env law/regulations/standards/AQI), "science" (general env science), "offtopic" (unrelated).
Query: "{query}"
Return ONLY JSON: {{"type": "policy"|"science"|"offtopic", "reason": "one sentence"}}"""}],
        model=MODEL_NAME, response_format={"type": "json_object"}
    )
    try:
        return json.loads(resp.choices[0].message.content)
    except Exception:
        return {"type": "policy", "reason": "classification failed"}


def get_relevant_md_content(file_name: str, target_pages) -> str:
    if not os.path.exists(STORAGE_ROOT):
        return ""
    all_files   = [f for f in os.listdir(STORAGE_ROOT) if f.endswith(".md")]
    clean_target = file_name.lower().replace(".pdf", "").replace(".md", "").strip()
    match = next((f for f in all_files if clean_target in f.lower()), None)
    if not match:
        matches = difflib.get_close_matches(clean_target, all_files, n=1, cutoff=0.2)
        match   = matches[0] if matches else None
    if not match:
        return ""
    try:
        with open(os.path.join(STORAGE_ROOT, match), "r", encoding="utf-8") as f:
            content = f.read()
        if isinstance(target_pages, int):
            target_pages = [target_pages]
        extracted = ""
        for page_num in target_pages:
            m = re.search(rf"## Page {page_num}(?!\d)", content)
            if not m:
                continue
            start  = m.start()
            next_m = re.search(r"## Page \d+", content[start + len(m.group()):])
            end    = start + len(m.group()) + next_m.start() if next_m else len(content)
            extracted += f"\n--- {match} Page {page_num} ---\n{content[start:end][:3500]}"
        return extracted
    except Exception:
        return ""


@app.post("/chat")
async def chat_with_policy(request: ChatRequest):
    classification = classify_query(request.query)
    query_type     = classification.get("type", "policy")

    if query_type == "offtopic":
        return {"answer": "I'm Clarity.AI, focused on Indian environmental policy and air quality. Ask me about AQI standards, CPCB regulations, pollution sources, or health guidelines.", "sources": []}

    if query_type == "science":
        resp = client.chat.completions.create(
            messages=[
                {"role": "system", "content": "You are an environmental science expert. Answer clearly in 3-5 sentences."},
                {"role": "user", "content": request.query}
            ], model=MODEL_NAME
        )
        return {"answer": resp.choices[0].message.content, "sources": []}

    # Policy — RAG pipeline
    available_trees = []
    if os.path.exists(STORAGE_ROOT):
        available_trees = [f for f in os.listdir(STORAGE_ROOT) if f.endswith("_tree.json")]

    if not available_trees:
        resp = client.chat.completions.create(
            messages=[
                {"role": "system", "content": "You are an Indian environmental policy expert. Answer based on CPCB, NAAQS, and Indian pollution regulations."},
                {"role": "user", "content": request.query}
            ], model=MODEL_NAME
        )
        return {"answer": resp.choices[0].message.content, "sources": []}

    slim_maps = []
    for tree_file in available_trees:
        try:
            with open(os.path.join(STORAGE_ROOT, tree_file), "r", encoding="utf-8") as f:
                tree = json.load(f)
            hints = [{"p": s.get("page"), "k": s.get("keywords", [])[:1]}
                     for i, s in enumerate(tree.get("structure", [])) if i < 3 or i % 15 == 0][:8]
            slim_maps.append({"f": tree.get("document", tree_file)[:30], "h": hints})
        except Exception:
            continue

    doc_list  = [{"f": m["f"], "p1k": m["h"][0]["k"] if m["h"] else []} for m in slim_maps]
    file_resp = client.chat.completions.create(
        messages=[{"role": "user", "content": f'Question: {request.query}\nDocs: {json.dumps(doc_list)}\nReturn JSON: {{"files": ["filename.pdf"]}}'}],
        model=MODEL_NAME, response_format={"type": "json_object"}
    )
    selected_files = json.loads(file_resp.choices[0].message.content).get("files", [])
    selected_files = [f if isinstance(f, str) else list(f.values())[0] for f in selected_files if f]

    selected_maps = [m for m in slim_maps if any(sf.lower().replace(".pdf","") in m["f"].lower() for sf in selected_files)] or slim_maps[:2]
    page_resp = client.chat.completions.create(
        messages=[{"role": "user", "content": f'Question: {request.query}\nHints: {json.dumps(selected_maps)}\nReturn JSON: {{"sources": [{{"file_name": "f.pdf", "pages": [1,2]}}]}}'}],
        model=MODEL_NAME, response_format={"type": "json_object"}
    )

    try:
        nav_list     = json.loads(page_resp.choices[0].message.content).get("sources", [])
        full_context = ""
        sources_used = []
        for nav in nav_list[:2]:
            fname = nav.get("file_name")
            pages = nav.get("pages", [1])
            if fname:
                text = get_relevant_md_content(fname, pages)
                if text:
                    full_context += text
                    sources_used.append(f"{fname} (Pages: {pages})")

        if not full_context:
            resp = client.chat.completions.create(
                messages=[
                    {"role": "system", "content": "You are an Indian environmental policy expert."},
                    {"role": "user", "content": request.query}
                ], model=MODEL_NAME
            )
            return {"answer": resp.choices[0].message.content, "sources": []}

        final_resp = client.chat.completions.create(
            messages=[
                {"role": "system", "content": "You are Clarity.AI, an Indian Environmental Policy expert. Answer in 2-4 sentences with specific numbers and units. End with 'Source: [filename], Page [n]'."},
                {"role": "user", "content": f"Context:\n{full_context}\n\nQuestion: {request.query}"}
            ], model=MODEL_NAME
        )
        return {"answer": final_resp.choices[0].message.content, "sources": sources_used}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Runner ────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)


# ── Future Forecast endpoint ──────────────────────────────────────────────────

class FutureForecastRequest(BaseModel):
    station: str
    pollutant: str = "pm2_5"
    days: int = 90


@app.post("/forecast/future")
def forecast_future(req: FutureForecastRequest):
    """
    XGBoost with lag features — trains on all historical data, forecasts N days ahead.
    Uses recursive multi-step forecasting: each predicted day becomes a lag for the next.
    """
    from xgboost import XGBRegressor

    prefix = STATION_PREFIX_MAP.get(req.station)
    if not prefix:
        return {"error": f"Station '{req.station}' not found"}

    # Load all years
    dfs = []
    for year in range(2017, 2026):
        filename = f"{prefix}_{year}.csv"
        try:
            df = load_csv_from_hf(filename)
            if df.empty:
                continue
            df = df.rename(columns={"Timestamp": "timestamp", **COL_MAP})
            dfs.append(df)
        except Exception:
            continue

    if not dfs:
        return {"error": "No data available"}

    combined = pd.concat(dfs, ignore_index=True)
    combined = combined.set_index("timestamp").resample("1D").mean().reset_index()

    target = req.pollutant
    if target not in combined.columns:
        return {"error": f"Pollutant '{target}' not found"}

    combined = combined[["timestamp", target] + [c for c in ["temp", "humidity", "wind_speed"] if c in combined.columns]]
    combined = combined.dropna(subset=[target])

    if len(combined) < 60:
        return {"error": "Not enough historical data"}

    # ── Feature engineering ───────────────────────────────────────────────────
    LAGS = [1, 2, 3, 7, 14, 30]

    def add_features(df: pd.DataFrame) -> pd.DataFrame:
        df = df.copy()
        for lag in LAGS:
            df[f"lag_{lag}"] = df[target].shift(lag)
        df["roll_7_mean"]  = df[target].shift(1).rolling(7).mean()
        df["roll_30_mean"] = df[target].shift(1).rolling(30).mean()
        df["roll_7_std"]   = df[target].shift(1).rolling(7).std()
        df["dayofyear"]    = df["timestamp"].dt.dayofyear
        df["month"]        = df["timestamp"].dt.month
        df["dayofweek"]    = df["timestamp"].dt.dayofweek
        df["sin_doy"]      = np.sin(2 * np.pi * df["dayofyear"] / 365)
        df["cos_doy"]      = np.cos(2 * np.pi * df["dayofyear"] / 365)
        df["sin_month"]    = np.sin(2 * np.pi * df["month"] / 12)
        df["cos_month"]    = np.cos(2 * np.pi * df["month"] / 12)
        for col in ["temp", "humidity", "wind_speed"]:
            if col in df.columns:
                df[f"{col}_lag1"] = df[col].shift(1)
        return df

    feat_df   = add_features(combined)
    feat_cols = [c for c in feat_df.columns if c not in ["timestamp", target, "temp", "humidity", "wind_speed"]]
    train_df  = feat_df.dropna(subset=feat_cols + [target])

    # ── Train model — LightGBM quantile + log-transform for NO2, XGBoost for rest ──
    use_log = (target == 'no2')

    if target == 'no2':
        from lightgbm import LGBMRegressor
        model = LGBMRegressor(
            n_estimators=500, max_depth=6, learning_rate=0.03,
            objective='quantile', alpha=0.5,
            subsample=0.8, colsample_bytree=0.8,
            random_state=42, verbose=-1,
        )
        y_train = np.log1p(train_df[target])
    else:
        model = XGBRegressor(
            n_estimators=500, max_depth=5, learning_rate=0.03,
            subsample=0.8, colsample_bytree=0.8,
            min_child_weight=3, random_state=42, verbosity=0,
        )
        y_train = train_df[target]

    model.fit(train_df[feat_cols], y_train)

    # ── Precompute seasonal baselines (day-of-year averages from training data) ──
    # Used to anchor rolling stats for long-horizon forecasts instead of compounding errors
    train_df = train_df.copy()
    train_df["doy"] = train_df["timestamp"].dt.dayofyear
    seasonal_mean = train_df.groupby("doy")[target].mean().to_dict()
    seasonal_std  = train_df.groupby("doy")[target].std().fillna(0).to_dict()

    # ── Recursive multi-step forecast ─────────────────────────────────────────
    MAX_LAG    = max(LAGS)
    history    = combined[target].tolist()
    hist_dates = combined["timestamp"].tolist()
    last_date  = hist_dates[-1]

    future_preds = []
    for i in range(1, req.days + 1):
        next_date = last_date + pd.Timedelta(days=i)
        row = {}

        # Lag features — use real history for first MAX_LAG days, then predictions
        for lag in LAGS:
            idx = -(lag)
            row[f"lag_{lag}"] = history[idx] if abs(idx) <= len(history) else np.nan

        # Rolling stats — blend recent predictions with seasonal baseline
        # After 30 days, predictions drift; anchor to seasonal mean to prevent collapse
        blend_weight = min(1.0, i / 30.0)  # 0→1 over first 30 days
        recent_7  = history[-7:]  if len(history) >= 7  else history
        recent_30 = history[-30:] if len(history) >= 30 else history
        doy = next_date.dayofyear
        s_mean = seasonal_mean.get(doy, np.mean(list(seasonal_mean.values())))
        s_std  = seasonal_std.get(doy, np.std(list(seasonal_mean.values())))

        row["roll_7_mean"]  = (1 - blend_weight) * np.mean(recent_7)  + blend_weight * s_mean
        row["roll_30_mean"] = (1 - blend_weight) * np.mean(recent_30) + blend_weight * s_mean
        row["roll_7_std"]   = (1 - blend_weight) * np.std(recent_7)   + blend_weight * s_std

        row["dayofyear"] = next_date.dayofyear
        row["month"]     = next_date.month
        row["dayofweek"] = next_date.dayofweek
        row["sin_doy"]   = np.sin(2 * np.pi * next_date.dayofyear / 365)
        row["cos_doy"]   = np.cos(2 * np.pi * next_date.dayofyear / 365)
        row["sin_month"] = np.sin(2 * np.pi * next_date.month / 12)
        row["cos_month"] = np.cos(2 * np.pi * next_date.month / 12)

        for col in ["temp", "humidity", "wind_speed"]:
            if f"{col}_lag1" in feat_cols:
                last_met = combined[col].dropna().iloc[-1] if col in combined.columns and combined[col].notnull().any() else 0
                row[f"{col}_lag1"] = last_met

        X    = pd.DataFrame([row])[feat_cols]
        pred = float(model.predict(X)[0])
        if use_log:
            pred = float(np.expm1(pred))  # inverse log transform for NO2
        # Blend prediction with seasonal mean for long horizons (prevents drift)
        if i > 30:
            seasonal_blend = min(0.6, (i - 30) / 300)  # gradually blend up to 60%
            pred = (1 - seasonal_blend) * pred + seasonal_blend * s_mean
        pred = max(0, pred)

        future_preds.append({"date": next_date.strftime("%Y-%m-%d"), "forecast": round(pred, 2)})
        history.append(pred)

    # ── Build result: last 6 months actual + future ───────────────────────────
    cutoff = last_date - pd.Timedelta(days=180)
    actual_map = dict(zip(
        combined["timestamp"].dt.strftime("%Y-%m-%d"),
        combined[target]
    ))

    result = []
    for date_str, actual in actual_map.items():
        if pd.Timestamp(date_str) >= cutoff:
            result.append({
                "date":     date_str,
                "actual":   round(float(actual), 2) if not pd.isna(actual) else None,
                "forecast": None,
                "is_future": False,
            })

    for fp in future_preds:
        result.append({
            "date":     fp["date"],
            "actual":   None,
            "forecast": fp["forecast"],
            "is_future": True,
        })

    result.sort(key=lambda x: x["date"])

    return {
        "station":       req.station,
        "pollutant":     target,
        "model":         "XGBoost (lag features)",
        "train_days":    len(train_df),
        "forecast_days": req.days,
        "last_actual":   last_date.strftime("%Y-%m-%d"),
        "data":          result,
    }


# ── data.gov.in Real-time AQI endpoint ───────────────────────────────────────

import requests as http_requests
from datetime import datetime, timedelta

DATA_GOV_API_KEY = "579b464db66ec23bdd00000160dd200835614fc2524aeeffcd97d13d"
DATA_GOV_URL     = "https://api.data.gov.in/resource/3b01bcb8-0b14-4abf-b6f2-c1bfd384ba69"

# Cache: store result + timestamp, refresh every 10 minutes
_api_cache: dict = {"data": None, "fetched_at": None}
CACHE_TTL = timedelta(minutes=10)


@app.get("/api/realtime")
def get_realtime_aqi(city: str = Query(default="Hyderabad"), limit: int = Query(default=500)):
    """Fetch latest AQI data from data.gov.in — cached for 10 minutes."""
    global _api_cache

    # Return cached data if still fresh
    if (_api_cache["data"] is not None and
            _api_cache["fetched_at"] is not None and
            datetime.utcnow() - _api_cache["fetched_at"] < CACHE_TTL):
        return _api_cache["data"]

    try:
        resp = http_requests.get(DATA_GOV_URL, params={
            "api-key": DATA_GOV_API_KEY,
            "format":  "json",
            "filters[city]": city,
            "limit":   limit,
        }, timeout=30)   # 30s timeout
        resp.raise_for_status()
        data    = resp.json()
        records = data.get("records", [])

        if not records:
            return {"error": f"No data found for {city}", "stations": []}

        df = pd.DataFrame(records)
        for col in ["avg_value", "min_value", "max_value"]:
            if col in df.columns:
                df[col] = pd.to_numeric(df[col], errors="coerce")

        if "pollutant_id" not in df.columns:
            return {"raw": records}

        wide = df.pivot_table(
            index=["station", "city", "state", "latitude", "longitude", "last_update"],
            columns="pollutant_id",
            values="avg_value",
            aggfunc="mean",
        ).reset_index()
        wide.columns.name = None

        if "PM2.5" in wide.columns:
            wide["aqi"] = wide["PM2.5"].apply(
                lambda x: compute_aqi(float(x)) if pd.notnull(x) else None
            )

        for col in wide.select_dtypes(include="number").columns:
            wide[col] = wide[col].round(2)
        wide = wide.replace({float("nan"): None})

        result = {
            "city":            city,
            "total_stations":  len(wide),
            "last_update":     wide["last_update"].iloc[0] if len(wide) > 0 else None,
            "cached_at":       datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC"),
            "next_refresh_in": "10 minutes",
            "stations":        wide.to_dict(orient="records"),
        }

        # Store in cache
        _api_cache["data"]       = result
        _api_cache["fetched_at"] = datetime.utcnow()
        return result

    except Exception as e:
        # Return stale cache if available rather than error
        if _api_cache["data"] is not None:
            stale = dict(_api_cache["data"])
            stale["warning"] = f"Using cached data — live fetch failed: {str(e)}"
            return stale
        return {"error": str(e), "stations": []}
