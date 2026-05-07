// src/components/Sidebar.jsx

const NAV = [
  { id: 'dashboard', icon: '◈', label: 'Dashboard' },
  { id: 'news', icon: '📰', label: 'Market News' },
  { id: 'watchlist', icon: '★', label: 'Watchlist' },
  { id: 'ai', icon: '⚡', label: 'AI Analytics' },
  { id: 'profile', icon: '◎', label: 'Profile' },
];

export default function Sidebar({ page, setPage, watchlist, user, onLogout, searchActive, setSearchActive, setSearchQuery }) {
  return (
    <nav className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-mark">SP</div>
        <div className="logo-text">Stock<span>Pulse</span></div>
      </div>

      <div className="sidebar-nav">
        <div className="nav-section">
          <div className="nav-label">Main</div>
          {NAV.map(n => (
            <div
              key={n.id}
              className={`nav-item ${page === n.id && !searchActive ? 'active' : ''}`}
              onClick={() => { setPage(n.id); setSearchActive(false); setSearchQuery(''); }}
            >
              <span className="nav-icon">{n.icon}</span>
              {n.label}
              {n.id === 'watchlist' && watchlist.length > 0 && (
                <span className="nav-badge">{watchlist.length}</span>
              )}
            </div>
          ))}
        </div>

        {/* Quick links */}
        <div className="nav-section" style={{ marginTop: '16px' }}>
          <div className="nav-label">Quick Access</div>
          <div className="nav-item" onClick={() => { setPage('ai'); setSearchActive(false); setSearchQuery(''); }}>
            <span className="nav-icon">🧠</span>
            ML Clusters
          </div>
          <div className="nav-item" onClick={() => { setPage('news'); setSearchActive(false); setSearchQuery(''); }}>
            <span className="nav-icon">📡</span>
            Live Feed
          </div>
        </div>
      </div>

      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="avatar">{user.name.charAt(0).toUpperCase()}</div>
          <div className="user-info">
            <div className="user-name">{user.name}</div>
            <div className="user-plan">⚡ Pro Plan</div>
          </div>
          <div
            className="icon-btn"
            onClick={onLogout}
            title="Sign out"
            style={{ marginLeft: '4px', width: '28px', height: '28px', fontSize: '13px' }}
          >
            ⏻
          </div>
        </div>
      </div>
    </nav>
  );
}
