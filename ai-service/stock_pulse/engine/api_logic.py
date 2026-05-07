"""
engine/api_logic.py
────────────────────
Pure query functions — no side effects, no state.
The FastAPI server imports and calls these directly.

All functions take engine state as arguments so they're
trivially testable without running the full pipeline.
"""

import numpy as np
import pandas as pd
from sklearn.preprocessing import StandardScaler


def get_similar_stocks(
    stock: str,
    feature_df: pd.DataFrame,
    cluster_df: pd.DataFrame,
    top_n: int = 5,
) -> dict:
    """Return top_n stocks most similar to `stock` in factor feature space."""
    if stock not in feature_df.index:
        return {"error": f"{stock} not in model"}

    scaler = StandardScaler()
    X      = pd.DataFrame(
        scaler.fit_transform(feature_df),
        index=feature_df.index,
        columns=feature_df.columns,
    )
    target = X.loc[stock]
    dists  = X.drop(stock).apply(
        lambda row: float(np.linalg.norm(row - target)), axis=1
    ).nsmallest(top_n)

    return {
        "stock":   stock,
        "similar": list(dists.index),
        "scores":  [round(1 / (1 + d), 4) for d in dists.values],
    }


def get_behavior_group(
    stock: str,
    cluster_df: pd.DataFrame,
    regime: str,
) -> dict:
    """Return cluster metadata and all peers for a given stock."""
    row = cluster_df[cluster_df['Stock'] == stock]
    if row.empty:
        return {"error": f"{stock} not found"}

    cid   = int(row['Cluster'].values[0])
    group = cluster_df[cluster_df['Cluster'] == cid]

    return {
        "stock":        stock,
        "cluster_id":   cid,
        "cluster_name": (row['Cluster_Name'].values[0]
                         if 'Cluster_Name' in cluster_df.columns else "N/A"),
        "regime":       regime,
        "peers":        group['Stock'].tolist(),
        "peer_count":   len(group),
    }


def get_all_clusters(cluster_df: pd.DataFrame) -> dict:
    """Return summary of every cluster: name, stocks, count."""
    result = {}
    for cid in sorted(cluster_df['Cluster'].unique()):
        g = cluster_df[cluster_df['Cluster'] == cid]
        result[int(cid)] = {
            "name":   (g['Cluster_Name'].values[0]
                       if 'Cluster_Name' in g.columns else f"Cluster {cid}"),
            "stocks": g['Stock'].tolist(),
            "count":  len(g),
        }
    return result


def get_cluster_detail(
    cluster_id: int,
    cluster_df: pd.DataFrame,
    feature_df: pd.DataFrame,
) -> dict:
    """Deep-dive on one cluster: members + their key factor metrics."""
    g = cluster_df[cluster_df['Cluster'] == cluster_id]
    if g.empty:
        return {"error": f"Cluster {cluster_id} not found"}

    members   = g['Stock'].tolist()
    feat_cols = ['alpha', 'beta_market', 'beta_momentum',
                 'beta_value', 'idio_vol', 'max_drawdown']
    available = [c for c in feat_cols if c in feature_df.columns]
    feat_sub  = feature_df.loc[
        [m for m in members if m in feature_df.index], available
    ]

    return {
        "cluster_id":   cluster_id,
        "cluster_name": (g['Cluster_Name'].values[0]
                         if 'Cluster_Name' in g.columns else f"Cluster {cluster_id}"),
        "count":        len(members),
        "members":      members,
        "factor_means": feat_sub.mean().round(5).to_dict(),
        "factor_std":   feat_sub.std().round(5).to_dict(),
    }


def get_anomalies(anomaly_df: pd.DataFrame) -> dict:
    """Return list of anomalous stocks with scores."""
    if anomaly_df.empty:
        return {"anomalies": [], "count": 0}
    return {
        "anomalies": anomaly_df[['Stock', 'Sector', 'Cluster', 'IF_Score']]
                                .round(4)
                                .to_dict(orient='records'),
        "count": len(anomaly_df),
    }


def get_scorecard(engine_state: dict) -> dict:
    """Return the latest model quality scorecard as a flat dict."""
    return {k: v for k, v in engine_state.items()
            if isinstance(v, (int, float, str))}
