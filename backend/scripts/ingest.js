/**
 * StockPulse Data Ingestion Script
 * Run: npm run ingest (from backend directory)
 *
 * Fetches for each stock:
 *   - 10 years of daily OHLCV history
 *   - Latest price snapshot
 *   - Fundamentals (PE, EPS, margins, etc.)
 *   - Technical indicators (RSI, MACD, SMA, Bollinger, ADX)
 *
 * Rate limit: 8 calls/min = ~800/day on free tier.
 * Per stock: ~7 API calls.
 * For 150 stocks: ~1,050 calls → runs over 2 sessions if needed.
 * Script is resumable: skips stocks that already have recent data.
 */

import pool from '../config/db.js';
import {
  getTimeSeries,
  getQuote,
  getRSI,
  getMACD,
  getStoch,
  getBBands,
  getADX,
  getSMAs,
  getFundamentals,
  classifyRSI,
  classifySMA,
  sleep,
} from '../services/twelveData.js';

const TEN_YEARS_AGO = new Date();
TEN_YEARS_AGO.setFullYear(TEN_YEARS_AGO.getFullYear() - 10);
const START_DATE = TEN_YEARS_AGO.toISOString().split('T')[0];

async function ingestHistoricalPrices(stockId, symbol) {
  try {
    const data = await getTimeSeries(symbol, '1day', 5000, START_DATE);
    if (!data.values || data.values.length === 0) {
      console.log(`    ⚠ No price history for ${symbol}`);
      return 0;
    }

    const values = data.values.reverse(); // API returns newest first
    let inserted = 0;

    // Batch insert in chunks of 100
    const chunkSize = 100;
    for (let i = 0; i < values.length; i += chunkSize) {
      const chunk = values.slice(i, i + chunkSize);
      const valuePlaceholders = chunk
        .map((_, idx) => {
          const base = idx * 7;
          return `($${base + 1},$${base + 2},$${base + 3},$${base + 4},$${base + 5},$${base + 6},$${base + 7})`;
        })
        .join(',');

      const flatParams = chunk.flatMap((v) => {
        const open = parseFloat(v.open) || null;
        const close = parseFloat(v.close) || null;
        const prevClose = null; // computed below
        return [
          stockId,
          v.datetime,
          open,
          parseFloat(v.high) || null,
          parseFloat(v.low) || null,
          close,
          parseInt(v.volume) || null,
          parseFloat(v.close) || null, // adjusted_close ≈ close for most free data
        ];
      });

      await pool.query(
        `INSERT INTO stock_price_history
           (stock_id, price_date, open_price, high, low, close_price, volume, adjusted_close)
         VALUES ${chunk
           .map((_, idx) => {
             const base = idx * 8;
             return `($${base + 1},$${base + 2},$${base + 3},$${base + 4},$${base + 5},$${base + 6},$${base + 7},$${base + 8})`;
           })
           .join(',')}
         ON CONFLICT (stock_id, price_date) DO NOTHING`,
        chunk.flatMap((v) => [
          stockId,
          v.datetime,
          parseFloat(v.open) || null,
          parseFloat(v.high) || null,
          parseFloat(v.low) || null,
          parseFloat(v.close) || null,
          parseInt(v.volume) || null,
          parseFloat(v.close) || null,
        ])
      );
      inserted += chunk.length;
    }

    // Compute price_change and change_pct from sequential data
    await pool.query(
      `UPDATE stock_price_history h
       SET price_change = h.close_price - prev.close_price,
           change_pct   = ROUND(((h.close_price - prev.close_price) / NULLIF(prev.close_price, 0) * 100)::NUMERIC, 4)
       FROM (
         SELECT history_id,
                LAG(close_price) OVER (PARTITION BY stock_id ORDER BY price_date) AS close_price
         FROM stock_price_history
         WHERE stock_id = $1
       ) prev
       WHERE h.history_id = prev.history_id
         AND h.stock_id = $1
         AND prev.close_price IS NOT NULL`,
      [stockId]
    );

    return inserted;
  } catch (err) {
    console.error(`    ❌ History error for ${symbol}:`, err.message);
    return 0;
  }
}

async function ingestSnapshot(stockId, symbol) {
  try {
    const quote = await getQuote(symbol);
    if (!quote || !quote.close) return;

    const tradeDate = quote.datetime ? quote.datetime.split(' ')[0] : new Date().toISOString().split('T')[0];

    await pool.query(
      `INSERT INTO stock_price_snapshot
         (stock_id, trade_date, current_price, open_price, day_high, day_low,
          previous_close, price_change, change_pct, volume, week52_low, week52_high)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       ON CONFLICT (stock_id, trade_date) DO UPDATE SET
         current_price  = EXCLUDED.current_price,
         open_price     = EXCLUDED.open_price,
         day_high       = EXCLUDED.day_high,
         day_low        = EXCLUDED.day_low,
         previous_close = EXCLUDED.previous_close,
         price_change   = EXCLUDED.price_change,
         change_pct     = EXCLUDED.change_pct,
         volume         = EXCLUDED.volume,
         week52_low     = EXCLUDED.week52_low,
         week52_high    = EXCLUDED.week52_high,
         captured_at    = NOW()`,
      [
        stockId,
        tradeDate,
        parseFloat(quote.close) || null,
        parseFloat(quote.open) || null,
        parseFloat(quote.high) || null,
        parseFloat(quote.low) || null,
        parseFloat(quote.previous_close) || null,
        parseFloat(quote.change) || null,
        parseFloat(quote.percent_change) || null,
        parseInt(quote.volume) || null,
        parseFloat(quote["52_week"]?.["low"]) || null,
        parseFloat(quote["52_week"]?.["high"]) || null,
      ],
    );
  } catch (err) {
    console.error(`    ❌ Snapshot error for ${symbol}:`, err.message);
  }
}

async function ingestTechnicals(stockId, symbol) {
  try {
    const today = new Date().toISOString().split('T')[0];

    // Fetch latest close price for SMA signal
    const priceResult = await pool.query(
      `SELECT close_price FROM stock_price_history WHERE stock_id = $1 ORDER BY price_date DESC LIMIT 1`,
      [stockId]
    );
    const latestPrice = priceResult.rows[0]?.close_price || null;

    const [rsiData, macdData, stochData, bbData, adxData, smaData] = await Promise.allSettled([
      getRSI(symbol),
      getMACD(symbol),
      getStoch(symbol),
      getBBands(symbol),
      getADX(symbol),
      getSMAs(symbol),
    ]);

    const rsi = rsiData.status === 'fulfilled' && rsiData.value?.values?.[0]
      ? parseFloat(rsiData.value.values[0].rsi) : null;
    const macd = macdData.status === 'fulfilled' && macdData.value?.values?.[0]
      ? parseFloat(macdData.value.values[0].macd) : null;
    const stoch = stochData.status === 'fulfilled' && stochData.value?.values?.[0]
      ? parseFloat(stochData.value.values[0].slow_k) : null;
    const bbUpper = bbData.status === 'fulfilled' && bbData.value?.values?.[0]
      ? parseFloat(bbData.value.values[0].upper_band) : null;
    const bbLower = bbData.status === 'fulfilled' && bbData.value?.values?.[0]
      ? parseFloat(bbData.value.values[0].lower_band) : null;
    const adx = adxData.status === 'fulfilled' && adxData.value?.values?.[0]
      ? parseFloat(adxData.value.values[0].adx) : null;
    const smas = smaData.status === 'fulfilled' ? smaData.value : {};

    await pool.query(
      `INSERT INTO technical_indicators
         (stock_id, record_date, rsi, rsi_signal, stoch, stoch_signal,
          macd, macd_signal, sma5, sma5_signal, sma15, sma15_signal,
          sma30, sma30_signal, sma50, sma50_signal, sma100, sma100_signal,
          bollinger_upper, bollinger_lower, adx)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)
       ON CONFLICT (stock_id, record_date) DO UPDATE SET
         rsi = EXCLUDED.rsi, rsi_signal = EXCLUDED.rsi_signal,
         stoch = EXCLUDED.stoch, stoch_signal = EXCLUDED.stoch_signal,
         macd = EXCLUDED.macd,
         sma5 = EXCLUDED.sma5, sma5_signal = EXCLUDED.sma5_signal,
         sma50 = EXCLUDED.sma50, sma50_signal = EXCLUDED.sma50_signal,
         bollinger_upper = EXCLUDED.bollinger_upper,
         bollinger_lower = EXCLUDED.bollinger_lower,
         adx = EXCLUDED.adx,
         captured_at = NOW()`,
      [
        stockId, today,
        rsi, rsi ? classifyRSI(rsi) : null,
        stoch, stoch ? (stoch > 80 ? 'Overbought' : stoch < 20 ? 'Oversold' : 'Neutral') : null,
        macd, macd ? (macd > 0 ? 'Bullish' : 'Bearish') : null,
        smas.sma5 || null, classifySMA(latestPrice, smas.sma5),
        smas.sma15 || null, classifySMA(latestPrice, smas.sma15),
        smas.sma30 || null, classifySMA(latestPrice, smas.sma30),
        smas.sma50 || null, classifySMA(latestPrice, smas.sma50),
        smas.sma100 || null, classifySMA(latestPrice, smas.sma100),
        bbUpper, bbLower, adx,
      ]
    );
  } catch (err) {
    console.error(`    ❌ Technicals error for ${symbol}:`, err.message);
  }
}

async function ingestFundamentals(stockId, symbol) {
  try {
    const data = await getFundamentals(symbol);
    if (!data || data.status === 'error') return;

    const s = data.statistics || {};
    const v = s.valuations_metrics || {};
    const f = s.financials || {};
    const inc = f.income_statement || {};
    const bal = f.balance_sheet || {};

    const fiscalYear = new Date().getFullYear().toString();

    await pool.query(
      `INSERT INTO fundamentals
         (stock_id, fiscal_year, eps_annual, pe_annual, gross_profit_margin_pct,
          net_profit_margin_pct, roe_pct, debt_to_equity, dividend_yield_pct, current_ratio)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       ON CONFLICT (stock_id, fiscal_year) DO UPDATE SET
         eps_annual = EXCLUDED.eps_annual,
         pe_annual  = EXCLUDED.pe_annual,
         gross_profit_margin_pct = EXCLUDED.gross_profit_margin_pct,
         net_profit_margin_pct   = EXCLUDED.net_profit_margin_pct,
         roe_pct        = EXCLUDED.roe_pct,
         debt_to_equity = EXCLUDED.debt_to_equity,
         dividend_yield_pct = EXCLUDED.dividend_yield_pct,
         current_ratio  = EXCLUDED.current_ratio,
         recorded_at    = NOW()`,
      [
        stockId, fiscalYear,
        parseFloat(s.earnings_per_share?.eps_actual) || null,
        parseFloat(v.pe_ratio) || null,
        parseFloat(inc.gross_profit_ttm) || null,
        parseFloat(inc.net_income_ttm) || null,
        parseFloat(s.return_on_equity_ttm) || null,
        parseFloat(bal.total_debt_to_equity_mrq) || null,
        parseFloat(s.dividend_yield) || null,
        parseFloat(bal.current_ratio_mrq) || null,
      ]
    );
  } catch (err) {
    console.error(`    ❌ Fundamentals error for ${symbol}:`, err.message);
  }
}

async function shouldSkip(stockId) {
  // Skip if we have price data from the last 2 days (already ingested recently)
  const result = await pool.query(
    `SELECT COUNT(*) as cnt FROM stock_price_history
     WHERE stock_id = $1 AND price_date >= NOW() - INTERVAL '3 days'`,
    [stockId]
  );
  return parseInt(result.rows[0].cnt) > 0;
}

async function ingest() {
  console.log('📥 Starting StockPulse data ingestion...');
  console.log(`📅 Fetching history from ${START_DATE}\n`);
  console.log('⚠️  This will take several hours. Safe to Ctrl+C and resume — it skips already-ingested stocks.\n');

  try {
    const stocksResult = await pool.query(
      'SELECT stock_id, symbol FROM stocks ORDER BY symbol ASC'
    );
    const stocks = stocksResult.rows;
    console.log(`Found ${stocks.length} stocks to process.\n`);

    let processed = 0;
    let skipped = 0;

    for (const stock of stocks) {
      const { stock_id, symbol } = stock;

      // Resume support: skip if recently ingested
      if (await shouldSkip(stock_id)) {
        console.log(`⏭  [${++skipped}/${stocks.length}] ${symbol} — already up to date, skipping`);
        continue;
      }

      console.log(`🔄 [${++processed}/${stocks.length}] Processing ${symbol}...`);

      console.log(`    📊 Fetching price history...`);
      const count = await ingestHistoricalPrices(stock_id, symbol);
      console.log(`    ✓ ${count} price records inserted`);

      console.log(`    📸 Fetching latest snapshot...`);
      await ingestSnapshot(stock_id, symbol);

      console.log(`    📐 Fetching technical indicators...`);
      await ingestTechnicals(stock_id, symbol);

      console.log(`    ✅ ${symbol} done\n`);

      if (processed < stocks.length) {
        console.log(`    ⏳ Waiting 60s for API rate limit...`);
        await sleep(60000);
      }
    }

    console.log(`\n🎉 Ingestion complete!`);
    console.log(`   Processed: ${processed} stocks`);
    console.log(`   Skipped:   ${skipped} stocks (already up to date)`);

  } catch (err) {
    console.error('❌ Ingestion failed:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

ingest();
