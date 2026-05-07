import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Sun, Moon, Search, LogOut, User, Bookmark, TrendingUp, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useStockSearch } from '../../hooks/useData';
import styles from './Navbar.module.css';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { results, loading: searchLoading } = useStockSearch(query);
  const searchRef = useRef(null);
  const menuRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setSearchOpen(false);
        setQuery('');
      }
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = (symbol) => {
    navigate(`/stocks/${symbol}`);
    setQuery('');
    setSearchOpen(false);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <nav className={styles.nav}>
      <div className={styles.inner}>
        {/* Logo */}
        <Link to="/" className={styles.logo}>
          <TrendingUp size={22} strokeWidth={2.5} />
          <span>Stock<em>Pulse</em></span>
        </Link>

        {/* Center: Search */}
        <div className={styles.searchWrap} ref={searchRef}>
          <div className={`${styles.searchBox} ${searchOpen ? styles.searchActive : ''}`}>
            <Search size={15} className={styles.searchIcon} />
            <input
              type="text"
              placeholder="Search stocks…"
              value={query}
              onFocus={() => setSearchOpen(true)}
              onChange={(e) => { setQuery(e.target.value); setSearchOpen(true); }}
              className={styles.searchInput}
            />
            {query && (
              <button onClick={() => { setQuery(''); setSearchOpen(false); }} className={styles.clearBtn}>
                <X size={14} />
              </button>
            )}
          </div>

          {searchOpen && (query.length > 0) && (
            <div className={styles.searchDropdown}>
              {searchLoading ? (
                <div className={styles.searchHint}>Searching…</div>
              ) : results.length === 0 ? (
                <div className={styles.searchHint}>No results for "{query}"</div>
              ) : (
                results.map((s) => (
                  <button key={s.stock_id} className={styles.searchResult} onClick={() => handleSelect(s.symbol)}>
                    <span className={styles.resultSymbol}>{s.symbol}</span>
                    <span className={styles.resultName}>{s.name}</span>
                    <span className={styles.resultSector}>{s.sector}</span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Right: controls */}
        <div className={styles.controls}>
          <button onClick={toggleTheme} className={styles.iconBtn} title="Toggle theme">
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          {user ? (
            <div className={styles.userMenu} ref={menuRef}>
              <button className={styles.avatarBtn} onClick={() => setMenuOpen((v) => !v)}>
                <div className={styles.avatar}>
                  {user.username?.[0]?.toUpperCase() || 'U'}
                </div>
              </button>

              {menuOpen && (
                <div className={styles.dropdown}>
                  <div className={styles.dropdownHeader}>
                    <span className={styles.dropdownName}>{user.full_name || user.username}</span>
                    <span className={styles.dropdownEmail}>{user.email}</span>
                  </div>
                  <div className={styles.dropdownDivider} />
                  <Link to="/watchlist" className={styles.dropdownItem} onClick={() => setMenuOpen(false)}>
                    <Bookmark size={15} /> Watchlist
                  </Link>
                  <Link to="/profile" className={styles.dropdownItem} onClick={() => setMenuOpen(false)}>
                    <User size={15} /> Profile
                  </Link>
                  <div className={styles.dropdownDivider} />
                  <button className={`${styles.dropdownItem} ${styles.dropdownLogout}`} onClick={handleLogout}>
                    <LogOut size={15} /> Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className={styles.authLinks}>
              <Link to="/login" className="btn btn-ghost btn-sm">Log in</Link>
              <Link to="/register" className="btn btn-primary btn-sm">Sign up</Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
