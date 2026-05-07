import { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { TrendingUp, TrendingDown, ChevronLeft, ChevronRight } from 'lucide-react';
import api from '../lib/api';
import { formatPrice, formatPct, formatVolume, formatMarketCap } from '../lib/format';
import styles from './StocksList.module.css';

const SECTORS = [
  'All',
  'Information Technology', 'Financials', 'Health Care',
  'Consumer Discretionary', 'Communication Services', 'Consumer Staples',
  'Energy', 'Industrials', 'Materials', 'Real Estate', 'Utilities',
];

const PAGE_SIZE = 50;

export default function StocksListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const sectorParam = searchParams.get('sector') || 'All';

  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [sortKey, setSortKey] = useState('symbol');
  const [sortDir, setSortDir] = useState('asc');

  const loadStocks = useCallback(async (sector, pg) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: PAGE_SIZE,
        offset: pg * PAGE_SIZE,
      });
      if (sector && sector !== 'All') params.set('sector', sector);
      const { data } = await api.get(`/api/stocks?${params}`);
      setStocks(data);
      setHasMore(data.length === PAGE_SIZE);
    } catch (err) {
      setError('Failed to load stocks.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setPage(0);
    loadStocks(sectorParam, 0);
  }, [sectorParam, loadStocks]);

  useEffect(() => {
    loadStocks(sectorParam, page);
  }, [page]);

  const setSector = (s) => {
    if (s === 'All') searchParams.delete('sector');
    else searchParams.set('sector', s);
    setSearchParams(searchParams);
  };

  const handleSort = (key) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('asc'); }
  };

  const sorted = [...stocks].sort((a, b) => {
    let av = a[sortKey], bv = b[sortKey];
    if (typeof av === 'string') av = av.toLowerCase();
    if (typeof bv === 'string') bv = bv.toLowerCase();
    if (av == null) return 1;
    if (bv == null) return -1;
    return sortDir === 'asc' ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
  });

  const SortIcon = ({ col }) => {
    if (sortKey !== col) return <span style={{ color: 'var(--border)', marginLeft: 4 }}>↕</span>;
    return <span style={{ marginLeft: 4 }}>{sortDir === 'asc' ? '↑' : '↓'}</span>;
  };

  return (
    <div className="page-content">
      <div className="container">
        <div className={styles.header}>
          <div>
            <h1 className={styles.pageTitle}>Browse Stocks</h1>
            <p className={styles.pageSubtitle}>S&P 500 constituents — all US exchanges</p>
          </div>
        </div>

        {/* Sector filter */}
        <div className={styles.sectorScroll}>
          {SECTORS.map((s) => (
            <button
              key={s}
              className={`${styles.sectorBtn} ${sectorParam === s || (s === 'All' && sectorParam === 'All') ? styles.sectorActive : ''}`}
              onClick={() => setSector(s)}
            >
              {s}
            </button>
          ))}
        </div>

        {error && <div className="card" style={{ color: 'var(--red)', padding: 16 }}>{error}</div>}

        {/* Table */}
        <div className="card" style={{ padding: 0, overflow: 'hidden', marginTop: 16 }}>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th onClick={() => handleSort('symbol')} style={{ cursor: 'pointer' }}>
                    Symbol <SortIcon col="symbol" />
                  </th>
                  <th onClick={() => handleSort('name')} style={{ cursor: 'pointer' }}>
                    Company <SortIcon col="name" />
                  </th>
                  <th>Sector</th>
                  <th>Exchange</th>
                  <th onClick={() => handleSort('market_cap')} style={{ cursor: 'pointer', textAlign: 'right' }}>
                    Market Cap <SortIcon col="market_cap" />
                  </th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [...Array(10)].map((_, i) => (
                    <tr key={i}>
                      {[...Array(6)].map((__, j) => (
                        <td key={j}><div className="skeleton" style={{ height: 16, borderRadius: 4 }} /></td>
                      ))}
                    </tr>
                  ))
                ) : sorted.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>
                      No stocks found. Run the seed script first.
                    </td>
                  </tr>
                ) : (
                  sorted.map((stock) => (
                    <tr key={stock.stock_id}>
                      <td>
                        <Link to={`/stocks/${stock.symbol}`} className={styles.symbolLink}>
                          {stock.symbol}
                        </Link>
                      </td>
                      <td style={{ color: 'var(--text-secondary)' }}>{stock.name}</td>
                      <td>
                        <span className={styles.sectorTag}>{stock.sector}</span>
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                        {stock.exchange}
                      </td>
                      <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 13 }}>
                        {formatMarketCap(stock.market_cap)}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <Link to={`/stocks/${stock.symbol}`} className="btn btn-ghost btn-sm">
                          View →
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className={styles.pagination}>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0 || loading}
            >
              <ChevronLeft size={15} /> Prev
            </button>
            <span className={styles.pageInfo}>Page {page + 1}</span>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setPage((p) => p + 1)}
              disabled={!hasMore || loading}
            >
              Next <ChevronRight size={15} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
