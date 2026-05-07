// src/components/Topbar.jsx

const PAGE_TITLES = {
  dashboard: 'Dashboard',
  news: 'Market News',
  watchlist: 'Watchlist',
  ai: 'AI Analytics',
  profile: 'Profile',
};

export default function Topbar({ page, searchQuery, searchActive, onSearch, theme, setTheme, user, setPage }) {
  return (
    <div className="topbar">
      <div className="topbar-title">
        {searchActive ? '🔍 Search Results' : PAGE_TITLES[page] || 'StockPulse'}
      </div>

      <div className="topbar-search">
        <span className="search-icon">🔍</span>
        <input
          className="search-input"
          placeholder="Search stocks, tickers, sectors..."
          value={searchQuery}
          onChange={e => onSearch(e.target.value)}
          onKeyDown={e => { if (e.key === 'Escape') onSearch(''); }}
        />
      </div>

      <div className="topbar-actions">
        <div className="icon-btn" onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')} title="Toggle theme">
          {theme === 'dark' ? '☀' : '🌙'}
        </div>
        <div className="icon-btn" title="Notifications">🔔</div>
        <div
          className="avatar"
          style={{ width: 32, height: 32, fontSize: 13, borderRadius: 8, cursor: 'pointer' }}
          onClick={() => setPage('profile')}
          title="Profile"
        >
          {user.name.charAt(0).toUpperCase()}
        </div>
      </div>
    </div>
  );
}
