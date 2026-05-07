import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Trash2, Edit3, Check, X, Bell, TrendingUp, TrendingDown, Bookmark } from 'lucide-react';
import { useWatchlist } from '../hooks/useData';
import { formatPrice, formatPct } from '../lib/format';
import styles from './Watchlist.module.css';

function WatchlistRow({ item, onRemove, onUpdate }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ alert_price: item.alert_price || '', notes: item.notes || '' });
  const [saving, setSaving] = useState(false);

  const isPositive = parseFloat(item.change_pct) >= 0;

  const handleSave = async () => {
    setSaving(true);
    await onUpdate(item.watch_id, {
      alert_price: form.alert_price ? parseFloat(form.alert_price) : null,
      notes: form.notes || null,
    });
    setSaving(false);
    setEditing(false);
  };

  return (
    <div className={styles.row}>
      <div className={styles.rowMain}>
        <div className={styles.stockCol}>
          <Link to={`/stocks/${item.symbol}`} className={styles.symbol}>{item.symbol}</Link>
          <span className={styles.name}>{item.name}</span>
          <span className={styles.sector}>{item.sector}</span>
        </div>

        <div className={styles.priceCol}>
          <span className={styles.price}>{formatPrice(item.close_price)}</span>
          <span className={`${styles.change} ${isPositive ? 'positive' : 'negative'}`}>
            {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {formatPct(item.change_pct)}
          </span>
        </div>

        <div className={styles.alertCol}>
          {item.alert_price ? (
            <span className={styles.alertPrice}>
              <Bell size={12} /> Alert: {formatPrice(item.alert_price)}
            </span>
          ) : (
            <span className={styles.noAlert}>No alert</span>
          )}
        </div>

        <div className={styles.actions}>
          <button className="btn btn-ghost btn-sm" onClick={() => setEditing((v) => !v)} title="Edit">
            <Edit3 size={14} />
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => onRemove(item.watch_id)} style={{ color: 'var(--red)' }} title="Remove">
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Notes */}
      {item.notes && !editing && (
        <div className={styles.notes}>{item.notes}</div>
      )}

      {/* Edit form */}
      {editing && (
        <div className={styles.editForm}>
          <div className={styles.editRow}>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Alert price</label>
              <input
                type="number" step="0.01" value={form.alert_price}
                onChange={(e) => setForm((f) => ({ ...f, alert_price: e.target.value }))}
                className="form-input" placeholder="e.g. 150.00"
              />
            </div>
            <div className="form-group" style={{ flex: 2 }}>
              <label className="form-label">Notes</label>
              <input
                type="text" value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                className="form-input" placeholder="Add a note..."
              />
            </div>
          </div>
          <div className={styles.editActions}>
            <button onClick={handleSave} disabled={saving} className="btn btn-primary btn-sm">
              {saving ? <span className="spinner" style={{ width: 14, height: 14 }} /> : <Check size={14} />}
              Save
            </button>
            <button onClick={() => setEditing(false)} className="btn btn-ghost btn-sm">
              <X size={14} /> Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function WatchlistPage() {
  const { data, loading, error, remove, update } = useWatchlist();

  if (loading) {
    return (
      <div className="page-content">
        <div className="container">
          <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
            <div className="spinner" style={{ width: 36, height: 36 }} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-content">
      <div className="container">
        <div className={styles.header}>
          <div>
            <h1 className={styles.pageTitle}>My Watchlist</h1>
            <p className={styles.pageSubtitle}>{data?.length || 0} stock{data?.length !== 1 ? 's' : ''} tracked</p>
          </div>
          <Link to="/stocks" className="btn btn-secondary btn-sm">Browse stocks →</Link>
        </div>

        {error && <div className="card" style={{ color: 'var(--red)', padding: 16 }}>{error}</div>}

        {data?.length === 0 ? (
          <div className={styles.empty}>
            <Bookmark size={48} strokeWidth={1} />
            <h3>Nothing here yet</h3>
            <p>Add stocks to your watchlist while browsing</p>
            <Link to="/stocks" className="btn btn-primary">Browse stocks</Link>
          </div>
        ) : (
          <div className={`card ${styles.list}`}>
            {data.map((item) => (
              <WatchlistRow key={item.watch_id} item={item} onRemove={remove} onUpdate={update} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
