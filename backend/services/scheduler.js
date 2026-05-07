/**
 * Daily Price Updater — runs via node-cron inside the Express server
 * Schedule: Every day at 6:00 PM ET (after US market close at 4 PM ET)
 * Cron: '0 23 * * 1-5' (23:00 UTC = 7 PM ET, Mon-Fri)
 *
 * Per run: fetches latest OHLCV bar + snapshot for every stock.
 * ~2 API calls per stock × 150 stocks = 300 calls = well within daily 800 limit.
 */

import cron from 'node-cron';
import pool from '../config/db.js';
import { getTimeSeries, getQuote } from './twelveData.js';

async function updateDailyPrices() {
  console.log(`[CRON] Starting daily price update at ${new Date().toISOString()}`);

  try {
    const stocksResult = await pool.query('SELECT stock_id, symbol FROM stocks ORDER BY symbol ASC');
    const stocks = stocksResult.rows;

    let updated = 0;
    let failed = 0;

    for (const { stock_id, symbol } of stocks) {
      try {
        // Fetch the latest 2 bars (today + yesterday for change calculation)
        const tsData = await getTimeSeries(symbol, '1day', 2);

        if (!tsData.values || tsData.values.length === 0) continue;

        const latest = tsData.values[0]; // newest first
        const prev = tsData.values[1];

        const priceDate = latest.datetime;
        const closePrice = parseFloat(latest.close);
        const prevClose = prev ? parseFloat(prev.close) : null;
        const priceChange = prevClose ? closePrice - prevClose : null;
        const changePct = prevClose ? ((closePrice - prevClose) / prevClose) * 100 : null;

        // Upsert into price history
        await pool.query(
          `INSERT INTO stock_price_history
             (stock_id, price_date, open_price, high, low, close_price, volume, adjusted_close, price_change, change_pct)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
           ON CONFLICT (stock_id, price_date) DO UPDATE SET
             open_price    = EXCLUDED.open_price,
             high          = EXCLUDED.high,
             low           = EXCLUDED.low,
             close_price   = EXCLUDED.close_price,
             volume        = EXCLUDED.volume,
             adjusted_close = EXCLUDED.adjusted_close,
             price_change  = EXCLUDED.price_change,
             change_pct    = EXCLUDED.change_pct`,
          [
            stock_id, priceDate,
            parseFloat(latest.open) || null,
            parseFloat(latest.high) || null,
            parseFloat(latest.low) || null,
            closePrice,
            parseInt(latest.volume) || null,
            closePrice,
            priceChange ? parseFloat(priceChange.toFixed(4)) : null,
            changePct ? parseFloat(changePct.toFixed(4)) : null,
          ]
        );

        // Fetch and upsert snapshot
        try {
          const quote = await getQuote(symbol);
          if (quote && quote.close) {
            const tradeDateStr = quote.datetime ? quote.datetime.split(' ')[0] : priceDate;
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
                stock_id, tradeDateStr,
                parseFloat(quote.close) || null,
                parseFloat(quote.open) || null,
                parseFloat(quote.high) || null,
                parseFloat(quote.low) || null,
                parseFloat(quote.previous_close) || null,
                parseFloat(quote.change) || null,
                parseFloat(quote.percent_change) || null,
                parseInt(quote.volume) || null,
                quote['52_week'] ? parseFloat(quote['52_week'].low) || null : null,
                quote['52_week'] ? parseFloat(quote['52_week'].high) || null : null,
              ]
            );
          }
        } catch (snapshotErr) {
          console.warn(`[CRON] Snapshot failed for ${symbol}:`, snapshotErr.message);
        }

        updated++;
      } catch (err) {
        console.error(`[CRON] Failed to update ${symbol}:`, err.message);
        failed++;
      }
    }

    console.log(`[CRON] Daily update complete. Updated: ${updated}, Failed: ${failed}`);
  } catch (err) {
    console.error('[CRON] Daily update error:', err);
  }
}

// Schedule: 11 PM UTC (7 PM ET) on weekdays
export function startCronJobs() {
  cron.schedule('0 23 * * 1-5', async () => {
    await updateDailyPrices();
  }, {
    timezone: 'UTC',
  });

  console.log('⏰ Cron jobs scheduled: daily price update at 23:00 UTC (Mon-Fri)');
}
