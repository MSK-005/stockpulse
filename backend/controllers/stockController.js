import poolPromise from '../config/db.js';
import sql from 'mssql';

const getStock = async (req, res) => {
    try {
    const poolPromiseResult = await poolPromise;
    const result = await poolPromiseResult
      .request()
      .input('name', sql.VarChar, `%${req.params.name}%`)
      .query(`SELECT symbol
        FROM Stocks
        WHERE name LIKE @name;`);
    res.status(200).json(result.recordset);
    } catch (err) {
    res.status(500).json({ message: err.message });
    }
}

const getAllStocks = async (req, res) => {
    try {
        const poolPromiseResult = await poolPromise;
        const result = await poolPromiseResult
            .request()
            .query(`SELECT st.stock_id, st.symbol, st.name, se.name AS sector
                FROM Stocks st
                JOIN Sectors se ON se.sector_id = st.sector_id
                ORDER BY st.symbol ASC`);
        res.status(200).json(result.recordset);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
}

const getStockBySymbol = async (req, res) => {
    try {
        const poolPromiseResult = await poolPromise;
        const result = await poolPromiseResult
            .request()
            .input('symbol', sql.VarChar, `${req.params.symbol.toUpperCase()}`)
            .query(`SELECT st.stock_id, st.symbol, st.name, se.name AS sector
                FROM Stocks st
                JOIN Sectors se ON se.sector_id = st.sector_id
                WHERE st.symbol = @symbol`);
        res.status(200).json(result.recordset);
    } catch (err) {
        res.send(500).json({ message: err.message });
    }
}

export { 
    getStock,
    getAllStocks,
    getStockBySymbol
};