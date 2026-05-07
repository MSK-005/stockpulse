CREATE DATABASE stock_pulse;
GO
USE stock_pulse;
GO

CREATE TABLE Users (
    user_id INT IDENTITY(1,1) PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100),
    phone_number VARCHAR(20),
    preferred_currency VARCHAR(3) DEFAULT 'USD',
    created_at DATETIME DEFAULT GETDATE(),
    updated_at DATETIME DEFAULT GETDATE(),
    last_login DATETIME NULL
);

CREATE TABLE Sectors (
    sector_id INT IDENTITY(1,1) PRIMARY KEY,
    name VARCHAR(80) UNIQUE NOT NULL,
    description NVARCHAR(MAX),
    total_market_cap BIGINT,
    avg_pe DECIMAL(10,2),
    avg_div_yield DECIMAL(6,2),
    updated_at DATETIME DEFAULT GETDATE()
);

CREATE TABLE Stocks (
    stock_id INT IDENTITY(1,1) PRIMARY KEY,
    symbol VARCHAR(10) UNIQUE NOT NULL,
    name VARCHAR(150) NOT NULL,
    sector_id INT,
    company_background NVARCHAR(MAX),
    market_cap BIGINT,
    total_shares BIGINT,
    free_float BIGINT,
    free_float_pct DECIMAL(5,2),
    chairperson VARCHAR(100),
    ceo VARCHAR(100),
    company_secretary VARCHAR(100),
    address NVARCHAR(MAX),
    website VARCHAR(150),
    registrar NVARCHAR(MAX),
    auditor NVARCHAR(MAX),
    isin_code VARCHAR(20),
    listing_date DATE,
    exchange VARCHAR(20) DEFAULT 'NYSE',
    last_profile_update DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (sector_id) REFERENCES Sectors(sector_id)
);

CREATE TABLE Stock_Price_Snapshot (
    snapshot_id BIGINT IDENTITY(1,1) PRIMARY KEY,
    stock_id INT NOT NULL,
    trade_date DATE NOT NULL,
    current_price DECIMAL(10,2),
    open_price DECIMAL(10,2),
    day_high DECIMAL(10,2),
    day_low DECIMAL(10,2),
    previous_close DECIMAL(10,2),
    price_change DECIMAL(10,2),
    change_pct DECIMAL(6,2),
    volume BIGINT,
    value_traded DECIMAL(15,2),
    week52_low DECIMAL(10,2),
    week52_high DECIMAL(10,2),
    lower_lock DECIMAL(10,2),
    upper_lock DECIMAL(10,2),
    bid_price DECIMAL(10,2),
    ask_price DECIMAL(10,2),
    bid_volume BIGINT,
    ask_volume BIGINT,
    turnover_rate DECIMAL(6,2),
    captured_at DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (stock_id) REFERENCES Stocks(stock_id)
);

CREATE TABLE Stock_Price_History (
    history_id BIGINT IDENTITY(1,1) PRIMARY KEY,
    stock_id INT NOT NULL,
    price_date DATE NOT NULL,
    open_price DECIMAL(10,2),
    high DECIMAL(10,2),
    low DECIMAL(10,2),
    close_price DECIMAL(10,2),
    volume BIGINT,
    adjusted_close DECIMAL(10,2),
    price_change DECIMAL(10,2),
    change_pct DECIMAL(6,2),
    FOREIGN KEY (stock_id) REFERENCES Stocks(stock_id)
);

CREATE TABLE Technical_Indicators (
    tech_id BIGINT IDENTITY(1,1) PRIMARY KEY,
    stock_id INT NOT NULL,
    record_date DATE NOT NULL,
    rsi DECIMAL(5,2),
    rsi_signal VARCHAR(20),
    stoch DECIMAL(5,2),
    stoch_signal VARCHAR(20),
    macd DECIMAL(6,2),
    macd_signal VARCHAR(20),
    pivot_r3 DECIMAL(6,2),
    pivot_r2 DECIMAL(6,2),
    pivot_r1 DECIMAL(6,2),
    pivot_pp DECIMAL(6,2),
    pivot_s1 DECIMAL(6,2),
    pivot_s2 DECIMAL(6,2),
    pivot_s3 DECIMAL(6,2),
    sma5 DECIMAL(6,2),
    sma5_signal VARCHAR(20),
    sma15 DECIMAL(6,2),
    sma15_signal VARCHAR(20),
    sma30 DECIMAL(6,2),
    sma30_signal VARCHAR(20),
    sma50 DECIMAL(6,2),
    sma50_signal VARCHAR(20),
    sma100 DECIMAL(6,2),
    sma100_signal VARCHAR(20),
    bollinger_upper DECIMAL(6,2),
    bollinger_lower DECIMAL(6,2),
    adx DECIMAL(5,2),
    captured_at DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (stock_id) REFERENCES Stocks(stock_id)
);

CREATE TABLE Fundamentals (
    fund_id BIGINT IDENTITY(1,1) PRIMARY KEY,
    stock_id INT NOT NULL,
    fiscal_year VARCHAR(9),
    eps_annual DECIMAL(10,2),
    eps_last_quarter DECIMAL(10,2),
    eps_ytd DECIMAL(10,2),
    eps_expected DECIMAL(10,2),
    pe_annual DECIMAL(10,2),
    pe_expected DECIMAL(10,2),
    exp_earning_growth_pct DECIMAL(6,2),
    peg_ratio DECIMAL(6,2),
    forward_peg_ratio DECIMAL(6,2),
    gross_profit_margin_pct DECIMAL(6,2),
    operating_profit_margin_pct DECIMAL(6,2),
    net_profit_margin_pct DECIMAL(6,2),
    ebitda_margin_pct DECIMAL(6,2),
    roe_pct DECIMAL(6,2),
    roa_pct DECIMAL(6,2),
    roce_pct DECIMAL(6,2),
    dps_annual DECIMAL(8,2),
    dps_last_quarter DECIMAL(8,2),
    dps_last_interim DECIMAL(8,2),
    dividend_yield_pct DECIMAL(6,2),
    dividend_cover DECIMAL(6,2),
    debt_to_equity DECIMAL(6,2),
    current_ratio DECIMAL(6,2),
    recorded_at DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (stock_id) REFERENCES Stocks(stock_id)
);

CREATE TABLE Watchlist (
    watch_id BIGINT IDENTITY(1,1) PRIMARY KEY,
    user_id INT NOT NULL,
    stock_id INT NOT NULL,
    added_at DATETIME DEFAULT GETDATE(),
    notes NVARCHAR(MAX),
    alert_price DECIMAL(10,2),
    FOREIGN KEY (user_id) REFERENCES Users(user_id),
    FOREIGN KEY (stock_id) REFERENCES Stocks(stock_id)
);


-- Kaggle dataset contains columns that cannot be directly imported into our tables above. 
-- We use a staging table to first import all the data from the dataaset,
-- and then feed the data into other tables. Table's name is Input_Data.

-- DROP TABLE Input_Data;

INSERT INTO Sectors (name)
SELECT DISTINCT Sector
FROM Input_Data
WHERE Sector IS NOT NULL;

INSERT INTO Stocks (symbol, name, sector_id, exchange)
SELECT DISTINCT 
    i.Ticker,
    i.Company_Name,
    s.sector_id,
    'NYSE'
FROM Input_Data i
JOIN Sectors s ON s.name = i.Sector;

INSERT INTO Stock_Price_History 
    (stock_id, price_date, open_price, high, low, close_price, volume, adjusted_close)
SELECT 
    st.stock_id,
    CAST(i.Date AS DATE),
    i.[Open], i.High, i.Low, i.[Close],
    i.Volume, i.Adj_Close
FROM Input_Data i
JOIN Stocks st ON st.symbol = i.Ticker;

SELECT COUNT(*) FROM Sectors;
SELECT COUNT(*) FROM Stocks;
SELECT COUNT(*) FROM Stock_Price_History;