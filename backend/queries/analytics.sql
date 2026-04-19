USE stock_pulse;
GO

-- DQL Queries

-- 1. Get stock info with latest price snapshot
SELECT TOP 1
    st.symbol,
    st.name,
    se.name AS sector,
    sp.current_price,
    sp.open_price,
    sp.day_high,
    sp.day_low,
    sp.volume,
    sp.price_change,
    sp.change_pct,
    sp.trade_date
FROM Stocks st
JOIN Sectors se ON se.sector_id = st.sector_id
LEFT JOIN Stock_Price_Snapshot sp ON sp.stock_id = st.stock_id
WHERE st.symbol = 'AAPL'
ORDER BY sp.trade_date DESC;
GO

-- 2. Get price history for a stock
SELECT 
    price_date,
    open_price,
    high,
    low,
    close_price,
    volume,
    adjusted_close
FROM Stock_Price_History
WHERE stock_id = (SELECT stock_id FROM Stocks WHERE symbol = 'AAPL')
ORDER BY price_date ASC;
GO

-- 3. Get all stocks with their sector
SELECT 
    st.stock_id,
    st.symbol,
    st.name,
    se.name AS sector
FROM Stocks st
JOIN Sectors se ON se.sector_id = st.sector_id
ORDER BY st.symbol ASC;
GO

-- 4. Get all stocks in a specific sector
SELECT 
    st.stock_id,
    st.symbol,
    st.name
FROM Stocks st
JOIN Sectors se ON se.sector_id = st.sector_id
WHERE se.name = 'Technology';
GO

-- 5. Get fundamentals for a stock
SELECT TOP 1
    st.symbol,
    st.name,
    f.fiscal_year,
    f.eps_annual,
    f.pe_annual,
    f.roe_pct,
    f.roa_pct,
    f.net_profit_margin_pct,
    f.debt_to_equity,
    f.dividend_yield_pct,
    f.current_ratio
FROM Fundamentals f
JOIN Stocks st ON st.stock_id = f.stock_id
WHERE st.symbol = 'AAPL'
ORDER BY f.recorded_at DESC;
GO

-- 6. Get technical indicators for a stock
SELECT TOP 1
    st.symbol,
    t.record_date,
    t.rsi,
    t.rsi_signal,
    t.macd,
    t.macd_signal,
    t.sma50,
    t.sma50_signal,
    t.bollinger_upper,
    t.bollinger_lower,
    t.adx
FROM Technical_Indicators t
JOIN Stocks st ON st.stock_id = t.stock_id
WHERE st.symbol = 'AAPL'
ORDER BY t.record_date DESC;
GO

-- 7. Get a user's watchlist
SELECT 
    st.symbol,
    st.name,
    se.name AS sector,
    w.added_at,
    w.alert_price,
    w.notes
FROM Watchlist w
JOIN Stocks st ON st.stock_id = w.stock_id
JOIN Sectors se ON se.sector_id = st.sector_id
WHERE w.user_id = 1;
GO

-- Views

-- View 1: Top 5 stocks by volume
CREATE VIEW vw_Top5_Stocks_By_Volume AS
SELECT TOP 5
    st.symbol,
    st.name,
    se.name AS sector,
    SUM(sph.volume) AS total_volume
FROM Stock_Price_History sph
JOIN Stocks st ON st.stock_id = sph.stock_id
JOIN Sectors se ON se.sector_id = st.sector_id
GROUP BY st.symbol, st.name, se.name
ORDER BY total_volume DESC;
GO

-- View 2: Best performing stocks by % price change
CREATE VIEW vw_Best_Performing_Stocks AS
SELECT TOP 10
    st.symbol,
    st.name,
    se.name AS sector,
    sph.close_price - sph.open_price AS price_change,
    ROUND(((sph.close_price - sph.open_price) / sph.open_price) * 100, 2) AS change_pct
FROM Stock_Price_History sph
JOIN Stocks st ON st.stock_id = sph.stock_id
JOIN Sectors se ON se.sector_id = st.sector_id
WHERE sph.price_date = (SELECT MAX(price_date) FROM Stock_Price_History)
ORDER BY change_pct DESC;
GO

-- View 3: Sector summary
CREATE VIEW vw_Sector_Summary AS
SELECT 
    se.name AS sector,
    COUNT(st.stock_id) AS total_stocks,
    AVG(sph.close_price) AS avg_close_price,
    SUM(sph.volume) AS total_volume
FROM Sectors se
JOIN Stocks st ON st.sector_id = se.sector_id
JOIN Stock_Price_History sph ON sph.stock_id = st.stock_id
WHERE sph.price_date = (SELECT MAX(price_date) FROM Stock_Price_History)
GROUP BY se.name;
GO