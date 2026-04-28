"""
Shared helper — loads CPCB CSVs from Hugging Face dataset repo.
Falls back to local disk if HF is unavailable or file not found.

Usage:
    from hf_loader import load_csv_from_hf
    df = load_csv_from_hf("Somajiguda_ Hyderabad - TSPCB_2025.csv")
"""

import os
import io
import requests
import pandas as pd
from functools import lru_cache
from dotenv import load_dotenv

load_dotenv()

HF_DATASET_REPO = os.getenv("HF_DATASET_REPO", "AbhinavHuggingFaceAccount/cpcb-hyderabad")
HF_TOKEN        = os.getenv("HF_TOKEN_UPLOAD") or os.getenv("HF_TOKEN")
CPCB_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "..", "..", "cpcb_hyderabad")
# Also try cpcb_hyderabad1 as fallback
if not os.path.isdir(CPCB_DIR):
    CPCB_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "..", "..", "cpcb_hyderabad1")

# In-memory cache: filename → raw CSV bytes
_csv_cache: dict = {}


def load_csv_from_hf(filename: str) -> pd.DataFrame:
    """
    Load a CSV by filename. Checks in-memory cache first,
    then tries local disk, then fetches from Hugging Face.
    """
    # 1. In-memory cache hit
    if filename in _csv_cache:
        return pd.read_csv(io.BytesIO(_csv_cache[filename]), parse_dates=["Timestamp"])

    # 2. Local disk (works in dev, falls back gracefully)
    local_path = os.path.join(CPCB_DIR, filename)
    if os.path.exists(local_path):
        df = pd.read_csv(local_path, parse_dates=["Timestamp"])
        # Cache it too
        with open(local_path, "rb") as f:
            _csv_cache[filename] = f.read()
        return df

    # 3. Fetch from Hugging Face
    url = f"https://huggingface.co/datasets/{HF_DATASET_REPO}/resolve/main/{requests.utils.quote(filename)}"
    headers = {}
    if HF_TOKEN:
        headers["Authorization"] = f"Bearer {HF_TOKEN}"

    print(f"  Fetching from HF: {filename} ...")
    try:
        resp = requests.get(url, headers=headers, timeout=60)
        resp.raise_for_status()
        _csv_cache[filename] = resp.content
        return pd.read_csv(io.BytesIO(resp.content), parse_dates=["Timestamp"])
    except Exception as e:
        print(f"  Failed to fetch {filename} from HF: {e}")
        return pd.DataFrame()
