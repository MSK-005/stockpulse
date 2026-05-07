// src/pages/Dashboard.jsx
import { useState, useEffect, useRef } from 'react';
import { Chart, registerables } from 'chart.js';
import Sparkline from '../components/Sparkline';
import { STOCKS as MOCK_STOCKS, MARKET_INDICES, SECTOR_DATA, generateSparkData } from '../utils/data';
import { apiFetch } from '../utils/api';

Chart.register(...registerables);

const API = process.env.REACT_APP_NODE_API || 'http://localhost:3001/api';

// Normalise DB row → same shape as mock STOCKS entries
function normaliseStock(row) {
  return {
    ticker:   row.symbol,
    name:     row.name,
    sector:   row.sector || 'Unknown',
    price:    parseFloat(row.current_price || row.market_cap || 0),
    change:   parseFloat(row.price_change || 0),
    pct:      parseFloat(row.change_pct || 0),
    vol:      row.volume ? Number(row.volume).toLocaleString() : '—',
    mktcap:   row.market_cap || '—',
    pe:       row.pe_annual || '—',
    color:    '#3b82f6',
  };
}

function MainChart({ tab }) {
  const canvasRef = useRef();
  const chartRef = useRef();

  useEffect(() => {
    if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; }
    const canvas = canvasRef.current;
    if (!canvas) return;

    const pts = tab === '1D' ? 24 : tab === '1W' ? 7 : tab === '1M' ? 30 : tab === '3M' ? 90 : 252;
    const labels = Array.from({ length: pts }, (_, i) => {
      if (tab === '1D') return `${i}:00`;
      if (tab === '1W') return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i % 7];
      return `D${i + 1}`;
    });
    let v = 5100;
    const data = labels.map(() => { v += ((Math.random() - 0.48) * 25); return +v.toFixed(2); });

    chartRef.current = new Chart(canvas, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'S&P 500',
          data,
          borderColor: '#2563eb',
          borderWidth: 2,
          fill: true,
          backgroundColor: (ctx) => {
            const g = ctx.chart.ctx.createLinearGradient(0, 0, 0, 300);
            g.addColorStop(0, 'rgba(37,99,235,0.15)');
            g.addColorStop(1, 'rgba(37,99,235,0)');
            return g;
          },
          tension: 0.4,
          pointRadius: 0,
          pointHoverRadius: 4,
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => `$${ctx.raw.toLocaleString()}` } } },
        scales: {
          x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#475569', maxTicksLimit: 8, font: { family: 'JetBrains Mono', size: 11 } } },
          y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#475569', callback: v => `$${(v / 1000).toFixed(1)}K`, font: { family: 'JetBrains Mono', size: 11 } } }
        },
        interaction: { mode: 'index', intersect: false },
      }
    });
    return () => { if (chartRef.current) chartRef.current.destroy(); };
  }, [tab]);

  return <div style={{ position: 'relative', height: 240 }}><canvas ref={canvasRef} /></div>;
}

function SectorChart({ sectorData }) {
  const canvasRef = useRef();
  const chartRef = useRef();

  useEffect(() => {
    if (!sectorData || sectorData.length === 0) return;
    if (chartRef.current) { chartRef.current.destroy(); }
    chartRef.current = new Chart(canvasRef.current, {
      type: 'bar',
      data: {
        labels: sectorData.map(s => s.name.length > 8 ? s.name.slice(0, 8) : s.name),
        datasets: [{
          label: 'Sector Return %',
          data: sectorData.map(s => s.change),
          backgroundColor: sectorData.map(s => s.change >= 0 ? 'rgba(16,185,129,0.7)' : 'rgba(239,68,68,0.7)'),
          borderRadius: 6,
          borderSkipped: false,
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false }, ticks: { color: '#475569', font: { family: 'JetBrains Mono', size: 9 } } },
          y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#475569', callback: v => v + '%', font: { family: 'JetBrains Mono', size: 10 } } }
        }
      }
    });
    return () => { if (chartRef.current) chartRef.current.destroy(); };
  }, [sectorData]);

  return <div style={{ position: 'relative', height: 180 }}><canvas ref={canvasRef} /></div>;
}

export default function Dashboard({ watchlist, setWatchlist }) {
  const [chartTab, setChartTab] = useState('1M');
  const [showAll, setShowAll] = useState(false);
  const [stocks, setStocks] = useState(MOCK_STOCKS);
  const [sectorData, setSectorData] = useState(SECTOR_DATA);
  const [dbConnected, setDbConnected] = useState(false);
  const [loadingStocks, setLoadingStocks] = useState(true);

  // Sparks are generated per stock, keyed by ticker
  const [sparks, setSparks] = useState({});

  // Fetch real stocks from backend
  useEffect(() => {
    setLoadingStocks(true);
    apiFetch('/stocks/')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          const normalised = data.map(normaliseStock);
          setStocks(normalised);
          setDbConnected(true);
          // Generate sparks for each
          const sp = {};
          normalised.forEach(s => { sp[s.ticker] = generateSparkData(s.pct >= 0); });
          setSparks(sp);
        }
      })
      .catch(() => {
        // Backend unreachable — stay with mock data
        const sp = {};
        MOCK_STOCKS.forEach(s => { sp[s.ticker] = generateSparkData(s.pct >= 0); });
        setSparks(sp);
      })
      .finally(() => setLoadingStocks(false));
  }, []);

  // Fetch real sector data from analytics endpoint
  useEffect(() => {
    fetch(`${API}/analytics/sectors`)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setSectorData(data.map(d => ({ name: d.sector, change: parseFloat((d.avg_change || 0).toFixed(2)) })));
        }
      })
      .catch(() => {}); // keep mock
  }, []);

  const toggleWatch = (stock) => {
    setWatchlist(prev =>
      prev.find(s => s.ticker === stock.ticker)
        ? prev.filter(s => s.ticker !== stock.ticker)
        : [...prev, stock]
    );
  };

  const displayedStocks = showAll ? stocks : stocks.slice(0, 8);

  return (
    <div className="page-content fade-in">

      {/* DB status banner */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, fontSize: 12, fontFamily: 'var(--font-mono)', color: dbConnected ? 'var(--success)' : 'var(--warning)' }}>
        <div style={{ width: 7, height: 7, borderRadius: '50%', background: dbConnected ? 'var(--success)' : 'var(--warning)' }} />
        {dbConnected ? `Live DB · ${stocks.length} stocks loaded` : 'Mock data · Connect DB in .env to see live stocks'}
      </div>

      {/* Market Indices */}
      <div className="market-grid">
        {MARKET_INDICES.map(idx => (
          <div className={`market-card ${idx.dir}`} key={idx.name}>
            <div className="market-name">{idx.name}</div>
            <div className="market-value">{idx.value}</div>
            <div className={`market-change ${idx.dir === 'up' ? 'up' : 'down'}`}>
              {idx.change} ({idx.pct})
            </div>
          </div>
        ))}
      </div>

      {/* Main Chart */}
      <div className="chart-area">
        <div className="chart-header">
          <div>
            <div className="chart-title">S&P 500 Performance</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
              5,254.35 · <span className="up">+0.74%</span>
            </div>
          </div>
          <div className="chart-tabs">
            {['1D', '1W', '1M', '3M', '1Y'].map(t => (
              <button key={t} className={`chart-tab ${chartTab === t ? 'active' : ''}`} onClick={() => setChartTab(t)}>{t}</button>
            ))}
          </div>
        </div>
        <MainChart tab={chartTab} />
      </div>

      {/* Bottom Grid */}
      <div className="bottom-grid">
        {/* Stocks Table */}
        <div className="card">
          <div className="section-header">
            <div className="section-title">All Stocks {loadingStocks && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>loading…</span>}</div>
            <button
              onClick={() => setShowAll(p => !p)}
              style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}
            >
              {showAll ? 'Show Less' : `Show All (${stocks.length})`}
            </button>
          </div>
          <div className="stock-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Ticker</th>
                  <th>Name</th>
                  <th>Price</th>
                  <th>Change</th>
                  <th>Volume</th>
                  <th>7D</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {displayedStocks.map((s) => (
                  <tr key={s.ticker}>
                    <td><span className="ticker-badge">{s.ticker}</span></td>
                    <td>
                      <div style={{ fontWeight: 500 }}>{s.name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{s.sector}</div>
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 500 }}>
                      {typeof s.price === 'number' && s.price > 0 ? `$${s.price.toFixed(2)}` : '—'}
                    </td>
                    <td>
                      <span className={s.pct >= 0 ? 'up' : 'down'} style={{ fontFamily: 'var(--font-mono)', fontSize: '13px' }}>
                        {s.pct >= 0 ? '+' : ''}{Number(s.pct).toFixed(2)}%
                      </span>
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)' }}>{s.vol}</td>
                    <td><Sparkline data={sparks[s.ticker] || generateSparkData(s.pct >= 0)} up={s.pct >= 0} /></td>
                    <td>
                      <button
                        className={`watch-btn ${watchlist.find(w => w.ticker === s.ticker) ? 'watching' : ''}`}
                        onClick={() => toggleWatch(s)}
                      >
                        {watchlist.find(w => w.ticker === s.ticker) ? '★ Watching' : '+ Watch'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Sector Chart */}
        <div className="card">
          <div className="card-title">Sector Performance</div>
          <SectorChart sectorData={sectorData} />
          <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {sectorData.slice(0, 5).map(s => (
              <div key={s.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{s.name}</span>
                <span className={s.change >= 0 ? 'up' : 'down'} style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', fontWeight: 600 }}>
                  {s.change >= 0 ? '+' : ''}{s.change}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
