import pool from '../config/db.js';

// GET /api/stocks
const getAllStocks = async (req, res) => {
  try {
    const { sector, limit = 100, offset = 0 } = req.query;

    let query = `
      SELECT s.stock_id, s.symbol, s.name, sec.name AS sector, s.exchange, s.market_cap
      FROM stocks s
      JOIN sectors sec ON sec.sector_id = s.sector_id
    `;
    const params = [];

    if (sector) {
      params.push(sector);
      query += ` WHERE sec.name ILIKE $${params.length}`;
    }

    query += ` ORDER BY s.symbol ASC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await pool.query(query, params);
    res.status(200).json(result.rows);
  } catch (err) {
    console.error('getAllStocks error:', err);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

// GET /api/stocks/search?q=apple
const searchStocks = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 1) {
      return res.status(400).json({ message: 'Search query is required.' });
    }

    const result = await pool.query(
      `SELECT s.stock_id, s.symbol, s.name, sec.name AS sector
       FROM stocks s
       JOIN sectors sec ON sec.sector_id = s.sector_id
       WHERE s.symbol ILIKE $1 OR s.name ILIKE $2
       ORDER BY
         CASE WHEN s.symbol ILIKE $3 THEN 0 ELSE 1 END,
         s.symbol ASC
       LIMIT 20`,
      [`${q}%`, `%${q}%`, `${q}%`]
    );

    res.status(200).json(result.rows);
  } catch (err) {
    console.error('searchStocks error:', err);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

// GET /api/stocks/:symbol
const getStockBySymbol = async (req, res) => {
  try {
    const symbol = req.params.symbol.toUpperCase();

    const stockResult = await pool.query(
      `SELECT s.*, sec.name AS sector
       FROM stocks s
       JOIN sectors sec ON sec.sector_id = s.sector_id
       WHERE s.symbol = $1`,
      [symbol]
    );

    if (stockResult.rows.length === 0) {
      return res.status(404).json({ message: 'Stock not found.' });
    }

    const stock = stockResult.rows[0];

    // Latest snapshot
    const snapshotResult = await pool.query(
      `SELECT * FROM stock_price_snapshot
       WHERE stock_id = $1
       ORDER BY trade_date DESC
       LIMIT 1`,
      [stock.stock_id]
    );

    res.status(200).json({
      ...stock,
      snapshot: snapshotResult.rows[0] || null,
    });
  } catch (err) {
    console.error('getStockBySymbol error:', err);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

// GET /api/stocks/:symbol/history?range=1y
const getStockHistory = async (req, res) => {
  try {
    const symbol = req.params.symbol.toUpperCase();
    const { range = '1y' } = req.query;

    const rangeMap = {
      '1m': '1 month',
      '3m': '3 months',
      '6m': '6 months',
      '1y': '1 year',
      '3y': '3 years',
      '5y': '5 years',
      '10y': '10 years',
      all: '50 years',
    };

    const interval = rangeMap[range] || '1 year';

    const stockResult = await pool.query('SELECT stock_id FROM stocks WHERE symbol = $1', [symbol]);
    if (stockResult.rows.length === 0) {
      return res.status(404).json({ message: 'Stock not found.' });
    }

    const { stock_id } = stockResult.rows[0];

    const result = await pool.query(
      `SELECT price_date, open_price, high, low, close_price, volume, adjusted_close, price_change, change_pct
       FROM stock_price_history
       WHERE stock_id = $1
         AND price_date >= NOW() - INTERVAL '${interval}'
       ORDER BY price_date ASC`,
      [stock_id]
    );

    res.status(200).json(result.rows);
  } catch (err) {
    console.error('getStockHistory error:', err);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

// GET /api/stocks/:symbol/fundamentals
const getStockFundamentals = async (req, res) => {
  try {
    const symbol = req.params.symbol.toUpperCase();

    const result = await pool.query(
      `SELECT f.*
       FROM fundamentals f
       JOIN stocks s ON s.stock_id = f.stock_id
       WHERE s.symbol = $1
       ORDER BY f.recorded_at DESC
       LIMIT 1`,
      [symbol]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'No fundamental data found for this stock.' });
    }

    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error('getStockFundamentals error:', err);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

// GET /api/stocks/:symbol/technicals
const getStockTechnicals = async (req, res) => {
  try {
    const symbol = req.params.symbol.toUpperCase();

    const result = await pool.query(
      `SELECT ti.*
       FROM technical_indicators ti
       JOIN stocks s ON s.stock_id = ti.stock_id
       WHERE s.symbol = $1
       ORDER BY ti.record_date DESC
       LIMIT 1`,
      [symbol]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'No technical data found for this stock.' });
    }

    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error('getStockTechnicals error:', err);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

// GET /api/stocks/:symbol/similar?limit=6
const getSimilarStocks = async (req, res) => {
  try {
    const symbol = req.params.symbol.toUpperCase();
    const limit = Math.min(parseInt(req.query.limit) || 6, 20);

    // Get target stock info and recent returns
    const stockResult = await pool.query(
      `SELECT s.stock_id, s.sector_id
       FROM stocks s
       WHERE s.symbol = $1`,
      [symbol]
    );

    if (stockResult.rows.length === 0) {
      return res.status(404).json({ message: 'Stock not found.' });
    }

    const { stock_id: targetId, sector_id: targetSectorId } = stockResult.rows[0];

    // Fetch normalized daily returns for target stock (last 252 trading days ~ 1 year)
    const targetReturns = await pool.query(
      `SELECT price_date, change_pct
       FROM stock_price_history
       WHERE stock_id = $1
         AND change_pct IS NOT NULL
       ORDER BY price_date DESC
       LIMIT 252`,
      [targetId]
    );

    if (targetReturns.rows.length < 30) {
      return res.status(200).json([]);
    }

    const targetDates = targetReturns.rows.map((r) => r.price_date.toISOString().split('T')[0]);
    const targetMap = Object.fromEntries(
      targetReturns.rows.map((r) => [r.price_date.toISOString().split('T')[0], parseFloat(r.change_pct)])
    );

    // Get all other stocks with their returns on the same dates
    const allStocksResult = await pool.query(
      `SELECT s.stock_id, s.symbol, s.name, sec.name AS sector, s.sector_id,
              h.price_date, h.change_pct
       FROM stocks s
       JOIN sectors sec ON sec.sector_id = s.sector_id
       JOIN stock_price_history h ON h.stock_id = s.stock_id
       WHERE s.stock_id != $1
         AND h.price_date = ANY($2::date[])
         AND h.change_pct IS NOT NULL`,
      [targetId, targetDates]
    );

    // Group by stock
    const stockMap = {};
    for (const row of allStocksResult.rows) {
      if (!stockMap[row.stock_id]) {
        stockMap[row.stock_id] = {
          stock_id: row.stock_id,
          symbol: row.symbol,
          name: row.name,
          sector: row.sector,
          sector_id: row.sector_id,
          returns: {},
        };
      }
      stockMap[row.stock_id].returns[row.price_date.toISOString().split('T')[0]] = parseFloat(row.change_pct);
    }

    // Pearson correlation + sector weighting
    const scored = [];
    const targetArr = targetDates.map((d) => targetMap[d]);

    for (const [, stock] of Object.entries(stockMap)) {
      const commonDates = targetDates.filter((d) => stock.returns[d] !== undefined);
      if (commonDates.length < 30) continue;

      const x = commonDates.map((d) => targetMap[d]);
      const y = commonDates.map((d) => stock.returns[d]);

      const n = x.length;
      const meanX = x.reduce((a, b) => a + b, 0) / n;
      const meanY = y.reduce((a, b) => a + b, 0) / n;
      const num = x.reduce((sum, xi, i) => sum + (xi - meanX) * (y[i] - meanY), 0);
      const denX = Math.sqrt(x.reduce((sum, xi) => sum + (xi - meanX) ** 2, 0));
      const denY = Math.sqrt(y.reduce((sum, yi) => sum + (yi - meanY) ** 2, 0));
      if (denX === 0 || denY === 0) continue;

      const pearson = num / (denX * denY);

      // Sector bonus: 0.1 if same sector
      const sectorBonus = stock.sector_id === targetSectorId ? 0.1 : 0;
      const score = Math.min(pearson + sectorBonus, 1.0);

      scored.push({ ...stock, correlation: parseFloat(pearson.toFixed(4)), score: parseFloat(score.toFixed(4)) });
    }

    scored.sort((a, b) => b.score - a.score);
    const top = scored.slice(0, limit);

    // Attach latest prices
    if (top.length > 0) {
      const ids = top.map((s) => s.stock_id);
      const priceResult = await pool.query(
        `SELECT DISTINCT ON (stock_id) stock_id, close_price, change_pct, price_date
         FROM stock_price_history
         WHERE stock_id = ANY($1::int[])
         ORDER BY stock_id, price_date DESC`,
        [ids]
      );
      const priceMap = Object.fromEntries(priceResult.rows.map((r) => [r.stock_id, r]));
      top.forEach((s) => {
        const p = priceMap[s.stock_id];
        s.close_price = p?.close_price || null;
        s.change_pct = p?.change_pct || null;
        delete s.returns;
        delete s.sector_id;
      });
    }

    res.status(200).json(top);
  } catch (err) {
    console.error('getSimilarStocks error:', err);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

// GET /api/stocks/market/movers
const getMarketMovers = async (req, res) => {
  try {
    const [gainers, losers, volume] = await Promise.all([
      pool.query('SELECT * FROM vw_best_performing_stocks'),
      pool.query('SELECT * FROM vw_worst_performing_stocks'),
      pool.query('SELECT * FROM vw_top_stocks_by_volume LIMIT 10'),
    ]);

    res.status(200).json({
      gainers: gainers.rows,
      losers: losers.rows,
      most_active: volume.rows,
    });
  } catch (err) {
    console.error('getMarketMovers error:', err);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

// GET /api/stocks/market/sectors
const getSectorSummary = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM vw_sector_summary');
    res.status(200).json(result.rows);
  } catch (err) {
    console.error('getSectorSummary error:', err);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

export {
  getAllStocks,
  searchStocks,
  getStockBySymbol,
  getStockHistory,
  getStockFundamentals,
  getStockTechnicals,
  getSimilarStocks,
  getMarketMovers,
  getSectorSummary,
};
