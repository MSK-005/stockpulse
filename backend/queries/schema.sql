-- StockPulse PostgreSQL Schema
-- Run this in your Supabase SQL Editor

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- USERS
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
    user_id       SERIAL PRIMARY KEY,
    username      VARCHAR(50)  UNIQUE NOT NULL,
    email         VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name     VARCHAR(100),
    phone_number  VARCHAR(20),
    preferred_currency VARCHAR(3) DEFAULT 'USD',
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW(),
    last_login    TIMESTAMPTZ
);

-- ============================================================
-- PASSWORD RESET TOKENS
-- ============================================================
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    token_id   SERIAL PRIMARY KEY,
    user_id    INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used       BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SECTORS
-- ============================================================
CREATE TABLE IF NOT EXISTS sectors (
    sector_id        SERIAL PRIMARY KEY,
    name             VARCHAR(80) UNIQUE NOT NULL,
    description      TEXT,
    total_market_cap BIGINT,
    avg_pe           DECIMAL(10,2),
    avg_div_yield    DECIMAL(6,2),
    updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- STOCKS
-- ============================================================
CREATE TABLE IF NOT EXISTS stocks (
    stock_id            SERIAL PRIMARY KEY,
    symbol              VARCHAR(10)  UNIQUE NOT NULL,
    name                VARCHAR(150) NOT NULL,
    sector_id           INT REFERENCES sectors(sector_id),
    company_background  TEXT,
    market_cap          BIGINT,
    total_shares        BIGINT,
    free_float          BIGINT,
    free_float_pct      DECIMAL(5,2),
    chairperson         VARCHAR(100),
    ceo                 VARCHAR(100),
    company_secretary   VARCHAR(100),
    address             TEXT,
    website             VARCHAR(150),
    registrar           TEXT,
    auditor             TEXT,
    isin_code           VARCHAR(20),
    listing_date        DATE,
    exchange            VARCHAR(20) DEFAULT 'NASDAQ',
    last_profile_update TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- STOCK PRICE SNAPSHOT (latest/daily live data)
-- ============================================================
CREATE TABLE IF NOT EXISTS stock_price_snapshot (
    snapshot_id    BIGSERIAL PRIMARY KEY,
    stock_id       INT NOT NULL REFERENCES stocks(stock_id) ON DELETE CASCADE,
    trade_date     DATE NOT NULL,
    current_price  DECIMAL(10,2),
    open_price     DECIMAL(10,2),
    day_high       DECIMAL(10,2),
    day_low        DECIMAL(10,2),
    previous_close DECIMAL(10,2),
    price_change   DECIMAL(10,2),
    change_pct     DECIMAL(6,2),
    volume         BIGINT,
    value_traded   DECIMAL(15,2),
    week52_low     DECIMAL(10,2),
    week52_high    DECIMAL(10,2),
    bid_price      DECIMAL(10,2),
    ask_price      DECIMAL(10,2),
    captured_at    TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(stock_id, trade_date)
);

-- ============================================================
-- STOCK PRICE HISTORY (OHLCV time-series)
-- ============================================================
CREATE TABLE IF NOT EXISTS stock_price_history (
    history_id     BIGSERIAL PRIMARY KEY,
    stock_id       INT NOT NULL REFERENCES stocks(stock_id) ON DELETE CASCADE,
    price_date     DATE NOT NULL,
    open_price     DECIMAL(10,2),
    high           DECIMAL(10,2),
    low            DECIMAL(10,2),
    close_price    DECIMAL(10,2),
    volume         BIGINT,
    adjusted_close DECIMAL(10,2),
    price_change   DECIMAL(10,2),
    change_pct     DECIMAL(6,2),
    UNIQUE(stock_id, price_date)
);

CREATE INDEX IF NOT EXISTS idx_price_history_stock_date
    ON stock_price_history(stock_id, price_date DESC);

-- ============================================================
-- TECHNICAL INDICATORS
-- ============================================================
CREATE TABLE IF NOT EXISTS technical_indicators (
    tech_id          BIGSERIAL PRIMARY KEY,
    stock_id         INT NOT NULL REFERENCES stocks(stock_id) ON DELETE CASCADE,
    record_date      DATE NOT NULL,
    rsi              DECIMAL(5,2),
    rsi_signal       VARCHAR(20),
    stoch            DECIMAL(5,2),
    stoch_signal     VARCHAR(20),
    macd             DECIMAL(10,4),
    macd_signal      VARCHAR(20),
    pivot_r3         DECIMAL(10,2),
    pivot_r2         DECIMAL(10,2),
    pivot_r1         DECIMAL(10,2),
    pivot_pp         DECIMAL(10,2),
    pivot_s1         DECIMAL(10,2),
    pivot_s2         DECIMAL(10,2),
    pivot_s3         DECIMAL(10,2),
    sma5             DECIMAL(10,2),
    sma5_signal      VARCHAR(20),
    sma15            DECIMAL(10,2),
    sma15_signal     VARCHAR(20),
    sma30            DECIMAL(10,2),
    sma30_signal     VARCHAR(20),
    sma50            DECIMAL(10,2),
    sma50_signal     VARCHAR(20),
    sma100           DECIMAL(10,2),
    sma100_signal    VARCHAR(20),
    bollinger_upper  DECIMAL(10,2),
    bollinger_lower  DECIMAL(10,2),
    adx              DECIMAL(5,2),
    captured_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(stock_id, record_date)
);

-- ============================================================
-- FUNDAMENTALS
-- ============================================================
CREATE TABLE IF NOT EXISTS fundamentals (
    fund_id                    BIGSERIAL PRIMARY KEY,
    stock_id                   INT NOT NULL REFERENCES stocks(stock_id) ON DELETE CASCADE,
    fiscal_year                VARCHAR(9),
    eps_annual                 DECIMAL(10,2),
    eps_last_quarter           DECIMAL(10,2),
    eps_ytd                    DECIMAL(10,2),
    eps_expected               DECIMAL(10,2),
    pe_annual                  DECIMAL(10,2),
    pe_expected                DECIMAL(10,2),
    exp_earning_growth_pct     DECIMAL(6,2),
    peg_ratio                  DECIMAL(6,2),
    forward_peg_ratio          DECIMAL(6,2),
    gross_profit_margin_pct    DECIMAL(6,2),
    operating_profit_margin_pct DECIMAL(6,2),
    net_profit_margin_pct      DECIMAL(6,2),
    ebitda_margin_pct          DECIMAL(6,2),
    roe_pct                    DECIMAL(6,2),
    roa_pct                    DECIMAL(6,2),
    roce_pct                   DECIMAL(6,2),
    dps_annual                 DECIMAL(8,2),
    dps_last_quarter           DECIMAL(8,2),
    dividend_yield_pct         DECIMAL(6,2),
    dividend_cover             DECIMAL(6,2),
    debt_to_equity             DECIMAL(6,2),
    current_ratio              DECIMAL(6,2),
    recorded_at                TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(stock_id, fiscal_year)
);

-- ============================================================
-- WATCHLIST
-- ============================================================
CREATE TABLE IF NOT EXISTS watchlist (
    watch_id   BIGSERIAL PRIMARY KEY,
    user_id    INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    stock_id   INT NOT NULL REFERENCES stocks(stock_id) ON DELETE CASCADE,
    added_at   TIMESTAMPTZ DEFAULT NOW(),
    notes      TEXT,
    alert_price DECIMAL(10,2),
    UNIQUE(user_id, stock_id)
);

-- ============================================================
-- VIEWS
-- ============================================================

-- Top 10 stocks by total historical volume
CREATE OR REPLACE VIEW vw_top_stocks_by_volume AS
SELECT
    s.symbol,
    s.name,
    sec.name AS sector,
    SUM(h.volume) AS total_volume
FROM stock_price_history h
JOIN stocks s ON s.stock_id = h.stock_id
JOIN sectors sec ON sec.sector_id = s.sector_id
GROUP BY s.symbol, s.name, sec.name
ORDER BY total_volume DESC
LIMIT 10;

-- Best performing stocks on the most recent trading day
CREATE OR REPLACE VIEW vw_best_performing_stocks AS
SELECT
    s.symbol,
    s.name,
    sec.name AS sector,
    h.close_price,
    h.price_change,
    h.change_pct
FROM stock_price_history h
JOIN stocks s ON s.stock_id = h.stock_id
JOIN sectors sec ON sec.sector_id = s.sector_id
WHERE h.price_date = (SELECT MAX(price_date) FROM stock_price_history)
  AND h.change_pct IS NOT NULL
ORDER BY h.change_pct DESC
LIMIT 10;

-- Worst performing stocks on the most recent trading day
CREATE OR REPLACE VIEW vw_worst_performing_stocks AS
SELECT
    s.symbol,
    s.name,
    sec.name AS sector,
    h.close_price,
    h.price_change,
    h.change_pct
FROM stock_price_history h
JOIN stocks s ON s.stock_id = h.stock_id
JOIN sectors sec ON sec.sector_id = s.sector_id
WHERE h.price_date = (SELECT MAX(price_date) FROM stock_price_history)
  AND h.change_pct IS NOT NULL
ORDER BY h.change_pct ASC
LIMIT 10;

-- Sector summary with latest day stats
CREATE OR REPLACE VIEW vw_sector_summary AS
SELECT
    sec.name AS sector,
    COUNT(DISTINCT s.stock_id) AS total_stocks,
    ROUND(AVG(h.close_price)::NUMERIC, 2) AS avg_close_price,
    SUM(h.volume) AS total_volume,
    ROUND(AVG(h.change_pct)::NUMERIC, 2) AS avg_change_pct
FROM sectors sec
JOIN stocks s ON s.sector_id = sec.sector_id
JOIN stock_price_history h ON h.stock_id = s.stock_id
WHERE h.price_date = (SELECT MAX(price_date) FROM stock_price_history)
GROUP BY sec.name
ORDER BY avg_change_pct DESC;

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
