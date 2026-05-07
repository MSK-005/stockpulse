"""
engine/clustering.py
─────────────────────
All clustering logic:
  - Correlation + factor affinity matrix
  - Sector penalty (FIX-1)
  - Eigen-gap k selection (FIX-4)
  - Spectral clustering + fallback
  - Split oversized clusters
  - Merge tiny clusters
  - Multi-objective scoring
"""

import numpy as np
import pandas as pd
from scipy.linalg import eigh
from sklearn.cluster import SpectralClustering, AgglomerativeClustering
from sklearn.metrics import silhouette_score
from sklearn.metrics.pairwise import rbf_kernel
from sklearn.preprocessing import StandardScaler


ANCHOR_STOCKS    = ['AAPL', 'MSFT', 'AMZN', 'GOOGL', 'JPM', 'JNJ']
MIN_CLUSTER_SIZE = 5
SECTOR_PENALTY   = 0.25


# ── Affinity ──────────────────────────────────────────────────────────────────

def build_affinity(
    log_ret: pd.DataFrame,
    feature_df: pd.DataFrame,
    sector_map: dict,
    corr_weight: float = 0.6,
    feat_weight: float = 0.4,
) -> tuple[np.ndarray, np.ndarray, StandardScaler]:
    """
    Combined affinity:
      60% return-correlation  (co-movement structure)
      40% RBF on factor betas (economic feature distance)
    Then sector penalty and anchor boost applied.

    Returns
    -------
    affinity  : (n × n) affinity matrix in [0, 1]
    X_scaled  : scaled feature matrix
    scaler    : fitted StandardScaler
    """
    tickers = feature_df.index.tolist()

    # 1. Correlation affinity  → shift [-1,1] to [0,1]
    corr_mat = log_ret[tickers].corr().fillna(0).values
    corr_aff = (corr_mat + 1) / 2

    # 2. Feature affinity (RBF)
    scaler   = StandardScaler()
    X_scaled = scaler.fit_transform(feature_df)
    feat_aff = rbf_kernel(X_scaled, gamma=1.0 / X_scaled.shape[1])

    # 3. Blend
    affinity = corr_weight * corr_aff + feat_weight * feat_aff
    np.fill_diagonal(affinity, 0)

    # 4. Sector penalty  (cross-sector pairs get affinity reduced)
    sectors_arr = np.array([sector_map.get(t, 'Unknown') for t in tickers])
    for i in range(len(tickers)):
        for j in range(i + 1, len(tickers)):
            if sectors_arr[i] != sectors_arr[j]:
                affinity[i, j] -= SECTOR_PENALTY
                affinity[j, i] -= SECTOR_PENALTY

    # 5. Anchor boost
    anchor_mask  = np.isin(np.array(tickers), ANCHOR_STOCKS)
    anchor_boost = np.outer(anchor_mask, anchor_mask).astype(float) * 0.2
    affinity     = np.clip(affinity + anchor_boost, 0, 1)
    np.fill_diagonal(affinity, 0)

    return affinity, X_scaled, scaler


# ── k selection ───────────────────────────────────────────────────────────────

def eigen_gap_k(affinity: np.ndarray, k_min: int = 4, k_max: int = 12) -> int:
    """
    Eigen-gap heuristic on the normalised Laplacian.
    The true cluster count = position of the largest eigenvalue gap.
    """
    n       = affinity.shape[0]
    d       = affinity.sum(axis=1)
    d_inv   = np.diag(1.0 / np.sqrt(np.maximum(d, 1e-10)))
    D       = np.diag(d)
    L_norm  = d_inv @ (D - affinity) @ d_inv

    k_ub    = min(k_max + 1, n - 1)
    eigvals, _ = eigh(L_norm, subset_by_index=[0, k_ub])
    eigvals = np.real(eigvals)

    gaps         = np.diff(eigvals)
    gaps_window  = gaps[k_min - 1: k_max]
    best_k       = k_min + int(np.argmax(gaps_window))

    print(f"\n🔬 Eigen-gap k selection:")
    for i, (ev, g) in enumerate(zip(eigvals[1: k_max + 1], gaps[:k_max])):
        marker = " ← best k" if (i + 1) == best_k else ""
        print(f"   k={i+1:2d}  λ={ev:.4f}  gap={g:.4f}{marker}")

    return best_k


# ── MO scoring ────────────────────────────────────────────────────────────────

def multi_objective_score(
    X_scaled: np.ndarray,
    labels: np.ndarray,
    stocks,
    sector_map: dict,
    w_sil: float = 0.35,
    w_purity: float = 0.35,
    w_balance: float = 0.30,
) -> tuple[float, float, float, float]:
    sil = silhouette_score(X_scaled, labels)

    stock_list = stocks.tolist() if hasattr(stocks, 'tolist') else list(stocks)
    cdf = pd.DataFrame({'Stock': stock_list, 'Cluster': labels})
    cdf['Sector'] = cdf['Stock'].map(sector_map).fillna('Unknown')

    purities = []
    for cid in np.unique(labels):
        g = cdf[cdf['Cluster'] == cid]
        purities.append(g['Sector'].value_counts().iloc[0] / len(g) if len(g) > 0 else 0.0)
    purity = float(np.mean(purities))

    sizes   = pd.Series(labels).value_counts()
    cv      = sizes.std() / sizes.mean() if sizes.mean() > 0 else 1.0
    balance = float(max(0.0, min(1.0, 1.0 - cv)))
    score   = w_sil * sil + w_purity * purity + w_balance * balance

    return score, float(sil), purity, balance


# ── Core spectral ─────────────────────────────────────────────────────────────

def spectral_cluster(
    feature_df: pd.DataFrame,
    log_ret: pd.DataFrame,
    sector_map: dict,
    k_min: int = 4,
    k_max: int = 12,
) -> tuple[np.ndarray, int, float, np.ndarray, StandardScaler, np.ndarray]:
    """
    Full pipeline: build affinity → eigen-gap k → spectral clustering.

    Returns
    -------
    labels, best_k, mo_score, X_scaled, scaler, affinity
    """
    affinity, X_scaled, scaler = build_affinity(log_ret, feature_df, sector_map)
    best_k = eigen_gap_k(affinity, k_min=k_min, k_max=k_max)

    print(f"\n⚙️  Spectral clustering: k={best_k}")
    try:
        model  = SpectralClustering(
            n_clusters=best_k, affinity='precomputed',
            assign_labels='kmeans', random_state=42, n_init=20
        )
        labels = model.fit_predict(affinity)
    except Exception as e:
        print(f"  ⚠️  Spectral failed ({e}) — fallback to Agglomerative")
        fallback = AgglomerativeClustering(n_clusters=best_k, linkage='ward')
        labels   = fallback.fit_predict(X_scaled)

    score, sil, purity, balance = multi_objective_score(
        X_scaled, labels, feature_df.index, sector_map
    )
    print(f"  MO={score:.4f} | Sil={sil:.4f} | Purity={purity:.2%} | Balance={balance:.4f}")

    return labels, best_k, score, X_scaled, scaler, affinity


# ── Split large clusters ───────────────────────────────────────────────────────

def split_large_clusters(
    cluster_df: pd.DataFrame,
    feature_df: pd.DataFrame,
    X_scaled: np.ndarray,
    max_size_ratio: float = 0.15,
    min_subcluster: int = 3,
) -> pd.DataFrame:
    n            = len(cluster_df)
    threshold    = int(n * max_size_ratio)
    cluster_df   = cluster_df.copy().reset_index(drop=True)
    new_labels   = np.full(n, np.nan)
    stock_to_pos = {s: i for i, s in enumerate(cluster_df['Stock'])}
    max_label    = int(cluster_df['Cluster'].dropna().max())

    print(f"\n🔀 Split threshold: {threshold} stocks ({max_size_ratio:.0%} of {n})")

    for cid in sorted(cluster_df['Cluster'].dropna().unique()):
        members = [s for s in cluster_df[cluster_df['Cluster'] == cid]['Stock']
                   if s in feature_df.index]

        if len(members) <= threshold:
            for s in members:
                new_labels[stock_to_pos[s]] = cid
            continue

        idxs  = [feature_df.index.get_loc(s) for s in members]
        X_sub = X_scaled[idxs]
        best_sub_k, best_sub_score = 2, -1

        for sub_k in range(2, min(8, len(members) // min_subcluster + 1)):
            m = AgglomerativeClustering(n_clusters=sub_k, linkage='ward')
            l = m.fit_predict(X_sub)
            if len(np.unique(l)) < 2:
                continue
            s_score = silhouette_score(X_sub, l)
            if s_score > best_sub_score:
                best_sub_k, best_sub_score = sub_k, s_score

        sub_labels = AgglomerativeClustering(
            n_clusters=best_sub_k, linkage='ward'
        ).fit_predict(X_sub)

        print(f"  Cluster {int(cid):2d}: {len(members):3d} stocks → "
              f"{best_sub_k} sub-clusters (sil={best_sub_score:.4f})")

        for i, stock in enumerate(members):
            new_labels[stock_to_pos[stock]] = max_label + 1 + sub_labels[i]
        max_label += best_sub_k

    if np.isnan(new_labels).any():
        missing = cluster_df.iloc[np.where(np.isnan(new_labels))[0]]['Stock'].tolist()
        raise ValueError(f"❌ Unassigned stocks: {missing[:10]}")

    cluster_df['Cluster'] = new_labels.astype(int)
    mapping = {old: new for new, old in enumerate(sorted(cluster_df['Cluster'].unique()))}
    cluster_df['Cluster'] = cluster_df['Cluster'].map(mapping)
    return cluster_df


# ── Merge small clusters ───────────────────────────────────────────────────────

def merge_small_clusters(
    cluster_df: pd.DataFrame,
    feature_df: pd.DataFrame,
    X_scaled: np.ndarray,
    min_size: int = MIN_CLUSTER_SIZE,
) -> pd.DataFrame:
    cluster_df   = cluster_df.copy().reset_index(drop=True)
    stock_to_pos = {s: i for i, s in enumerate(feature_df.index)}
    changed, passes = True, 0

    while changed and passes < 10:
        changed = False
        passes += 1
        counts  = cluster_df['Cluster'].value_counts()
        small   = counts[counts < min_size].index.tolist()
        if not small:
            break

        centroids = {}
        for cid in cluster_df['Cluster'].unique():
            members = [s for s in cluster_df[cluster_df['Cluster'] == cid]['Stock']
                       if s in stock_to_pos]
            if members:
                centroids[cid] = X_scaled[[stock_to_pos[s] for s in members]].mean(axis=0)

        for cid in small:
            if cid not in centroids:
                continue
            best_dist, best_target = np.inf, -1
            for tid, centroid in centroids.items():
                if tid == cid or (counts.get(tid, 0) < min_size and tid in small):
                    continue
                d = np.linalg.norm(centroids[cid] - centroid)
                if d < best_dist:
                    best_dist, best_target = d, tid

            if best_target != -1:
                cluster_df.loc[cluster_df['Cluster'] == cid, 'Cluster'] = best_target
                print(f"  Merged {int(cid)} ({int(counts.get(cid,0))} stocks) "
                      f"→ {int(best_target)} (dist={best_dist:.3f})")
                changed = True

    mapping = {old: new for new, old in enumerate(sorted(cluster_df['Cluster'].unique()))}
    cluster_df['Cluster'] = cluster_df['Cluster'].map(mapping)
    counts_final = cluster_df['Cluster'].value_counts()
    print(f"\n  Clusters after merge: {cluster_df['Cluster'].nunique()} "
          f"| min={counts_final.min()} | max={counts_final.max()}")
    return cluster_df
