// backend/routes/newsRoutes.js
import express from 'express';
const router = express.Router();

// Mock news data — replace with DB queries when available
const NEWS = [
  { id:1, source:'Bloomberg', time:'2m ago', title:'Fed signals patience on rate cuts as inflation data shows resilience', tags:['neutral','macro'], sentiment:0.42 },
  { id:2, source:'Reuters', time:'8m ago', title:'NVIDIA crushes Q1 earnings — data center revenue soars 427% YoY', tags:['bull','earnings'], sentiment:0.91 },
  { id:3, source:'WSJ', time:'15m ago', title:'Apple Vision Pro sales disappoint as consumers balk at price point', tags:['bear','tech'], sentiment:0.18 },
  { id:4, source:'CNBC', time:'32m ago', title:'Oil prices slide 2% on surprise inventory build', tags:['bear','energy'], sentiment:0.22 },
  { id:5, source:'FT', time:'1h ago', title:'China manufacturing PMI beats forecasts, boosting EM sentiment', tags:['bull','global'], sentiment:0.78 },
];

router.get('/', (req, res) => {
  res.json(NEWS);
});

router.get('/trending', (req, res) => {
  res.json([
    { ticker:'NVDA', buzz:'🔥 Very Hot', heat:95 },
    { ticker:'AMD', buzz:'📈 Rising', heat:84 },
    { ticker:'TSLA', buzz:'📈 Rising', heat:78 },
    { ticker:'AAPL', buzz:'💬 Active', heat:65 },
    { ticker:'META', buzz:'💡 Watching', heat:58 },
  ]);
});

export default router;
