// src/App.jsx
import { useState, useEffect } from 'react';
import AuthPage from './pages/AuthPage';
import Dashboard from './pages/Dashboard';
import NewsPage from './pages/NewsPage';
import WatchlistPage from './pages/WatchlistPage';
import AIPage from './pages/AIPage';
import ProfilePage from './pages/ProfilePage';
import SearchPage from './pages/SearchPage';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';

export default function App() {
  const [user, setUser] = useState(null);
  const [page, setPage] = useState('dashboard');
  const [watchlist, setWatchlist] = useState([]);
  const [theme, setTheme] = useState('dark');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchActive, setSearchActive] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const handleSearch = (q) => {
    setSearchQuery(q);
    setSearchActive(q.length > 0);
  };

  if (!user) return <AuthPage onLogin={setUser} />;

  const renderPage = () => {
    if (searchActive && searchQuery) {
      return <SearchPage query={searchQuery} watchlist={watchlist} setWatchlist={setWatchlist} />;
    }
    switch (page) {
      case 'dashboard': return <Dashboard watchlist={watchlist} setWatchlist={setWatchlist} />;
      case 'news': return <NewsPage />;
      case 'watchlist': return <WatchlistPage watchlist={watchlist} setWatchlist={setWatchlist} />;
      case 'ai': return <AIPage user={user} watchlist={watchlist} />;
      case 'profile': return <ProfilePage user={user} theme={theme} setTheme={setTheme} watchlist={watchlist} />;
      default: return <Dashboard watchlist={watchlist} setWatchlist={setWatchlist} />;
    }
  };

  return (
    <div className="app-shell">
      <Sidebar
        page={page}
        setPage={setPage}
        watchlist={watchlist}
        user={user}
        onLogout={() => setUser(null)}
        searchActive={searchActive}
        setSearchActive={setSearchActive}
        setSearchQuery={setSearchQuery}
      />
      <main className="main-content">
        <Topbar
          page={page}
          searchQuery={searchQuery}
          searchActive={searchActive}
          onSearch={handleSearch}
          theme={theme}
          setTheme={setTheme}
          user={user}
          setPage={setPage}
        />
        {renderPage()}
      </main>
    </div>
  );
}
