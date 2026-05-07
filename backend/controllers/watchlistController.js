import pool from '../config/db.js';

// GET /api/watchlist  (reads user_id from JWT)
const getWatchlist = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT w.watch_id, s.stock_id, s.symbol, s.name, sec.name AS sector,
              w.added_at, w.alert_price, w.notes,
              h.close_price, h.change_pct, h.price_date
       FROM watchlist w
       JOIN stocks s ON s.stock_id = w.stock_id
       JOIN sectors sec ON sec.sector_id = s.sector_id
       LEFT JOIN LATERAL (
           SELECT close_price, change_pct, price_date
           FROM stock_price_history
           WHERE stock_id = w.stock_id
           ORDER BY price_date DESC
           LIMIT 1
       ) h ON TRUE
       WHERE w.user_id = $1
       ORDER BY w.added_at DESC`,
      [req.user.user_id]
    );
    res.status(200).json(result.rows);
  } catch (err) {
    console.error('getWatchlist error:', err);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

// POST /api/watchlist
const addToWatchlist = async (req, res) => {
  try {
    const { stock_id, alert_price, notes } = req.body;
    const user_id = req.user.user_id;

    // Verify stock exists
    const stockCheck = await pool.query('SELECT stock_id FROM stocks WHERE stock_id = $1', [stock_id]);
    if (stockCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Stock not found.' });
    }

    const result = await pool.query(
      `INSERT INTO watchlist (user_id, stock_id, alert_price, notes)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, stock_id) DO NOTHING
       RETURNING watch_id`,
      [user_id, stock_id, alert_price || null, notes || null]
    );

    if (result.rows.length === 0) {
      return res.status(409).json({ message: 'Stock is already in your watchlist.' });
    }

    res.status(201).json({ message: 'Stock added to watchlist.', watch_id: result.rows[0].watch_id });
  } catch (err) {
    console.error('addToWatchlist error:', err);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

// PUT /api/watchlist/:watch_id
const updateWatchlistEntry = async (req, res) => {
  try {
    const { alert_price, notes } = req.body;

    // Verify ownership
    const check = await pool.query(
      'SELECT watch_id FROM watchlist WHERE watch_id = $1 AND user_id = $2',
      [req.params.watch_id, req.user.user_id]
    );
    if (check.rows.length === 0) {
      return res.status(404).json({ message: 'Watchlist entry not found.' });
    }

    await pool.query(
      `UPDATE watchlist
       SET alert_price = COALESCE($1, alert_price),
           notes = COALESCE($2, notes)
       WHERE watch_id = $3`,
      [alert_price, notes, req.params.watch_id]
    );

    res.status(200).json({ message: 'Watchlist entry updated.' });
  } catch (err) {
    console.error('updateWatchlistEntry error:', err);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

// DELETE /api/watchlist/:watch_id
const removeFromWatchlist = async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM watchlist WHERE watch_id = $1 AND user_id = $2 RETURNING watch_id',
      [req.params.watch_id, req.user.user_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Watchlist entry not found.' });
    }

    res.status(200).json({ message: 'Stock removed from watchlist.' });
  } catch (err) {
    console.error('removeFromWatchlist error:', err);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

export { getWatchlist, addToWatchlist, updateWatchlistEntry, removeFromWatchlist };
