import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Bookmark, BookmarkCheck, TrendingUp, TrendingDown, ExternalLink, Info } from 'lucide-react';
import { createChart } from 'lightweight-charts';
import {
  useStock, useStockHistory, useStockFundamentals,
  useStockTechnicals, useSimilarStocks, useWatchlist,
} from '../hooks/useData';
import { useAuth } from '../context/AuthContext';
import {
  formatPrice, formatPct, formatVolume, formatMarketCap,
  formatPercent, formatRatio, formatDate, changeClass, signalClass,
} from '../lib/format';
import styles from './StockDetail.module.css';

const RANGES = ['1m', '3m', '6m', '1y', '3y', '5y', '10y', 'all'];

// ── Price Chart ──────────────────────────────────────────────────────────────
function PriceChart({ symbol, range, onRangeChange }) {
  const chartRef = useRef(null);
  const containerRef = useRef(null);
  const { data, loading } = useStockHistory(symbol, range);

  useEffect(() => {
    if (!containerRef.current || !data) return;

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height: 300,
      layout: {
        background: { color: 'transparent' },
        textColor: getComputedStyle(document.documentElement).getPropertyValue('--text-muted').trim(),
      },
      grid: {
        vertLines: { color: getComputedStyle(document.documentElement).getPropertyValue('--border-subtle').trim() },
        horzLines: { color: getComputedStyle(document.documentElement).getPropertyValue('--border-subtle').trim() },
      },
      crosshair: { mode: 1 },
      rightPriceScale: { borderColor: 'transparent' },
      timeScale: { borderColor: 'transparent', timeVisible: true },
    });

    const areaSeries = chart.addAreaSeries({
      lineColor: getComputedStyle(document.documentElement).getPropertyValue('--accent').trim(),
      topColor: getComputedStyle(document.documentElement).getPropertyValue('--accent-dim').trim(),
      bottomColor: 'transparent',
      lineWidth: 2,
    });

    const chartData = data.map((d) => ({
      time: d.price_date.split('T')[0],
      value: parseFloat(d.close_price),
    }));
    areaSeries.setData(chartData);
    chart.timeScale().fitContent();

    chartRef.current = chart;

    const ro = new ResizeObserver(() => {
      chart.applyOptions({ width: containerRef.current.clientWidth });
    });
    ro.observe(containerRef.current);

    return () => { chart.remove(); ro.disconnect(); };
  }, [data]);

  return (
    <div className={styles.chartWrap}>
      <div className={styles.rangeBar}>
        {RANGES.map((r) => (
          <button
            key={r} onClick={() => onRangeChange(r)}
            className={`${styles.rangeBtn} ${range === r ? styles.rangeActive : ''}`}
          >
            {r.toUpperCase()}
          </button>
        ))}
      </div>
      {loading ? (
        <div className={styles.chartLoader}>
          <div className="spinner" style={{ width: 32, height: 32 }} />
        </div>
      ) : (
        <div ref={containerRef} className={styles.chartContainer} />
      )}
    </div>
  );
}

// ── Fundamental row ──────────────────────────────────────────────────────────
function FundRow({ label, value }) {
  return (
    <div className={styles.fundRow}>
      <span className={styles.fundLabel}>{label}</span>
      <span className={styles.fundValue}>{value}</span>
    </div>
  );
}

// ── Signal badge ─────────────────────────────────────────────────────────────
function Signal({ label, value, signal }) {
  return (
    <div className={styles.signalItem}>
      <span className={styles.signalLabel}>{label}</span>
      <span className={`${styles.signalValue} mono`}>{value ?? '—'}</span>
      {signal && <span className={`badge ${signalClass(signal)}`}>{signal}</span>}
    </div>
  );
}

// ── Similar stock card ───────────────────────────────────────────────────────
function SimilarCard({ stock }) {
  const isPositive = parseFloat(stock.change_pct) >= 0;
  const correlation = Math.round(stock.correlation * 100);
  return (
    <Link to={`/stocks/${stock.symbol}`} className={styles.similarCard}>
      <div className={styles.similarTop}>
        <span className={styles.similarSymbol}>{stock.symbol}</span>
        <span className={`badge badge-neutral`}>{correlation}% corr</span>
      </div>
      <div className={styles.similarName}>{stock.name}</div>
      <div className={styles.similarBottom}>
        <span className={styles.similarPrice}>{formatPrice(stock.close_price)}</span>
        <span className={isPositive ? 'positive' : 'negative'}>
          {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          {formatPct(stock.change_pct)}
        </span>
      </div>
      <div className={styles.similarSector}>{stock.sector}</div>
    </Link>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function StockDetailPage() {
  const { symbol } = useParams();
  const { user } = useAuth();
  const [range, setRange] = useState('1y');

  const { data: stock, loading: stockLoading, error: stockError } = useStock(symbol);
  const { data: fundamentals } = useStockFundamentals(symbol);
  const { data: technicals } = useStockTechnicals(symbol);
  const { data: similar } = useSimilarStocks(symbol);
  const { data: watchlist, add: addToWatchlist, remove: removeFromWatchlist } = useWatchlist();

  const watchEntry = watchlist?.find((w) => w.symbol === symbol?.toUpperCase());
  const [wlLoading, setWlLoading] = useState(false);

  const toggleWatchlist = async () => {
    if (!user) return;
    setWlLoading(true);
    try {
      if (watchEntry) {
        await removeFromWatchlist(watchEntry.watch_id);
      } else {
        await addToWatchlist(stock.stock_id, null, null);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setWlLoading(false);
    }
  };

  if (stockLoading) {
    return (
      <div className="page-content">
        <div className="container">
          <div className={styles.loadingPage}>
            <div className="spinner" style={{ width: 40, height: 40 }} />
          </div>
        </div>
      </div>
    );
  }

  if (stockError || !stock) {
    return (
      <div className="page-content">
        <div className="container">
          <div className={styles.errorPage}>
            <h2>Stock not found</h2>
            <p>"{symbol}" could not be found.</p>
            <Link to="/" className="btn btn-secondary btn-sm">← Back to market</Link>
          </div>
        </div>
      </div>
    );
  }

  const snap = stock.snapshot;
  const priceChange = snap?.price_change ?? null;
  const isPositive = priceChange !== null ? parseFloat(priceChange) >= 0 : null;

  return (
    <div className="page-content">
      <div className="container">
        {/* ── Header ── */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <div className={styles.symbolRow}>
              <h1 className={styles.symbol}>{stock.symbol}</h1>
              <span className={styles.exchange}>{stock.exchange}</span>
              <span className={`badge badge-neutral`}>{stock.sector}</span>
            </div>
            <div className={styles.companyName}>{stock.name}</div>
          </div>
          <div className={styles.headerRight}>
            <div className={styles.priceBlock}>
              <span className={styles.currentPrice}>{formatPrice(snap?.current_price)}</span>
              {priceChange !== null && (
                <span className={`${styles.priceChange} ${isPositive ? 'positive' : 'negative'}`}>
                  {isPositive ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                  {formatPrice(Math.abs(priceChange))} ({formatPct(snap?.change_pct)})
                </span>
              )}
            </div>
            {user && (
              <button
                onClick={toggleWatchlist}
                className={`btn ${watchEntry ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                disabled={wlLoading}
              >
                {watchEntry ? <BookmarkCheck size={15} /> : <Bookmark size={15} />}
                {watchEntry ? 'Watchlisted' : 'Add to watchlist'}
              </button>
            )}
          </div>
        </div>

        {/* ── Key stats bar ── */}
        <div className={styles.statsBar}>
          {[
            { label: 'Open',      value: formatPrice(snap?.open_price) },
            { label: 'High',      value: formatPrice(snap?.day_high) },
            { label: 'Low',       value: formatPrice(snap?.day_low) },
            { label: 'Prev Close',value: formatPrice(snap?.previous_close) },
            { label: 'Volume',    value: formatVolume(snap?.volume) },
            { label: '52W High',  value: formatPrice(snap?.week52_high) },
            { label: '52W Low',   value: formatPrice(snap?.week52_low) },
            { label: 'Mkt Cap',   value: formatMarketCap(stock.market_cap) },
          ].map(({ label, value }) => (
            <div key={label} className={styles.statItem}>
              <span className={styles.statLabel}>{label}</span>
              <span className={styles.statValue}>{value}</span>
            </div>
          ))}
        </div>

        {/* ── Chart ── */}
        <div className="card" style={{ padding: 0, marginBottom: 20, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 14, color: 'var(--text-secondary)', fontWeight: 600 }}>
              Price History
            </h2>
          </div>
          <div style={{ padding: '12px 16px 16px' }}>
            <PriceChart symbol={symbol} range={range} onRangeChange={setRange} />
          </div>
        </div>

        <div className={styles.detailGrid}>
          {/* ── Fundamentals ── */}
          <div className="card">
            <h2 className={styles.sectionTitle}>Fundamentals</h2>
            {!fundamentals ? (
              <div className={styles.noData}><Info size={14} /> No fundamental data available.</div>
            ) : (
              <div className={styles.fundGrid}>
                <FundRow label="EPS (Annual)" value={fundamentals.eps_annual ?? '—'} />
                <FundRow label="P/E Ratio" value={fundamentals.pe_annual ? formatRatio(fundamentals.pe_annual) : '—'} />
                <FundRow label="Gross Margin" value={formatPercent(fundamentals.gross_profit_margin_pct)} />
                <FundRow label="Net Margin" value={formatPercent(fundamentals.net_profit_margin_pct)} />
                <FundRow label="ROE" value={formatPercent(fundamentals.roe_pct)} />
                <FundRow label="ROA" value={formatPercent(fundamentals.roa_pct)} />
                <FundRow label="Debt/Equity" value={fundamentals.debt_to_equity ? formatRatio(fundamentals.debt_to_equity) : '—'} />
                <FundRow label="Current Ratio" value={fundamentals.current_ratio ? formatRatio(fundamentals.current_ratio) : '—'} />
                <FundRow label="Dividend Yield" value={formatPercent(fundamentals.dividend_yield_pct)} />
              </div>
            )}
          </div>

          {/* ── Technicals ── */}
          <div className="card">
            <h2 className={styles.sectionTitle}>Technical Indicators</h2>
            {!technicals ? (
              <div className={styles.noData}><Info size={14} /> No technical data available.</div>
            ) : (
              <div className={styles.signalGrid}>
                <Signal label="RSI (14)" value={technicals.rsi} signal={technicals.rsi_signal} />
                <Signal label="MACD" value={technicals.macd} signal={technicals.macd_signal} />
                <Signal label="Stochastic" value={technicals.stoch} signal={technicals.stoch_signal} />
                <Signal label="SMA 5" value={technicals.sma5} signal={technicals.sma5_signal} />
                <Signal label="SMA 50" value={technicals.sma50} signal={technicals.sma50_signal} />
                <Signal label="SMA 100" value={technicals.sma100} signal={technicals.sma100_signal} />
                <Signal label="BB Upper" value={formatPrice(technicals.bollinger_upper)} />
                <Signal label="BB Lower" value={formatPrice(technicals.bollinger_lower)} />
                <Signal label="ADX" value={technicals.adx} signal={technicals.adx > 25 ? 'Trending' : 'Weak Trend'} />
              </div>
            )}
          </div>
        </div>

        {/* ── Company Info ── */}
        {stock.company_background && (
          <div className="card" style={{ marginTop: 20 }}>
            <h2 className={styles.sectionTitle}>About {stock.name}</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.7 }}>
              {stock.company_background}
            </p>
            {stock.website && (
              <a href={stock.website} target="_blank" rel="noopener noreferrer"
                className="btn btn-ghost btn-sm" style={{ marginTop: 12, padding: '6px 0' }}>
                <ExternalLink size={13} /> {stock.website}
              </a>
            )}
          </div>
        )}

        {/* ── Similar Stocks ── */}
        <div style={{ marginTop: 28 }}>
          <h2 className={styles.sectionTitle} style={{ marginBottom: 16 }}>
            Similar Stocks
            <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: 13, marginLeft: 8 }}>
              by price trend correlation
            </span>
          </h2>
          {!similar || similar.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>
              Not enough history to compute similarities yet.
            </div>
          ) : (
            <div className={styles.similarGrid}>
              {similar.map((s) => <SimilarCard key={s.symbol} stock={s} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
