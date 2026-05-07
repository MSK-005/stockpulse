// src/utils/data.js — Centralized mock data & utilities

export const STOCKS = [
  { ticker:'AAPL', name:'Apple Inc.', sector:'Technology', price:217.90, change:2.34, pct:1.08, vol:'82.3M', mktcap:'3.36T', pe:28.4, color:'#3b82f6' },
  { ticker:'NVDA', name:'NVIDIA Corp.', sector:'Semiconductors', price:892.55, change:18.72, pct:2.14, vol:'41.2M', mktcap:'2.20T', pe:65.2, color:'#10b981' },
  { ticker:'MSFT', name:'Microsoft Corp.', sector:'Technology', price:415.28, change:-3.14, pct:-0.75, vol:'21.8M', mktcap:'3.09T', pe:35.1, color:'#8b5cf6' },
  { ticker:'GOOGL', name:'Alphabet Inc.', sector:'Technology', price:168.92, change:1.45, pct:0.87, vol:'18.5M', mktcap:'2.10T', pe:22.3, color:'#f59e0b' },
  { ticker:'AMZN', name:'Amazon.com Inc.', sector:'Consumer', price:185.63, change:3.21, pct:1.76, vol:'32.1M', mktcap:'1.95T', pe:44.8, color:'#06b6d4' },
  { ticker:'TSLA', name:'Tesla Inc.', sector:'Auto/EV', price:172.44, change:-5.82, pct:-3.27, vol:'95.6M', mktcap:'0.55T', pe:48.2, color:'#ef4444' },
  { ticker:'META', name:'Meta Platforms', sector:'Technology', price:494.32, change:8.91, pct:1.83, vol:'14.2M', mktcap:'1.25T', pe:24.7, color:'#ec4899' },
  { ticker:'BRK.B', name:'Berkshire Hathaway', sector:'Financials', price:428.15, change:2.05, pct:0.48, vol:'3.8M', mktcap:'0.94T', pe:18.1, color:'#84cc16' },
  { ticker:'JPM', name:'JPMorgan Chase', sector:'Financials', price:198.45, change:1.32, pct:0.67, vol:'9.4M', mktcap:'0.57T', pe:11.2, color:'#f97316' },
  { ticker:'V', name:'Visa Inc.', sector:'Financials', price:279.34, change:2.18, pct:0.79, vol:'6.1M', mktcap:'0.57T', pe:30.8, color:'#14b8a6' },
  { ticker:'UNH', name:'UnitedHealth Group', sector:'Healthcare', price:524.60, change:-4.20, pct:-0.79, vol:'3.2M', mktcap:'0.48T', pe:20.4, color:'#a78bfa' },
  { ticker:'JNJ', name:'Johnson & Johnson', sector:'Healthcare', price:152.80, change:0.95, pct:0.62, vol:'7.8M', mktcap:'0.37T', pe:15.7, color:'#fb7185' },
  { ticker:'XOM', name:'Exxon Mobil', sector:'Energy', price:119.45, change:-1.85, pct:-1.52, vol:'14.6M', mktcap:'0.47T', pe:13.8, color:'#fbbf24' },
  { ticker:'PG', name:'Procter & Gamble', sector:'Consumer Staples', price:163.20, change:0.74, pct:0.46, vol:'5.3M', mktcap:'0.38T', pe:27.1, color:'#60a5fa' },
  { ticker:'HD', name:'Home Depot', sector:'Consumer Disc.', price:342.75, change:5.12, pct:1.51, vol:'3.9M', mktcap:'0.34T', pe:21.3, color:'#34d399' },
  { ticker:'MA', name:'Mastercard Inc.', sector:'Financials', price:472.30, change:3.80, pct:0.81, vol:'2.8M', mktcap:'0.43T', pe:35.6, color:'#f472b6' },
  { ticker:'AVGO', name:'Broadcom Inc.', sector:'Semiconductors', price:1312.40, change:22.50, pct:1.75, vol:'2.1M', mktcap:'0.61T', pe:38.2, color:'#a3e635' },
  { ticker:'COST', name:'Costco Wholesale', sector:'Consumer Staples', price:778.90, change:6.30, pct:0.82, vol:'1.7M', mktcap:'0.34T', pe:48.9, color:'#38bdf8' },
  { ticker:'NFLX', name:'Netflix Inc.', sector:'Communication', price:628.45, change:11.20, pct:1.82, vol:'3.4M', mktcap:'0.27T', pe:42.3, color:'#fb923c' },
  { ticker:'AMD', name:'Advanced Micro Devices', sector:'Semiconductors', price:178.35, change:4.92, pct:2.84, vol:'38.7M', mktcap:'0.29T', pe:55.4, color:'#c084fc' },
];

export const MARKET_INDICES = [
  { name:'S&P 500', value:'5,254.35', change:'+38.42', pct:'+0.74%', dir:'up' },
  { name:'NASDAQ', value:'16,442.20', change:'+185.62', pct:'+1.14%', dir:'up' },
  { name:'DOW JONES', value:'39,807.37', change:'-22.14', pct:'-0.06%', dir:'down' },
  { name:'VIX', value:'13.44', change:'-0.82', pct:'-5.75%', dir:'down' },
];

export const NEWS_DATA = [
  { id:1, source:'Bloomberg', time:'2m ago', title:'Fed signals patience on rate cuts as inflation data shows resilience above 2% target', tags:['neutral','macro'], sentiment:0.42, emoji:'📊', categories:['macro','rates'] },
  { id:2, source:'Reuters', time:'8m ago', title:'NVIDIA crushes Q1 earnings — data center revenue soars to $22.6B, up 427% YoY', tags:['bull','earnings'], sentiment:0.91, emoji:'🚀', categories:['earnings','tech'] },
  { id:3, source:'WSJ', time:'15m ago', title:'Apple Vision Pro sales disappoint as consumers balk at $3,499 price point in key markets', tags:['bear','tech'], sentiment:0.18, emoji:'📉', categories:['tech','consumer'] },
  { id:4, source:'CNBC', time:'32m ago', title:'Oil prices slide 2% on surprise inventory build; energy sector ETFs trade lower', tags:['bear','energy'], sentiment:0.22, emoji:'🛢️', categories:['energy','commodities'] },
  { id:5, source:'FT', time:'1h ago', title:'China manufacturing PMI beats forecasts, boosting emerging market sentiment and commodities', tags:['bull','global'], sentiment:0.78, emoji:'🌏', categories:['macro','global'] },
  { id:6, source:'MarketWatch', time:'1h ago', title:'Tesla shares drop after Q1 delivery miss; analysts cut price targets across the board', tags:['bear','auto'], sentiment:0.09, emoji:'⚡', categories:['auto','earnings'] },
  { id:7, source:'Barrons', time:'2h ago', title:'Bitcoin breaks $70K barrier again — institutional inflows via ETFs remain strong at record levels', tags:['bull','crypto'], sentiment:0.82, emoji:'₿', categories:['crypto','markets'] },
  { id:8, source:'Reuters', time:'2h ago', title:'AMD surges as data center AI chip demand offsets gaming segment weakness', tags:['bull','tech'], sentiment:0.74, emoji:'💻', categories:['tech','earnings'] },
  { id:9, source:'Bloomberg', time:'3h ago', title:'JPMorgan upgrades financials sector — higher for longer rates benefit net interest margins', tags:['bull','financials'], sentiment:0.68, emoji:'🏦', categories:['financials','macro'] },
  { id:10, source:'CNBC', time:'4h ago', title:'Netflix Q1 subscriber growth blows past estimates; ad-supported tier drives revenue mix', tags:['bull','earnings'], sentiment:0.85, emoji:'🎬', categories:['tech','earnings'] },
  { id:11, source:'FT', time:'5h ago', title:'Exxon Mobil cuts capex forecast as oil demand outlook softens amid energy transition', tags:['bear','energy'], sentiment:0.25, emoji:'⛽', categories:['energy','macro'] },
  { id:12, source:'WSJ', time:'6h ago', title:'Costco monthly sales data impresses analysts — resilient consumer spending defies expectations', tags:['bull','consumer'], sentiment:0.71, emoji:'🛒', categories:['consumer','macro'] },
];

export const TRENDING = [
  { ticker:'NVDA', buzz:'🔥 Very Hot', heat:95 },
  { ticker:'AMD', buzz:'📈 Rising', heat:84 },
  { ticker:'TSLA', buzz:'📈 Rising', heat:78 },
  { ticker:'AAPL', buzz:'💬 Active', heat:65 },
  { ticker:'META', buzz:'💡 Watching', heat:58 },
  { ticker:'NFLX', buzz:'💬 Active', heat:52 },
  { ticker:'SPY', buzz:'📊 Steady', heat:45 },
];

export const SECTOR_DATA = [
  { name:'Technology', change:3.2 },
  { name:'Semiconductors', change:4.1 },
  { name:'Healthcare', change:1.1 },
  { name:'Energy', change:-1.5 },
  { name:'Financials', change:2.4 },
  { name:'Consumer Disc.', change:-0.8 },
  { name:'Consumer Staples', change:0.5 },
  { name:'Communication', change:1.9 },
  { name:'Materials', change:0.7 },
  { name:'Industrials', change:0.3 },
];

// API base URLs — Node.js backend & Python AI service
export const NODE_API = process.env.REACT_APP_NODE_API || 'http://localhost:3001/api';
export const AI_API = process.env.REACT_APP_AI_API || 'http://localhost:8000';

// Utility: generate sparkline data
export function generateSparkData(up = true, pts = 20) {
  const data = [];
  let v = 100;
  for (let i = 0; i < pts; i++) {
    v += (Math.random() - 0.48) * 3 * (up ? 1.1 : 0.9);
    data.push(v);
  }
  return data;
}

// Format large numbers
export function fmtNum(n) {
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  return `$${n.toFixed(2)}`;
}
