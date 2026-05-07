// src/pages/AIPage.jsx
import { useState, useRef, useEffect } from 'react';
import { STOCKS } from '../utils/data';

const SUGGESTED_PROMPTS = [
  '📊 Analyze NVDA — give me a bull/bear breakdown',
  '🌡️ What\'s the current market regime?',
  '⚡ Compare AAPL vs MSFT fundamentals',
  '🚨 Which stocks in my watchlist have the most risk?',
  '📈 Best sectors to position in for Q2?',
  '🔍 Explain the difference between RSI and MACD',
];

const AI_CLUSTERS_MOCK = [
  { id: 0, name: 'Tech Momentum', count: 5, stocks: ['NVDA', 'AMD', 'AVGO', 'MSFT', 'GOOGL'] },
  { id: 1, name: 'Tech Core', count: 3, stocks: ['AAPL', 'META', 'NFLX'] },
  { id: 2, name: 'Financial Core', count: 4, stocks: ['JPM', 'V', 'MA', 'BRK.B'] },
  { id: 3, name: 'Consumer Value', count: 3, stocks: ['AMZN', 'HD', 'COST'] },
  { id: 4, name: 'Healthcare Defensive', count: 2, stocks: ['UNH', 'JNJ'] },
  { id: 5, name: 'Energy Tail Risk', count: 1, stocks: ['XOM'] },
  { id: 6, name: 'Staples Defensive', count: 2, stocks: ['PG', 'COST'] },
  { id: 7, name: 'EV Cyclical Risk', count: 1, stocks: ['TSLA'] },
];

const ANOMALIES_MOCK = ['TSLA', 'NVDA', 'AVGO'];

function TypingDots() {
  return (
    <div className="msg">
      <div className="msg-avatar msg-ai-avatar">SP</div>
      <div className="msg-bubble" style={{ padding: '14px 18px' }}>
        <span className="typing-dots">
          <span>●</span><span>●</span><span>●</span>
        </span>
      </div>
    </div>
  );
}

export default function AIPage({ user, watchlist = [] }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: `**Welcome to StockPulse AI Analytics** ⚡\n\nI'm your AI-powered market analyst. I can help you:\n• Analyze individual stocks (try "Analyze NVDA")\n• Understand market trends and macro conditions\n• Compare stocks and sectors\n• Explain technical indicators and fundamentals\n• Review your watchlist holdings\n\nWhat would you like to explore today?`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [aiConnected, setAiConnected] = useState(false);
  const [clusterView, setClusterView] = useState(null);
  const messagesEndRef = useRef();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Check if Python AI service is reachable
  useEffect(() => {
    fetch('http://localhost:8000/health')
      .then(r => r.ok && setAiConnected(true))
      .catch(() => setAiConnected(false));
  }, []);

  const buildSystemPrompt = () => {
    const stockContext = STOCKS.map(s =>
      `${s.ticker} (${s.name}): $${s.price}, ${s.pct > 0 ? '+' : ''}${s.pct}% today, MCap ${s.mktcap}, P/E ${s.pe}, Sector: ${s.sector}`
    ).join('\n');

    const watchlistContext = watchlist.length > 0
      ? `\nUser's Watchlist:\n${watchlist.map(s => `- ${s.ticker} (${s.name}): $${s.price}, ${s.pct}%`).join('\n')}`
      : '\nUser has no stocks in watchlist yet.';

    return `You are StockPulse AI, an elite quantitative stock analyst and portfolio advisor embedded in the StockPulse trading platform. You combine fundamental analysis, technical analysis, and macro awareness to deliver hedge-fund quality insights.

Current Date: April 27, 2026
Market Status: US Markets Open

Live Market Data:
${stockContext}
${watchlistContext}

AI Clustering Engine (Python ML backend):
- Clusters detected: 8 distinct behavioral clusters
- Anomalies flagged: TSLA, NVDA, AVGO (high idiosyncratic risk)
- Market Regime: BULL (60d cumulative return > 5%, uptrend intact)

Your personality: Direct, confident, data-driven. Use bullet points, bold headers, and emoji for clarity. Always cite specific numbers. Flag risks alongside opportunities. Think like a PM at a top quant fund. Format responses with clear sections using ** for bold headers.

When asked about a specific stock, provide:
1. Technical overview (price, RSI estimate, trend)
2. Fundamental analysis (P/E, growth, margins)
3. Bull/Bear case with price targets
4. Risk factors

Keep responses focused and actionable. Max 300 words unless asked for deep analysis.`;
  };

  const sendMessage = async (text) => {
    const msg = text || input.trim();
    if (!msg || loading) return;
    setInput('');

    const userMsg = { role: 'user', content: msg, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setLoading(true);

    try {
      const apiMessages = newMessages
        .filter(m => m.role !== 'system')
        .map(m => ({ role: m.role, content: m.content }));

      const response = await fetch(`${process.env.REACT_APP_NODE_API || 'http://localhost:3001/api'}/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system: buildSystemPrompt(),
          messages: apiMessages,
        })
      });

      const data = await response.json();
      const aiText = data.content?.[0]?.text || 'I encountered an issue processing your request. Please try again.';

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: aiText,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `⚠️ Unable to connect to AI service. Please check your connection.\n\nError: ${err.message}`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  return (
    <div className="page-content fade-in">
      <div className="ai-layout">
        {/* Chat Panel */}
        <div className="chat-container">
          {/* Status bar */}
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', gap: '10px' }}>
            <div className="ai-status" style={{ flex: 1, margin: 0 }}>
              <div className="refresh-dot" />
              Claude AI · Powered by Anthropic · Live Market Context
            </div>
            {aiConnected && (
              <div className="ai-status" style={{ margin: 0, background: 'rgba(6,182,212,0.06)', borderColor: 'rgba(6,182,212,0.2)', color: 'var(--accent-2)' }}>
                <div className="refresh-dot" style={{ background: 'var(--accent-2)' }} />
                ML Engine: Online
              </div>
            )}
          </div>

          {/* Messages */}
          <div className="chat-messages">
            {messages.map((m, i) => (
              <div key={i} className={`msg ${m.role === 'user' ? 'user' : ''}`}>
                <div className={`msg-avatar ${m.role === 'user' ? 'msg-user-avatar' : 'msg-ai-avatar'}`}>
                  {m.role === 'user' ? '👤' : 'SP'}
                </div>
                <div>
                  <div className="msg-bubble">{m.content}</div>
                  <div className="msg-time">{m.time}</div>
                </div>
              </div>
            ))}
            {loading && <TypingDots />}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="chat-input-area">
            <input
              className="chat-input"
              placeholder="Ask about any stock, sector, or market trend..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              disabled={loading}
            />
            <button className="send-btn" onClick={() => sendMessage()} disabled={loading || !input.trim()}>
              {loading ? '⏳' : '↑'}
            </button>
          </div>
        </div>

        {/* Right Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto' }}>
          {/* Suggested Prompts */}
          <div className="card">
            <div className="card-title">💡 Quick Prompts</div>
            <div className="suggested-prompts">
              {SUGGESTED_PROMPTS.map(p => (
                <button key={p} className="prompt-btn" onClick={() => sendMessage(p)}>
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* ML Cluster Analysis */}
          <div className="card">
            <div className="card-title" style={{ marginBottom: '4px' }}>🧠 ML Cluster Engine</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '12px', fontFamily: 'var(--font-mono)' }}>
              Python AI · {AI_CLUSTERS_MOCK.length} clusters detected
            </div>

            {/* Anomaly Alert */}
            <div style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '10px', padding: '10px 12px', marginBottom: '12px' }}>
              <div style={{ fontSize: '12px', color: 'var(--danger)', fontWeight: 600, marginBottom: '4px' }}>⚠️ Anomalies Detected</div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {ANOMALIES_MOCK.map(a => (
                  <span key={a} className="anomaly-badge">{a}</span>
                ))}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>High idiosyncratic risk — Isolation Forest flagged</div>
            </div>

            {/* Clusters list */}
            <div style={{ maxHeight: 260, overflowY: 'auto' }}>
              {AI_CLUSTERS_MOCK.map(c => (
                <div
                  key={c.id}
                  className="cluster-card"
                  onClick={() => setClusterView(clusterView?.id === c.id ? null : c)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '13px', fontWeight: 600 }}>{c.name}</div>
                    <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>{c.count} stocks</span>
                  </div>
                  {clusterView?.id === c.id && (
                    <div style={{ marginTop: '8px', display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                      {c.stocks.map(s => (
                        <span key={s} className="ticker-badge" style={{ fontSize: '11px' }}>{s}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <button
              className="save-btn"
              style={{ width: '100%', marginTop: '10px', fontSize: '12px', padding: '8px' }}
              onClick={() => sendMessage('Show me a full analysis of the current cluster structure and which clusters have the most alpha potential')}
            >
              🔍 Analyze Clusters with AI
            </button>
          </div>

          {/* Market Regime */}
          <div className="card">
            <div className="card-title">📈 Market Regime</div>
            <div style={{ textAlign: 'center', padding: '12px 0' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: 800, color: 'var(--success)' }}>BULL</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>60d cumulative return &gt; 5%</div>
            </div>
            <div className="stat-row">
              <span className="stat-label">VIX</span>
              <span className="stat-val down">13.44 (Low)</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">Trend Direction</span>
              <span className="stat-val up">↑ Uptrend</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">Avg Volatility (Ann.)</span>
              <span className="stat-val">14.2%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
