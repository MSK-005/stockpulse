/**
 * Twelve Data API Service
 * Free tier: 800 calls/day, 8 calls/minute
 * We respect this with a queue and delay mechanism.
 */

const BASE_URL = 'https://api.twelvedata.com';
const API_KEY = process.env.TWELVE_DATA_API_KEY;

// Rate limiter: 8 calls/minute = 1 call per 7.5 seconds to be safe
const RATE_LIMIT_DELAY_MS = 8000; // 8 seconds between calls
let lastCallTime = 0;

async function rateLimitedFetch(url) {
  const now = Date.now();
  const elapsed = now - lastCallTime;
  if (elapsed < RATE_LIMIT_DELAY_MS) {
    await sleep(RATE_LIMIT_DELAY_MS - elapsed);
  }
  lastCallTime = Date.now();

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Twelve Data HTTP error: ${res.status}`);
  }
  const data = await res.json();
  if (data.status === 'error') {
    throw new Error(`Twelve Data API error: ${data.message}`);
  }
  return data;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fetch time series OHLCV data for a symbol
 * @param {string} symbol - e.g. 'AAPL'
 * @param {string} interval - '1day'
 * @param {number} outputsize - number of data points (max 5000)
 * @param {string} start_date - 'YYYY-MM-DD'
 */
async function getTimeSeries(symbol, interval = '1day', outputsize = 5000, start_date = null) {
  let url = `${BASE_URL}/time_series?symbol=${symbol}&interval=${interval}&outputsize=${outputsize}&apikey=${API_KEY}`;
  if (start_date) url += `&start_date=${start_date}`;
  return rateLimitedFetch(url);
}

/**
 * Fetch stock profile/overview
 */
async function getStockProfile(symbol) {
  const url = `${BASE_URL}/profile?symbol=${symbol}&apikey=${API_KEY}`;
  return rateLimitedFetch(url);
}

/**
 * Fetch latest quote (real-time delayed)
 */
async function getQuote(symbol) {
  const url = `${BASE_URL}/quote?symbol=${symbol}&apikey=${API_KEY}`;
  return rateLimitedFetch(url);
}

/**
 * Fetch RSI
 */
async function getRSI(symbol, period = 14) {
  const url = `${BASE_URL}/rsi?symbol=${symbol}&interval=1day&time_period=${period}&outputsize=1&apikey=${API_KEY}`;
  return rateLimitedFetch(url);
}

/**
 * Fetch MACD
 */
async function getMACD(symbol) {
  const url = `${BASE_URL}/macd?symbol=${symbol}&interval=1day&outputsize=1&apikey=${API_KEY}`;
  return rateLimitedFetch(url);
}

/**
 * Fetch Stochastic
 */
async function getStoch(symbol) {
  const url = `${BASE_URL}/stoch?symbol=${symbol}&interval=1day&outputsize=1&apikey=${API_KEY}`;
  return rateLimitedFetch(url);
}

/**
 * Fetch Bollinger Bands
 */
async function getBBands(symbol) {
  const url = `${BASE_URL}/bbands?symbol=${symbol}&interval=1day&outputsize=1&apikey=${API_KEY}`;
  return rateLimitedFetch(url);
}

/**
 * Fetch ADX
 */
async function getADX(symbol) {
  const url = `${BASE_URL}/adx?symbol=${symbol}&interval=1day&outputsize=1&apikey=${API_KEY}`;
  return rateLimitedFetch(url);
}

/**
 * Fetch multiple SMAs at once using batch endpoint
 */
async function getSMAs(symbol) {
  const periods = [5, 15, 30, 50, 100];
  const results = {};
  for (const period of periods) {
    try {
      const url = `${BASE_URL}/sma?symbol=${symbol}&interval=1day&time_period=${period}&outputsize=1&apikey=${API_KEY}`;
      const data = await rateLimitedFetch(url);
      if (data.values && data.values.length > 0) {
        results[`sma${period}`] = parseFloat(data.values[0].sma);
      }
    } catch (err) {
      console.warn(`SMA${period} fetch failed for ${symbol}:`, err.message);
    }
  }
  return results;
}

/**
 * Fetch fundamentals/statistics (earnings, PE, etc.)
 */
async function getFundamentals(symbol) {
  const url = `${BASE_URL}/statistics?symbol=${symbol}&apikey=${API_KEY}`;
  return rateLimitedFetch(url);
}

/**
 * Classify RSI signal
 */
function classifyRSI(rsi) {
  if (rsi >= 70) return 'Overbought';
  if (rsi <= 30) return 'Oversold';
  return 'Neutral';
}

/**
 * Classify SMA signal (price vs SMA)
 */
function classifySMA(price, sma) {
  if (!price || !sma) return 'Neutral';
  return price > sma ? 'Buy' : 'Sell';
}

export {
  getTimeSeries,
  getStockProfile,
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
};
