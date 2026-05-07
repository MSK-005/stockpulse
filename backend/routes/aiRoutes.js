// backend/routes/aiRoutes.js
// Proxies Claude API calls from the frontend — API key stays server-side only.
import express from 'express';

const router = express.Router();

router.post('/chat', async (req, res) => {
  const { system, messages } = req.body;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(503).json({
      content: [{ type: 'text', text: '⚠️ AI service not configured.\n\nTo enable AI chat, add your Anthropic API key to the `.env` file:\n\n```\nANTHROPIC_API_KEY=sk-ant-...\n```\n\nGet your key at https://console.anthropic.com' }]
    });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1000,
        system,
        messages,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      // Pass Anthropic error through clearly
      const errMsg = data?.error?.message || JSON.stringify(data);
      return res.status(response.status).json({
        content: [{ type: 'text', text: `⚠️ Anthropic API error: ${errMsg}` }]
      });
    }

    res.json(data);
  } catch (err) {
    res.status(500).json({
      content: [{ type: 'text', text: `⚠️ Could not reach Anthropic API: ${err.message}\n\nCheck your internet connection and ANTHROPIC_API_KEY in .env` }]
    });
  }
});

export default router;
