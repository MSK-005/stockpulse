import poolPromise from '../config/db.js';
import sql from 'mssql';

const getWatchlist = async (req, res) => {
  try {
    const poolPromiseResult = await poolPromise;
    const result = await poolPromiseResult
      .request()
      .input('user_id', sql.Int, req.params.user_id)
      .query(`SELECT w.watch_id, st.symbol, st.name, se.name AS sector, w.added_at, w.alert_price, w.notes
                    FROM Watchlist w
                    JOIN Stocks st ON st.stock_id = w.stock_id
                    JOIN Sectors se ON se.sector_id = st.sector_id
                    WHERE w.user_id = @user_id`);
    res.status(200).json(result.recordset);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const addToWatchlist = async (req, res) => {
  try {
    const { user_id, stock_id, alert_price, notes } = req.body;
    const poolPromiseResult = await poolPromise;
    await poolPromiseResult
      .request()
      .input('user_id', sql.Int, user_id)
      .input('stock_id', sql.Int, stock_id)
      .input('alert_price', sql.Decimal, alert_price)
      .input('notes', sql.NVarChar, notes)
      .query(`INSERT INTO Watchlist (user_id, stock_id, alert_price, notes)
                    VALUES (@user_id, @stock_id, @alert_price, @notes)`);
    res.status(201).json({ message: "Stock added to watchlist successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const removeFromWatchlist = async (req, res) => {
  try {
    const poolPromiseResult = await poolPromise;
    await poolPromiseResult
      .request()
      .input('watch_id', sql.Int, req.params.watch_id)
      .query(`DELETE FROM Watchlist WHERE watch_id = @watch_id`);
    res
      .status(200)
      .json({ message: 'Stock removed from watchlist successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export {
    getWatchlist,
    addToWatchlist,
    removeFromWatchlist
};
