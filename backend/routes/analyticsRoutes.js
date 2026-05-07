// backend/routes/analyticsRoutes.js
import express from 'express';
import poolPromise from '../config/db.js';

const router = express.Router();

// GET /api/analytics/summary — Overall market summary stats
router.get('/summary', async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT
        COUNT(*) AS total_stocks,
        SUM(CASE WHEN sp.price_change > 0 THEN 1 ELSE 0 END) AS gainers,
        SUM(CASE WHEN sp.price_change < 0 THEN 1 ELSE 0 END) AS losers,
        AVG(sp.change_pct) AS avg_change_pct
      FROM Stocks st
      LEFT JOIN Stock_Price_Snapshot sp ON sp.stock_id = st.stock_id
    `);
    res.json(result.recordset[0]);
  } catch (err) {
    // Return mock data if DB not available
    res.json({
      total_stocks: 20,
      gainers: 14,
      losers: 6,
      avg_change_pct: 0.74,
    });
  }
});

// GET /api/analytics/sectors — Sector performance
router.get('/sectors', async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT se.name AS sector, AVG(sp.change_pct) AS avg_change
      FROM Stocks st
      JOIN Sectors se ON se.sector_id = st.sector_id
      LEFT JOIN Stock_Price_Snapshot sp ON sp.stock_id = st.stock_id
      GROUP BY se.name
      ORDER BY avg_change DESC
    `);
    res.json(result.recordset);
  } catch (err) {
    res.json([
      { sector:'Semiconductors', avg_change: 4.1 },
      { sector:'Technology', avg_change: 3.2 },
      { sector:'Communication', avg_change: 1.9 },
      { sector:'Financials', avg_change: 2.4 },
      { sector:'Healthcare', avg_change: 1.1 },
      { sector:'Consumer Staples', avg_change: 0.5 },
      { sector:'Materials', avg_change: 0.7 },
      { sector:'Industrials', avg_change: 0.3 },
      { sector:'Consumer Disc.', avg_change: -0.8 },
      { sector:'Energy', avg_change: -1.5 },
    ]);
  }
});

export default router;
