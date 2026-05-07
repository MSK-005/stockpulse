import express from 'express';
import {
  getAllStocks,
  searchStocks,
  getStockBySymbol,
  getStockHistory,
  getStockFundamentals,
  getStockTechnicals,
  getSimilarStocks,
  getMarketMovers,
  getSectorSummary,
} from '../controllers/stockController.js';

const router = express.Router();

// Market overview (no auth required - public data)
router.get('/market/movers', getMarketMovers);
router.get('/market/sectors', getSectorSummary);

// Stock search & listing
router.get('/search', searchStocks);
router.get('/', getAllStocks);

// Individual stock
router.get('/:symbol', getStockBySymbol);
router.get('/:symbol/history', getStockHistory);
router.get('/:symbol/fundamentals', getStockFundamentals);
router.get('/:symbol/technicals', getStockTechnicals);
router.get('/:symbol/similar', getSimilarStocks);

export default router;
