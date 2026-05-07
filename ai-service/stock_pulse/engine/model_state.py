"""
engine/model_state.py
──────────────────────
StockPulseEngine — the single class your teammates import.

Three operating modes:
  1. run_pipeline()         → initial full build
  2. refresh_model()        → batch refresh (re-run full pipeline on new data)
  3. update_new_prices()    → streaming mode (append rows, skip re-clustering
                               unless cluster_every_n prices exceeded)

Layered update design (don't recompute everything every time):
  ┌────────────┬──────────────────────┐
  │ Layer      │ Update frequency     │
  ├────────────┼──────────────────────┤
  │ Prices     │ seconds / minutes    │
  │ Features   │ every few hours      │
  │ Clusters   │ daily or every N pts │
  └────────────┴──────────────────────┘
"""

import threading
from datetime import datetime

import numpy as np
import pandas as pd
from sklearn.preprocessing import StandardScaler

from engine.data_loader   import load_csv, append_prices
from engine.features      import build_stable_features, STABILITY_WINDOW
from engine.clustering    import (spectral_cluster, split_large_clusters,
                                   merge_small_clusters, multi_objective_score,
                                   MIN_CLUSTER_SIZE)
from engine.analytics     import (detect_regime, name_clusters, detect_anomalies,
                                   track_drift, financial_quality)
from engine.api_logic     import (get_similar_stocks, get_behavior_group,
                                   get_all_clusters, get_cluster_detail,
                                   get_anomalies, get_scorecard)


class StockPulseEngine:
    """
    Central engine class.  Instantiate once, call run_pipeline(), then
    expose self via FastAPI routes.

    Parameters
    ----------
    data_path           : path to CSV file
    stability_window    : lookback days for feature window (default 180)
    cluster_every_n     : streaming mode — re-cluster after this many new rows
    snapshot_dir        : where to write drift snapshots (default '.')
    """

    def __init__(
        self,
        data_path: str,
        stability_window: int = STABILITY_WINDOW,
        cluster_every_n: int = 100,
        snapshot_dir: str = ".",
    ):
        self.data_path        = data_path
        self.stability_window = stability_window
        self.cluster_every_n  = cluster_every_n
        self.snapshot_dir     = snapshot_dir

        # ── Core state ────────────────────────────────────────
        self.df               = None
        self.pivot_df         = None
        self.sector_map       = {}
        self.feature_df       = None
        self.log_ret          = None
        self.cluster_df       = None
        self.anomaly_df       = pd.DataFrame()
        self.regime           = "UNKNOWN"

        # Intermediate clustering artefacts
        self.labels           = None
        self.best_k           = None
        self.mo_score         = 0.0
        self.X_scaled         = None
        self.scaler           = None
        self.affinity         = None

        # Quality metrics
        self.sil_score        = 0.0
        self.purity           = 0.0
        self.balance          = 0.0
        self.stability        = 0.0
        self.intra_corr       = 0.0
        self.fwd_dispersion   = 0.0

        # Streaming bookkeeping
        self._new_row_count   = 0
        self._lock            = threading.Lock()   # thread-safe for FastAPI workers

    # ══════════════════════════════════════════════════════════
    # STEP 1 — Load data
    # ══════════════════════════════════════════════════════════

    def load_data(self) -> None:
        print(f"\n📂 Loading data from: {self.data_path}")
        self.df, self.pivot_df, self.sector_map = load_csv(self.data_path)
        print(f"   {self.pivot_df.shape[0]} days × {self.pivot_df.shape[1]} stocks")
        print(f"   {self.pivot_df.index.min().date()} → {self.pivot_df.index.max().date()}")

    # ══════════════════════════════════════════════════════════
    # STEP 2 — Detect regime
    # ══════════════════════════════════════════════════════════

    def detect_regime(self) -> None:
        self.regime = detect_regime(self.pivot_df)

    # ══════════════════════════════════════════════════════════
    # STEP 3 — Build features  (factor model)
    # ══════════════════════════════════════════════════════════

    def build_features(self) -> None:
        print(f"\n🔧 Building factor features (window={self.stability_window}d)...")
        self.feature_df, self.log_ret = build_stable_features(
            self.pivot_df, window_days=self.stability_window
        )
        if self.feature_df is None:
            raise RuntimeError("❌ Feature build failed — not enough data.")
        print(f"   Features built for {len(self.feature_df)} stocks")

    # ══════════════════════════════════════════════════════════
    # STEP 4 — Run clustering
    # ══════════════════════════════════════════════════════════

    def run_clustering(self) -> None:
        print("\n🔍 Running spectral clustering...")
        (self.labels, self.best_k, self.mo_score,
         self.X_scaled, self.scaler, self.affinity) = spectral_cluster(
            self.feature_df, self.log_ret, self.sector_map
        )

    # ══════════════════════════════════════════════════════════
    # STEP 5 — Build cluster dataframe
    # ══════════════════════════════════════════════════════════

    def build_clusters(self) -> None:
        self.cluster_df = pd.DataFrame({
            'Stock':   self.feature_df.index,
            'Cluster': self.labels,
        })

        # Split oversized → merge tiny
        self.cluster_df = split_large_clusters(
            self.cluster_df, self.feature_df, self.X_scaled
        )
        print(f"\n🔗 Merging clusters smaller than {MIN_CLUSTER_SIZE} stocks:")
        self.cluster_df = merge_small_clusters(
            self.cluster_df, self.feature_df, self.X_scaled
        )

        # Re-score after restructuring
        scaler2      = StandardScaler()
        X2           = scaler2.fit_transform(
            self.feature_df.loc[self.cluster_df['Stock']]
        )
        _, self.sil_score, self.purity, self.balance = multi_objective_score(
            X2, self.cluster_df['Cluster'].values,
            self.cluster_df['Stock'], self.sector_map
        )

        # Name clusters
        self.cluster_df = name_clusters(
            self.cluster_df, self.feature_df, self.sector_map
        )

        # Financial quality metrics
        self.intra_corr, self.fwd_dispersion = financial_quality(
            self.cluster_df, self.log_ret
        )

    # ══════════════════════════════════════════════════════════
    # STEP 6 — Anomaly detection + drift tracking
    # ══════════════════════════════════════════════════════════

    def run_analytics(self) -> None:
        self.anomaly_df = detect_anomalies(
            self.feature_df, self.cluster_df, self.sector_map
        )
        version_id = datetime.now().strftime("%Y%m%d_%H%M%S")
        track_drift(self.cluster_df, version_id, self.snapshot_dir)

    # ══════════════════════════════════════════════════════════
    # FULL PIPELINE
    # ══════════════════════════════════════════════════════════

    def run_pipeline(self) -> pd.DataFrame:
        """
        Run the complete pipeline from scratch.
        Call this once at startup. Returns cluster_df.
        """
        print("\n" + "=" * 60)
        print("STOCK PULSE — Quant Engine v5.0  |  run_pipeline()")
        print("=" * 60)

        self.load_data()
        self.detect_regime()
        self.build_features()
        self.run_clustering()
        self.build_clusters()
        self.run_analytics()
        self._print_scorecard()

        return self.cluster_df

    # ══════════════════════════════════════════════════════════
    # BATCH REFRESH  (Mode A)
    # ══════════════════════════════════════════════════════════

    def refresh_model(self, new_data_path: str | None = None) -> dict:
        """
        Batch refresh: reload data (optionally from new path) and
        re-run the full pipeline. Thread-safe.

        Called by:  scheduler (APScheduler / cron)
                    POST /refresh endpoint
        """
        with self._lock:
            print("\n🔄 Batch refresh triggered...")
            if new_data_path:
                self.data_path = new_data_path

            self.run_pipeline()
            return self.get_scorecard()

    # ══════════════════════════════════════════════════════════
    # STREAMING UPDATE  (Mode B)
    # ══════════════════════════════════════════════════════════

    def update_new_prices(self, new_rows: pd.DataFrame) -> dict:
        """
        Streaming mode: append new price rows and decide what to recompute.

        Layered update strategy:
          Always  → append rows, rebuild pivot
          Often   → rebuild features (every call, cheap-ish)
          Rarely  → re-cluster (every cluster_every_n new rows, expensive)

        Parameters
        ----------
        new_rows : DataFrame with columns [Date, Ticker, Adj_Close, Sector]

        Returns
        -------
        dict with what was updated and current cluster count.
        """
        with self._lock:
            updated = {"prices": True, "features": False, "clusters": False}

            # Layer 1: always update prices + pivot
            self.df, self.pivot_df, self.sector_map = append_prices(
                self.df, self.pivot_df, new_rows, self.sector_map
            )
            self._new_row_count += len(new_rows)

            # Layer 2: rebuild features (factor model is fast, ~1-2s)
            feat_df, log_ret = build_stable_features(
                self.pivot_df, window_days=self.stability_window
            )
            if feat_df is not None:
                self.feature_df = feat_df
                self.log_ret    = log_ret
                updated["features"] = True

            # Layer 3: re-cluster only every N new rows (expensive)
            if self._new_row_count >= self.cluster_every_n:
                print(f"\n⚡ Streaming: re-clustering after "
                      f"{self._new_row_count} new rows...")
                self.run_clustering()
                self.build_clusters()
                self.run_analytics()
                self._new_row_count = 0
                updated["clusters"] = True

            return {
                "updated":      updated,
                "n_clusters":   (self.cluster_df['Cluster'].nunique()
                                  if self.cluster_df is not None else 0),
                "regime":       self.regime,
                "rows_buffered": self._new_row_count,
            }

    # ══════════════════════════════════════════════════════════
    # API QUERY METHODS  (called by FastAPI routes)
    # ══════════════════════════════════════════════════════════

    def api_get_similar(self, stock: str, top_n: int = 5) -> dict:
        self._require_pipeline()
        return get_similar_stocks(stock, self.feature_df, self.cluster_df, top_n)

    def api_get_group(self, stock: str) -> dict:
        self._require_pipeline()
        return get_behavior_group(stock, self.cluster_df, self.regime)

    def api_get_all_clusters(self) -> dict:
        self._require_pipeline()
        return get_all_clusters(self.cluster_df)

    def api_get_cluster_detail(self, cluster_id: int) -> dict:
        self._require_pipeline()
        return get_cluster_detail(cluster_id, self.cluster_df, self.feature_df)

    def api_get_anomalies(self) -> dict:
        self._require_pipeline()
        return get_anomalies(self.anomaly_df)

    def get_scorecard(self) -> dict:
        return {
            "regime":           self.regime,
            "n_clusters":       int(self.cluster_df['Cluster'].nunique())
                                    if self.cluster_df is not None else 0,
            "n_stocks":         len(self.cluster_df) if self.cluster_df is not None else 0,
            "silhouette":       round(self.sil_score, 4),
            "purity":           round(self.purity, 4),
            "balance":          round(self.balance, 4),
            "mo_score":         round(self.mo_score, 4),
            "intra_corr":       round(self.intra_corr, 4),
            "fwd_dispersion":   round(self.fwd_dispersion, 6),
            "anomaly_count":    len(self.anomaly_df),
            "best_k":           self.best_k,
        }

    # ── Internal helpers ──────────────────────────────────────

    def _require_pipeline(self) -> None:
        if self.cluster_df is None:
            raise RuntimeError("run_pipeline() has not been called yet.")

    def _print_scorecard(self) -> None:
        sc = self.get_scorecard()
        n_clusters = sc["n_clusters"]
        largest    = (self.cluster_df['Cluster'].value_counts().iloc[0]
                       if self.cluster_df is not None else 0)
        smallest   = (self.cluster_df['Cluster'].value_counts().iloc[-1]
                       if self.cluster_df is not None else 0)

        print("\n" + "=" * 60)
        print("📈 MODEL SCORECARD")
        print("=" * 60)
        print(f"  Regime:         {sc['regime']}")
        print(f"  Clusters:       {n_clusters}  "
              f"(largest={largest}, smallest={smallest})")
        print(f"  Silhouette:     {sc['silhouette']:.4f}  "
              f"{'✅' if sc['silhouette'] > 0.15 else '⚠️'}")
        print(f"  Sector Purity:  {sc['purity']:.2%}  "
              f"{'✅' if sc['purity'] > 0.55 else '⚠️'}")
        print(f"  Balance (CV):   {sc['balance']:.4f}  "
              f"{'✅' if sc['balance'] > 0.4 else '⚠️'}")
        print(f"  MO Score:       {sc['mo_score']:.4f}")
        print(f"  Intra-Corr ρ:   {sc['intra_corr']:.3f}  "
              f"{'✅' if sc['intra_corr'] > 0.3 else '⚠️'}")
        print(f"  Fwd Dispersion: {sc['fwd_dispersion']:.4f}")
        print(f"  Anomalies:      {sc['anomaly_count']} flagged")
