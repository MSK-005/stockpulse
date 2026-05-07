"""
main.py
────────
Run the full engine standalone — no server required.
Use this to test your ML pipeline before your teammate
connects the FastAPI server.

Usage:
    python main.py --data path/to/data.csv
"""

import argparse
from engine import StockPulseEngine


def main():
    parser = argparse.ArgumentParser(description="Stock Pulse Engine v5.0")
    parser.add_argument("--data",  required=True, help="Path to CSV file")
    parser.add_argument("--window", type=int, default=180,
                        help="Feature window in days (default: 180)")
    args = parser.parse_args()

    engine = StockPulseEngine(
        data_path=args.data,
        stability_window=args.window,
    )

    # ── Full pipeline ──────────────────────────────────────────
    cluster_df = engine.run_pipeline()

    # ── Sample API calls ───────────────────────────────────────
    print("\n" + "=" * 60)
    print("🔍 SAMPLE API CALLS")
    print("=" * 60)

    test_stock = cluster_df['Stock'].iloc[0]

    print(f"\n→ get_similar('{test_stock}'):")
    print(engine.api_get_similar(test_stock))

    print(f"\n→ get_group('{test_stock}'):")
    print(engine.api_get_group(test_stock))

    print("\n→ get_all_clusters():")
    for cid, info in engine.api_get_all_clusters().items():
        print(f"  [{cid:2d}] {info['name']:<30s} "
              f"{info['count']:3d} stocks | "
              f"{', '.join(info['stocks'][:3])}...")

    print("\n→ get_anomalies():")
    print(engine.api_get_anomalies())

    print("\n→ get_scorecard():")
    for k, v in engine.get_scorecard().items():
        print(f"  {k:<20s}: {v}")

    # ── Streaming demo ─────────────────────────────────────────
    print("\n" + "=" * 60)
    print("⚡ STREAMING UPDATE DEMO  (simulated)")
    print("=" * 60)

    import pandas as pd
    import numpy as np

    # Simulate 10 new price rows for existing stocks
    sample_tickers = cluster_df['Stock'].tolist()[:3]
    new_rows = pd.DataFrame({
        'Date':      [pd.Timestamp.now()] * len(sample_tickers),
        'Ticker':    sample_tickers,
        'Adj_Close': [100.0 + np.random.randn() for _ in sample_tickers],
        'Sector':    [engine.sector_map.get(t, 'Unknown') for t in sample_tickers],
    })

    result = engine.update_new_prices(new_rows)
    print(f"\n  Streaming result: {result}")


if __name__ == "__main__":
    main()
