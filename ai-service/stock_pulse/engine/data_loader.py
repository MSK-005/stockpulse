"""
engine/data_loader.py
─────────────────────
Handles all data I/O:
  - Loading CSV
  - Pivot table construction
  - Sector map extraction
  - Appending new price rows (streaming mode)
"""

import pandas as pd
import numpy as np


REQUIRED_COLUMNS = {'Date', 'Ticker', 'Adj_Close', 'Sector'}


def load_csv(path: str) -> tuple[pd.DataFrame, pd.DataFrame, dict]:
    """
    Load raw CSV → cleaned df, pivot_df, sector_map.

    Returns
    -------
    df         : long-format cleaned dataframe
    pivot_df   : wide-format (Date × Ticker) of Adj_Close, forward-filled
    sector_map : {ticker: sector} dict
    """
    df = pd.read_csv(path)

    missing = REQUIRED_COLUMNS - set(df.columns)
    if missing:
        raise ValueError(f"CSV missing columns: {missing}")

    df['Date'] = pd.to_datetime(df['Date'], utc=True).dt.tz_localize(None)
    df = (df.sort_values(['Ticker', 'Date'])
            [['Date', 'Ticker', 'Adj_Close', 'Sector']]
            .dropna()
            .reset_index(drop=True))

    sector_map = df.groupby('Ticker')['Sector'].first().to_dict()
    pivot_df   = _build_pivot(df)

    return df, pivot_df, sector_map


def _build_pivot(df: pd.DataFrame) -> pd.DataFrame:
    """Long df → wide pivot, forward-filled, all-NaN columns dropped."""
    pivot = df.pivot(index='Date', columns='Ticker', values='Adj_Close')
    pivot = pivot.ffill().dropna(how='all', axis=1)
    return pivot


def append_prices(df: pd.DataFrame,
                  pivot_df: pd.DataFrame,
                  new_rows: pd.DataFrame,
                  sector_map: dict) -> tuple[pd.DataFrame, pd.DataFrame, dict]:
    """
    Streaming mode: merge new price rows into existing state.

    Parameters
    ----------
    df         : existing long-format df
    pivot_df   : existing pivot
    new_rows   : new long-format rows (same schema as df)
    sector_map : existing sector map

    Returns updated (df, pivot_df, sector_map).
    """
    new_rows = new_rows.copy()
    new_rows['Date'] = pd.to_datetime(new_rows['Date'], utc=True).dt.tz_localize(None)

    df_combined = (pd.concat([df, new_rows], ignore_index=True)
                     .drop_duplicates(['Date', 'Ticker'])
                     .sort_values(['Ticker', 'Date'])
                     .reset_index(drop=True))

    # Update sector map with any new tickers
    new_sectors = new_rows.groupby('Ticker')['Sector'].first().to_dict()
    sector_map  = {**sector_map, **new_sectors}

    pivot_df = _build_pivot(df_combined)

    return df_combined, pivot_df, sector_map
