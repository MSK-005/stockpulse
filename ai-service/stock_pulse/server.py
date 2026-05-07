"""
server.py
──────────
FastAPI server — this is what your backend teammate plugs into.

YOUR TEAMMATE just needs to:
  1. pip install fastapi uvicorn
  2. python server.py --data path/to/data.csv
  3. Hit http://localhost:8000/docs for interactive API docs

YOU (ML guy) do NOT need to touch this file.
"""

import argparse
import os
from contextlib import asynccontextmanager

import uvicorn
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware

from engine import StockPulseEngine


# ── CLI args ─────────────────────────────────────────────────────────────────
parser = argparse.ArgumentParser()
parser.add_argument("--data",   help="Path to CSV file (default: env DATA_PATH)")
parser.add_argument("--host",   default="0.0.0.0", help="Host")
parser.add_argument("--port",   default=8000, type=int)
parser.add_argument("--window", default=180,  type=int)
args = parser.parse_args()

# data path priority: CLI arg > env variable > default
DATA_PATH = args.data or os.getenv("DATA_PATH", "data/sample_stocks.csv")
WINDOW = args.window


# ── Lifespan ───────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Run pipeline at startup, clean up on shutdown."""
    app.state.engine = StockPulseEngine(
        data_path=DATA_PATH,
        stability_window=WINDOW,
    )
    app.state.engine.run_pipeline()
    print("\n✅ Engine ready — API is live.\n")
    yield
    print("🛑 Server shutting down.")


# ── App ─────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="Stock Pulse API",
    description="Quant clustering engine — v5.0",
    version="5.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # tighten in production
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Helper ─────────────────────────────────────────────────────────────────
def get_engine():
    eng = app.state.engine
    if not eng:
        raise HTTPException(status_code=503, detail="Engine not initialised")
    return eng


# ── Endpoints ────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/scorecard")
def scorecard():
    return get_engine().get_scorecard()


@app.get("/clusters")
def clusters():
    return get_engine().api_get_all_clusters()


@app.get("/clusters/{cluster_id}")
def cluster_detail(cluster_id: int):
    result = get_engine().api_get_cluster_detail(cluster_id)
    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])
    return result


@app.get("/similar/{stock}")
def similar(stock: str, top_n: int = 5):
    result = get_engine().api_get_similar(stock.upper(), top_n=top_n)
    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])
    return result


@app.get("/group/{stock}")
def group(stock: str):
    result = get_engine().api_get_group(stock.upper())
    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])
    return result


@app.get("/anomalies")
def anomalies():
    return get_engine().api_get_anomalies()


@app.post("/refresh")
def refresh(background_tasks: BackgroundTasks):
    background_tasks.add_task(get_engine().refresh_model)
    return {"status": "refresh started", "note": "check /scorecard for completion"}


@app.post("/stream")
def stream_prices(payload: dict):
    import pandas as pd
    try:
        new_df = pd.DataFrame(payload["rows"])
        result = get_engine().update_new_prices(new_df)
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ── Entry point ─────────────────────────────────────────────────────────────
if __name__ == "__main__":
    uvicorn.run(app, host=args.host, port=args.port)