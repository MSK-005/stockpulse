// src/pages/SearchPage.jsx
import { STOCKS } from '../utils/data';
import Sparkline from '../components/Sparkline';
import { generateSparkData } from '../utils/data';

export default function SearchPage({ query, watchlist, setWatchlist }) {
  const q = query.toLowerCase();
  const results = STOCKS.filter(s =>
    s.ticker.toLowerCase().includes(q) ||
    s.name.toLowerCase().includes(q) ||
    s.sector.toLowerCase().includes(q)
  );

  const toggleWatch = (stock) => {
    setWatchlist(prev =>
      prev.find(s => s.ticker === stock.ticker)
        ? prev.filter(s => s.ticker !== stock.ticker)
        : [...prev, stock]
    );
  };

  return (
    <div className="page-content fade-in">
      <div style={{ marginBottom: '16px', color: 'var(--text-secondary)', fontSize: '14px' }}>
        {results.length} result{results.length !== 1 ? 's' : ''} for "<strong style={{ color: 'var(--text-primary)' }}>{query}</strong>"
      </div>
      {results.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🔍</div>
          <div className="empty-text">No stocks found</div>
          <div className="empty-sub">Try searching by ticker (AAPL), name (Apple), or sector (Technology)</div>
        </div>
      ) : (
        <div className="search-results">
          {results.map(s => {
            const spark = generateSparkData(s.pct > 0);
            const watching = !!watchlist.find(w => w.ticker === s.ticker);
            return (
              <div className="search-result-item" key={s.ticker}>
                <div className="sr-ticker">{s.ticker}</div>
                <div className="sr-info">
                  <div className="sr-name">{s.name}</div>
                  <div className="sr-sector">{s.sector} · MCap {s.mktcap} · P/E {s.pe}x · Vol {s.vol}</div>
                </div>
                <Sparkline data={spark} up={s.pct > 0} width={80} height={32} />
                <div style={{ textAlign: 'right' }}>
                  <div className="sr-price">${s.price.toFixed(2)}</div>
                  <div className={`sr-change ${s.pct > 0 ? 'up' : 'down'}`}>
                    {s.pct > 0 ? '+' : ''}{s.pct.toFixed(2)}%
                  </div>
                </div>
                <button
                  className={`watch-btn ${watching ? 'watching' : ''}`}
                  onClick={() => toggleWatch(s)}
                >
                  {watching ? '★ Watching' : '+ Watch'}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
