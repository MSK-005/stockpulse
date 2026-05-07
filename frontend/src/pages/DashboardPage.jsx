import { useState } from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, TrendingDown, Zap, BarChart2 } from 'lucide-react';
import { useMarketMovers, useSectorSummary } from '../hooks/useData';
import { formatPrice, formatPct, formatVolume, changeClass } from '../lib/format';
import styles from './Dashboard.module.css';

function StatCard({ label, value, sub, positive }) {
  return (
    <div className={styles.statCard}>
      <span className={styles.statLabel}>{label}</span>
      <span className={`${styles.statValue} ${positive === true ? 'positive' : positive === false ? 'negative' : ''}`}>
        {value}
      </span>
      {sub && <span className={styles.statSub}>{sub}</span>}
    </div>
  );
}

function StockRow({ stock, rank }) {
  const isPositive = parseFloat(stock.change_pct) >= 0;
  return (
    <Link to={`/stocks/${stock.symbol}`} className={styles.stockRow}>
      <span className={styles.rank}>{rank}</span>
      <div className={styles.stockInfo}>
        <span className={styles.symbol}>{stock.symbol}</span>
        <span className={styles.sName}>{stock.name}</span>
      </div>
      <div className={styles.priceCol}>
        <span className={styles.price}>{formatPrice(stock.close_price)}</span>
        <span className={`${styles.change} ${isPositive ? 'positive' : 'negative'}`}>
          {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          {formatPct(stock.change_pct)}
        </span>
      </div>
    </Link>
  );
}

function SectorBar({ sector }) {
  const pct = parseFloat(sector.avg_change_pct) || 0;
  const isPositive = pct >= 0;
  const barWidth = Math.min(Math.abs(pct) * 10, 100);

  return (
    <div className={styles.sectorRow}>
      <span className={styles.sectorName}>{sector.sector}</span>
      <div className={styles.sectorBar}>
        <div
          className={`${styles.sectorFill} ${isPositive ? styles.sectorPos : styles.sectorNeg}`}
          style={{ width: `${barWidth}%` }}
        />
      </div>
      <span className={`${styles.sectorPct} ${isPositive ? 'positive' : 'negative'}`}>
        {isPositive ? '+' : ''}{pct.toFixed(2)}%
      </span>
    </div>
  );
}

export default function DashboardPage() {
  const { data: movers, loading: moversLoading } = useMarketMovers();
  const { data: sectors, loading: sectorsLoading } = useSectorSummary();
  const [moversTab, setMoversTab] = useState('gainers');

  const activeList = movers?.[moversTab] || [];

  return (
    <div className="page-content">
      <div className="container">
        <div className={styles.header}>
          <div>
            <h1 className={styles.pageTitle}>Market Overview</h1>
            <p className={styles.pageSubtitle}>S&P 500 — Real-time US equity analytics</p>
          </div>
        </div>

        <div className={styles.grid}>
          {/* ── Movers Panel ── */}
          <div className={`card ${styles.moversCard}`}>
            <div className={styles.cardHeader}>
              <div className={styles.tabs}>
                {['gainers', 'losers', 'most_active'].map((tab) => (
                  <button
                    key={tab}
                    className={`${styles.tab} ${moversTab === tab ? styles.tabActive : ''}`}
                    onClick={() => setMoversTab(tab)}
                  >
                    {tab === 'most_active' ? (
                      <><Zap size={13} /> Most Active</>
                    ) : tab === 'gainers' ? (
                      <><TrendingUp size={13} /> Gainers</>
                    ) : (
                      <><TrendingDown size={13} /> Losers</>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {moversLoading ? (
              <div className={styles.loadingRows}>
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="skeleton" style={{ height: 52, borderRadius: 8, marginBottom: 4 }} />
                ))}
              </div>
            ) : activeList.length === 0 ? (
              <div className={styles.empty}>No data available yet. Run the ingestion script first.</div>
            ) : (
              <div className={styles.stockList}>
                {activeList.map((stock, i) => (
                  <StockRow key={stock.symbol} stock={stock} rank={i + 1} />
                ))}
              </div>
            )}
          </div>

          {/* ── Sector Performance ── */}
          <div className={`card ${styles.sectorCard}`}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}><BarChart2 size={16} /> Sector Performance</h2>
            </div>
            {sectorsLoading ? (
              <div className={styles.loadingRows}>
                {[...Array(11)].map((_, i) => (
                  <div key={i} className="skeleton" style={{ height: 36, borderRadius: 6, marginBottom: 6 }} />
                ))}
              </div>
            ) : !sectors || sectors.length === 0 ? (
              <div className={styles.empty}>No sector data yet.</div>
            ) : (
              <div className={styles.sectorList}>
                {sectors.map((s) => <SectorBar key={s.sector} sector={s} />)}
              </div>
            )}
          </div>
        </div>

        {/* ── Quick Links ── */}
        <div className={styles.quickLinks}>
          <p className={styles.qlLabel}>Browse by sector</p>
          <div className={styles.qlTags}>
            {['Information Technology', 'Financials', 'Health Care', 'Energy', 'Consumer Discretionary',
              'Communication Services', 'Industrials', 'Consumer Staples', 'Materials', 'Real Estate', 'Utilities'
            ].map((s) => (
              <Link key={s} to={`/stocks?sector=${encodeURIComponent(s)}`} className={styles.qlTag}>
                {s}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
