export function formatPrice(value, decimals = 2) {
  if (value == null) return '—';
  return '$' + parseFloat(value).toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatChange(value) {
  if (value == null) return '—';
  const v = parseFloat(value);
  return (v >= 0 ? '+' : '') + v.toFixed(2);
}

export function formatPct(value) {
  if (value == null) return '—';
  const v = parseFloat(value);
  return (v >= 0 ? '+' : '') + v.toFixed(2) + '%';
}

export function formatVolume(value) {
  if (value == null) return '—';
  const v = parseInt(value);
  if (v >= 1_000_000_000) return (v / 1_000_000_000).toFixed(1) + 'B';
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(1) + 'M';
  if (v >= 1_000) return (v / 1_000).toFixed(1) + 'K';
  return v.toString();
}

export function formatMarketCap(value) {
  if (value == null) return '—';
  const v = parseInt(value);
  if (v >= 1_000_000_000_000) return '$' + (v / 1_000_000_000_000).toFixed(2) + 'T';
  if (v >= 1_000_000_000) return '$' + (v / 1_000_000_000).toFixed(1) + 'B';
  if (v >= 1_000_000) return '$' + (v / 1_000_000).toFixed(1) + 'M';
  return '$' + v.toLocaleString();
}

export function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

export function formatRatio(value, decimals = 2) {
  if (value == null) return '—';
  return parseFloat(value).toFixed(decimals) + 'x';
}

export function formatPercent(value) {
  if (value == null) return '—';
  return parseFloat(value).toFixed(2) + '%';
}

export function changeClass(value) {
  if (value == null) return 'neutral';
  return parseFloat(value) >= 0 ? 'positive' : 'negative';
}

export function signalClass(signal) {
  if (!signal) return 'badge-neutral';
  const s = signal.toLowerCase();
  if (s === 'buy' || s === 'bullish') return 'badge-green';
  if (s === 'sell' || s === 'bearish') return 'badge-red';
  if (s === 'overbought') return 'badge-red';
  if (s === 'oversold') return 'badge-green';
  return 'badge-neutral';
}
