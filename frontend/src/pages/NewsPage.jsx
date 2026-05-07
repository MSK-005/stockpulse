// src/pages/NewsPage.jsx
import { useState } from 'react';
import { NEWS_DATA, TRENDING } from '../utils/data';

const CATS = ['All', 'Macro', 'Tech', 'Earnings', 'Energy', 'Financials', 'Consumer', 'Crypto', 'Global'];

export default function NewsPage() {
  const [cat, setCat] = useState('All');
  const [lastRefresh] = useState(() => new Date().toLocaleTimeString());

  const filtered = cat === 'All'
    ? NEWS_DATA
    : NEWS_DATA.filter(n => n.categories.some(c => c.toLowerCase() === cat.toLowerCase()));

  return (
    <div className="page-content fade-in">
      {/* Refresh indicator */}
      <div className="refresh-bar">
        <div className="refresh-dot" />
        Live · Last updated {lastRefresh}
        <span style={{ marginLeft: 'auto', color: 'var(--text-secondary)' }}>{filtered.length} stories</span>
      </div>

      {/* Category filters */}
      <div className="cat-filters">
        {CATS.map(c => (
          <button key={c} className={`cat-btn ${cat === c ? 'active' : ''}`} onClick={() => setCat(c)}>{c}</button>
        ))}
      </div>

      <div className="two-col-news">
        {/* News feed */}
        <div className="news-grid">
          {filtered.map(news => (
            <div className="news-card" key={news.id}>
              <div className="news-img">{news.emoji}</div>
              <div className="news-content">
                <div className="news-meta">
                  <span className="news-source">{news.source}</span>
                  <span className="news-time">{news.time}</span>
                  {news.categories.map(c => (
                    <span key={c} className="chip">{c}</span>
                  ))}
                </div>
                <div className="news-title">{news.title}</div>
                <div className="news-tags">
                  {news.tags.map(t => (
                    <span key={t} className={`news-tag ${t === 'bull' ? 'tag-bull' : t === 'bear' ? 'tag-bear' : 'tag-neutral'}`}>
                      {t === 'bull' ? '▲ Bullish' : t === 'bear' ? '▼ Bearish' : '◆ Neutral'}
                    </span>
                  ))}
                </div>
                <div className="sentiment-row">
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>Sentiment</span>
                  <div className="sentiment-bar-wrap">
                    <div
                      className="sentiment-bar"
                      style={{
                        width: `${news.sentiment * 100}%`,
                        background: news.sentiment > 0.6 ? 'var(--success)' : news.sentiment < 0.4 ? 'var(--danger)' : 'var(--warning)'
                      }}
                    />
                  </div>
                  <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                    {(news.sentiment * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="empty-state">
              <div className="empty-icon">📰</div>
              <div className="empty-text">No news in this category</div>
              <div className="empty-sub">Try selecting a different filter</div>
            </div>
          )}
        </div>

        {/* Trending sidebar */}
        <div className="trending-side">
          <div className="card" style={{ marginBottom: '16px' }}>
            <div className="card-title">🔥 Trending Now</div>
            {TRENDING.map(t => (
              <div className="trend-item" key={t.ticker}>
                <div>
                  <div className="trend-ticker">{t.ticker}</div>
                  <div className="trend-buzz">{t.buzz}</div>
                  <div className="heat-bar" style={{ width: `${t.heat}%` }} />
                </div>
                <span style={{ fontSize: '12px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>{t.heat}</span>
              </div>
            ))}
          </div>

          <div className="card">
            <div className="card-title">📊 Market Sentiment</div>
            {[
              { label: 'Fear & Greed Index', val: '72', status: 'Greed', color: 'var(--warning)' },
              { label: 'Put/Call Ratio', val: '0.82', status: 'Neutral', color: 'var(--text-secondary)' },
              { label: 'Advance/Decline', val: '2.1:1', status: 'Bullish', color: 'var(--success)' },
              { label: 'Insider Buying', val: '↑ 14%', status: 'Bullish', color: 'var(--success)' },
            ].map(m => (
              <div className="stat-row" key={m.label}>
                <div className="stat-label">{m.label}</div>
                <div style={{ textAlign: 'right' }}>
                  <div className="stat-val">{m.val}</div>
                  <div style={{ fontSize: '10px', color: m.color, fontFamily: 'var(--font-mono)' }}>{m.status}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="card" style={{ marginTop: '16px' }}>
            <div className="card-title">📅 Upcoming Events</div>
            {[
              { event: 'CPI Data Release', date: 'Apr 10', impact: 'High' },
              { event: 'Fed Minutes', date: 'Apr 11', impact: 'Med' },
              { event: 'NVDA Earnings', date: 'Apr 24', impact: 'High' },
              { event: 'Q2 GDP Estimate', date: 'Apr 28', impact: 'High' },
            ].map(ev => (
              <div className="trend-item" key={ev.event}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 500 }}>{ev.event}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{ev.date}</div>
                </div>
                <span style={{
                  fontSize: '10px', fontWeight: 600, padding: '2px 8px', borderRadius: '4px',
                  background: ev.impact === 'High' ? 'rgba(239,68,68,0.12)' : 'rgba(245,158,11,0.12)',
                  color: ev.impact === 'High' ? 'var(--danger)' : 'var(--warning)'
                }}>
                  {ev.impact}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
