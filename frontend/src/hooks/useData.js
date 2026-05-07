import { useState, useEffect, useCallback } from 'react';
import api from '../lib/api';

// Generic data fetcher
export function useFetch(url, options = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const { enabled = true, deps = [] } = options;

  const fetch = useCallback(async () => {
    if (!url || !enabled) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(url);
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [url, enabled, ...deps]);

  useEffect(() => { fetch(); }, [fetch]);

  return { data, loading, error, refetch: fetch };
}

// Stock detail
export function useStock(symbol) {
  return useFetch(symbol ? `/api/stocks/${symbol}` : null);
}

// Stock history
export function useStockHistory(symbol, range = '1y') {
  return useFetch(symbol ? `/api/stocks/${symbol}/history?range=${range}` : null, { deps: [range] });
}

// Stock fundamentals
export function useStockFundamentals(symbol) {
  return useFetch(symbol ? `/api/stocks/${symbol}/fundamentals` : null);
}

// Stock technicals
export function useStockTechnicals(symbol) {
  return useFetch(symbol ? `/api/stocks/${symbol}/technicals` : null);
}

// Similar stocks
export function useSimilarStocks(symbol) {
  return useFetch(symbol ? `/api/stocks/${symbol}/similar` : null);
}

// Market movers
export function useMarketMovers() {
  return useFetch('/api/stocks/market/movers');
}

// Sector summary
export function useSectorSummary() {
  return useFetch('/api/stocks/market/sectors');
}

// Watchlist
export function useWatchlist() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/watchlist');
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load watchlist');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const add = async (stock_id, alert_price, notes) => {
    await api.post('/api/watchlist', { stock_id, alert_price, notes });
    await load();
  };

  const remove = async (watch_id) => {
    await api.delete(`/api/watchlist/${watch_id}`);
    setData((prev) => prev.filter((w) => w.watch_id !== watch_id));
  };

  const update = async (watch_id, payload) => {
    await api.put(`/api/watchlist/${watch_id}`, payload);
    await load();
  };

  return { data, loading, error, refetch: load, add, remove, update };
}

// All stocks (with optional search)
export function useStockSearch(query) {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query || query.length < 1) {
      setResults([]);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    api
      .get(`/api/stocks/search?q=${encodeURIComponent(query)}`, { signal: controller.signal })
      .then((res) => { setResults(res.data); setLoading(false); })
      .catch((err) => {
        if (err.name !== 'CanceledError') setLoading(false);
      });
    return () => controller.abort();
  }, [query]);

  return { results, loading };
}
