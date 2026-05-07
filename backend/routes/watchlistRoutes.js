import express from 'express';
import {
  getWatchlist,
  addToWatchlist,
  updateWatchlistEntry,
  removeFromWatchlist,
} from '../controllers/watchlistController.js';
import { verifyToken } from '../middleware/auth.js';
import { validate, watchlistAddSchema, watchlistUpdateSchema } from '../middleware/validate.js';

const router = express.Router();

// All watchlist routes require authentication
router.use(verifyToken);

router.get('/', getWatchlist);
router.post('/', validate(watchlistAddSchema), addToWatchlist);
router.put('/:watch_id', validate(watchlistUpdateSchema), updateWatchlistEntry);
router.delete('/:watch_id', removeFromWatchlist);

export default router;
