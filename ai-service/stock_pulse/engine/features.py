"""
engine/features.py
──────────────────
Factor-model feature engineering (v5.0).

Key idea: decompose each stock's return into orthogonal economic factors
(market, size, momentum, value). Clustering on factor betas = clustering
on economic behaviour, not noisy raw returns.
"""

import numpy as np
import pandas as pd


STABILITY_WINDOW = 180   # days


def compute_neutral_returns(log_ret: pd.DataFrame) -> pd.DataFrame:
    """Cross-sectionally z-score daily log returns (market-neutral)."""
    daily_mean = log_ret.mean(axis=1)
    daily_std  = log_ret.std(axis=1).replace(0, np.nan)
    return log_ret.subtract(daily_mean, axis=0).divide(daily_std, axis=0).fillna(0)


def _build_factors(log_ret: pd.DataFrame) -> pd.DataFrame:
    """
    Construct four Fama-French-style factors from cross-sectional returns.

    market   : equal-weight average return
    size     : small (high-vol) minus large (low-vol)
    momentum : top-tercile cumret minus bottom-tercile
    value    : low-Sharpe minus high-Sharpe (value proxy)
    """
    # Market
    market_factor = log_ret.mean(axis=1)

    # Size  (high-vol proxy = small-cap)
    vol_rank       = log_ret.std().rank(pct=True)
    small, large   = vol_rank[vol_rank <= 0.33].index, vol_rank[vol_rank >= 0.67].index
    size_factor    = log_ret[small].mean(axis=1) - log_ret[large].mean(axis=1)

    # Momentum  (12m-1m cross-section)
    cumret        = log_ret.sum()
    mom_rank      = cumret.rank(pct=True)
    top_m, bot_m  = mom_rank[mom_rank >= 0.67].index, mom_rank[mom_rank <= 0.33].index
    mom_factor    = log_ret[top_m].mean(axis=1) - log_ret[bot_m].mean(axis=1)

    # Value  (low Sharpe = cheap / value)
    sr_rank       = (log_ret.mean() / log_ret.std()).rank(pct=True)
    lo_sr, hi_sr  = sr_rank[sr_rank <= 0.33].index, sr_rank[sr_rank >= 0.67].index
    val_factor    = log_ret[lo_sr].mean(axis=1) - log_ret[hi_sr].mean(axis=1)

    return pd.DataFrame({
        'market':   market_factor,
        'size':     size_factor,
        'momentum': mom_factor,
        'value':    val_factor,
    })


def build_factor_features(
    pivot_df: pd.DataFrame,
    start_date,
    end_date,
    smooth: int = 5,
) -> tuple[pd.DataFrame | None, pd.DataFrame | None]:
    """
    Build factor-model features for all stocks in [start_date, end_date].

    Parameters
    ----------
    pivot_df   : wide price dataframe (Date × Ticker)
    start_date : window start
    end_date   : window end
    smooth     : rolling mean window for log returns (noise reduction)

    Returns
    -------
    feature_df : DataFrame (Ticker × features)  or None on failure
    log_ret    : smoothed log returns in window   or None on failure
    """
    window = pivot_df[(pivot_df.index >= start_date) & (pivot_df.index <= end_date)]
    if len(window) < 30:
        return None, None

    log_ret = (np.log(window / window.shift(1))
               .rolling(smooth).mean()
               .dropna())
    if len(log_ret) < 15:
        return None, None

    factors      = _build_factors(log_ret)
    factor_vals  = factors.values
    X_ols_base   = np.column_stack([np.ones(len(factors)), factor_vals])

    features = {}
    for ticker in log_ret.columns:
        r = log_ret[ticker].values
        try:
            coefs, _, _, _ = np.linalg.lstsq(X_ols_base, r, rcond=None)
        except Exception:
            continue

        alpha      = coefs[0]
        betas      = coefs[1:]           # [mkt, size, mom, val]
        residuals  = r - X_ols_base @ coefs
        idio_vol   = float(residuals.std())
        r2         = float(1 - residuals.var() / r.var()) if r.var() > 0 else 0.0

        # Risk metrics on raw returns
        neg      = r[r < 0]
        var_95   = float(np.percentile(r, 5))
        es_95    = float(r[r <= var_95].mean()) if (r <= var_95).any() else var_95
        cum      = np.cumprod(1 + r)
        rollmax  = np.maximum.accumulate(cum)
        max_dd   = float(((cum - rollmax) / rollmax).min())
        downside = float(neg.std()) if len(neg) > 2 else idio_vol

        features[ticker] = {
            'alpha':              alpha,
            'beta_market':        float(betas[0]),
            'beta_size':          float(betas[1]),
            'beta_momentum':      float(betas[2]),
            'beta_value':         float(betas[3]),
            'idio_vol':           idio_vol,
            'r_squared':          r2,
            'downside_dev':       downside,
            'var_95':             var_95,
            'expected_shortfall': es_95,
            'max_drawdown':       max_dd,
        }

    if not features:
        return None, None

    return pd.DataFrame(features).T.dropna(), log_ret


def build_stable_features(
    pivot_df: pd.DataFrame,
    window_days: int = STABILITY_WINDOW,
    smooth: int = 5,
) -> tuple[pd.DataFrame | None, pd.DataFrame | None]:
    """
    Convenience wrapper: build features on the most recent `window_days`.
    Called by the engine for both initial run and batch refresh.
    """
    max_date = pivot_df.index.max()
    start    = max_date - pd.Timedelta(days=window_days)
    return build_factor_features(pivot_df, start, max_date, smooth=smooth)
