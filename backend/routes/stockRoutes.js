import express from 'express';
import { getStock, getAllStocks, getStockBySymbol } from "../controllers/stockController.js";

const router = express.Router();

router.get('/', getAllStocks);
router.get('/search/:name', getStock);
router.get('/symbol/:symbol', getStockBySymbol);

router.put('/:id', (req, res) => {
  res.status(200).json({ message: `Update user ${req.params.id}` });
});

router.delete('/:id', (req, res) => {
  res.status(200).json({ message: `Delete user ${req.params.id}` });
});

export default router;