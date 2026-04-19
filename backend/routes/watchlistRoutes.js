import express from "express";
import {
  getWatchlist,
  addToWatchlist,
  removeFromWatchlist,
} from "../controllers/watchlistController.js";

const router = express.Router();

router.get('/:user_id', getWatchlist);
router.post('/', addToWatchlist);
router.delete('/:watch_id', removeFromWatchlist);

export default router;
