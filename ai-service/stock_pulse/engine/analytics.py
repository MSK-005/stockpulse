"""
engine/analytics.py
────────────────────
Post-clustering analytics:
  - Cluster naming (factor-aware, hedge-fund style)
  - Isolation Forest anomaly detection
  - Cluster drift tracking (Jaccard similarity)
  - Financial cluster quality (intra-corr, forward dispersion)
  - Regime detection
"""

import json
import numpy as np
import pandas as pd
from datetime import datetime
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler


SECTOR_SHORT = {
    'Technology':              'Tech',
    'Health Care':             'Healthcare',
    'Financials':              'Financial',
    'Consumer Discretionary':  'Consumer',
    'Consumer Staples':        'Staples',
    'Energy':                  'Energy',
    'Industrials':             'Industrial',
    'Communication Services':  'Telecom',
    'Materials':               'Materials',
}


# ── Regime ────────────────────────────────────────────────────────────────────

def detect_regime(pivot_df: pd.DataFrame, lookback: int = 60) -> str:
    log_ret   = np.log(pivot_df / pivot_df.shift(1)).dropna()
    market    = log_ret.mean(axis=1)
    recent    = market.tail(lookback)
    total_ret = recent.sum()
    ann_vol   = recent.std() * np.sqrt(252)
    trend     = np.polyfit(range(len(recent)), recent.cumsum(), 1)[0]

    if   total_ret > 0.05 and trend > 0:  regime = 'BULL'
    elif total_ret < -0.05 and trend < 0: regime = 'BEAR'
    else:                                  regime = 'SIDEWAYS'

    print(f"\n📈 Regime: {regime} | 60d ret: {total_ret:.2%} | vol: {ann_vol:.2%}")
    return regime


# ── Cluster naming ────────────────────────────────────────────────────────────

def name_clusters(
    cluster_df: pd.DataFrame,
    feature_df: pd.DataFrame,
    sector_map: dict,
) -> pd.DataFrame:
    """Assign human-readable names based on dominant sector + factor exposures."""
    cluster_df = cluster_df.copy()
    cluster_df['Sector'] = cluster_df['Stock'].map(sector_map)
    names = {}

    for cid in sorted(cluster_df['Cluster'].unique()):
        members = [s for s in cluster_df[cluster_df['Cluster'] == cid]['Stock']
                   if s in feature_df.index]
        if not members:
            names[cid] = f"Cluster {cid}"
            continue

        f       = feature_df.loc[members]
        sectors = cluster_df[cluster_df['Cluster'] == cid]['Sector'].dropna()
        dom_sec = sectors.value_counts().index[0] if len(sectors) > 0 else "Mixed"
        short   = SECTOR_SHORT.get(dom_sec, str(dom_sec)[:8])

        beta_mkt  = f['beta_market'].mean()
        beta_mom  = f['beta_momentum'].mean()
        beta_val  = f['beta_value'].mean()
        beta_size = f['beta_size'].mean()
        alpha     = f['alpha'].mean()
        idio_vol  = f['idio_vol'].mean()
        es        = f['expected_shortfall'].mean()
        dd        = f['max_drawdown'].mean()

        if   beta_mkt < 0.5:   behavior = "Defensive"
        elif es < -0.03:       behavior = "Tail Risk"
        elif alpha > 0.001:    behavior = "High Alpha"
        elif beta_mom > 0.3:   behavior = "Momentum"
        elif beta_val > 0.3:   behavior = "Value"
        elif beta_size < -0.2: behavior = "Large Cap"
        elif beta_size > 0.3:  behavior = "Small Cap"
        elif beta_mkt > 1.4:   behavior = "Cyclical Risk"
        elif dd < -0.20:       behavior = "Under Pressure"
        elif idio_vol > 0.02:  behavior = "High Idio Risk"
        else:                   behavior = "Core"

        names[cid] = f"{short} {behavior}"

    cluster_df['Cluster_Name'] = cluster_df['Cluster'].map(names)
    return cluster_df


# ── Anomaly detection ─────────────────────────────────────────────────────────

def detect_anomalies(
    feature_df: pd.DataFrame,
    cluster_df: pd.DataFrame,
    sector_map: dict,
    contamination: float = 0.05,
) -> pd.DataFrame:
    scaler = StandardScaler()
    X      = scaler.fit_transform(feature_df)
    iso    = IsolationForest(contamination=contamination,
                              random_state=42, n_estimators=200)
    preds  = iso.fit_predict(X)
    scores = iso.score_samples(X)

    anomaly_df = pd.DataFrame({
        'Stock':    feature_df.index,
        'IF_Score': scores,
        'Anomaly':  preds == -1,
    })
    anomaly_df['Sector']  = anomaly_df['Stock'].map(sector_map)
    anomaly_df['Cluster'] = anomaly_df['Stock'].map(
        cluster_df.set_index('Stock')['Cluster']
    )
    anomalies = anomaly_df[anomaly_df['Anomaly']].sort_values('IF_Score')

    print(f"\n🚨 Anomalies: {len(anomalies)} stocks flagged "
          f"(contamination={contamination:.0%})")
    if len(anomalies) > 0:
        print(anomalies[['Stock', 'Sector', 'Cluster', 'IF_Score']].to_string(index=False))
    return anomalies


# ── Drift tracking ────────────────────────────────────────────────────────────

def track_drift(
    cluster_df: pd.DataFrame,
    version_id: str,
    snapshot_dir: str = ".",
) -> dict:
    """
    Save cluster snapshot and compare with previous via Jaccard similarity.
    JSON keys are always stored/loaded as int to avoid the string-key bug.
    """
    snapshot = {
        'version_id': version_id,
        'timestamp':  str(datetime.now()),
        'clusters':   {
            int(cid): cluster_df[cluster_df['Cluster'] == cid]['Stock'].tolist()
            for cid in sorted(cluster_df['Cluster'].unique())
        },
    }

    snap_path   = f"{snapshot_dir}/snapshot_{version_id}.json"
    latest_path = f"{snapshot_dir}/latest_snapshot.json"

    with open(snap_path, 'w') as f:
        json.dump(snapshot, f)

    try:
        with open(latest_path) as f:
            prev = json.load(f)
        prev['clusters'] = {int(k): v for k, v in prev['clusters'].items()}

        print(f"\n📉 Drift vs {prev['version_id'][:8]}...")
        drift_scores = []
        for cid, curr_stocks in snapshot['clusters'].items():
            curr_set = set(curr_stocks)
            best_j, best_cid = 0.0, -1
            for prev_cid, prev_stocks in prev['clusters'].items():
                j = len(curr_set & set(prev_stocks)) / len(curr_set | set(prev_stocks))
                if j > best_j:
                    best_j, best_cid = j, int(prev_cid)
            drift_scores.append(best_j)
            status = "✅ Stable" if best_j > 0.7 else ("⚠️ Shifting" if best_j > 0.4 else "🔴 Drifted")
            print(f"  Cluster {int(cid):2d} → prev [{int(best_cid):2d}] "
                  f"Jaccard={best_j:.3f}  {status}")

        avg = float(np.mean(drift_scores))
        print(f"  Average Jaccard: {avg:.3f} ({'✅' if avg > 0.6 else '⚠️'})")
    except FileNotFoundError:
        print("\n📉 Drift: no previous snapshot — this is the baseline.")

    with open(latest_path, 'w') as f:
        json.dump(snapshot, f)

    return snapshot


# ── Financial quality metrics ─────────────────────────────────────────────────

def financial_quality(
    cluster_df: pd.DataFrame,
    log_ret: pd.DataFrame,
    forward_days: int = 20,
) -> tuple[float, float]:
    """
    Returns
    -------
    intra_corr     : avg pairwise return corr within clusters  (want > 0.3)
    fwd_dispersion : std of cluster-level forward returns      (want > 0.001)
    """
    tickers   = [t for t in cluster_df['Stock'] if t in log_ret.columns]
    ret_sub   = log_ret[tickers]
    intra_corrs, fwd_rets = [], []

    for cid in sorted(cluster_df['Cluster'].unique()):
        members = [s for s in cluster_df[cluster_df['Cluster'] == cid]['Stock']
                   if s in ret_sub.columns]
        if len(members) < 2:
            continue

        corr_block = ret_sub[members].corr()
        mask       = np.triu(np.ones(corr_block.shape), k=1).astype(bool)
        intra_corrs.append(float(corr_block.values[mask].mean()))
        fwd_rets.append(float(ret_sub[members].tail(forward_days).mean().mean()))

    intra_corr     = float(np.mean(intra_corrs)) if intra_corrs else 0.0
    fwd_dispersion = float(np.std(fwd_rets))     if len(fwd_rets) > 1 else 0.0
    return intra_corr, fwd_dispersion
