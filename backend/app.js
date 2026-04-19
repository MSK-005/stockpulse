import express from "express";
import poolPromise from "./config/db.js";
import stockRoutes from './routes/stockRoutes.js';
import userRoutes from './routes/userRoutes.js';
import watchlistRoutes from "./routes/watchlistRoutes.js";

const app = express();
const PORT = process.env.PORT;

async function connectDatabase() {
    try {
        const poolPromiseResult = await poolPromise;
    } catch(err) {
        console.error(err);
    }
}

app.use(express.json());

app.use('/api/stocks/', stockRoutes);
app.use('/api/users/', userRoutes);
app.use('/api/watchlist/', watchlistRoutes);

connectDatabase().then(() => {
    app.listen(PORT, () => {
        console.log(`StockPulse active on port ${PORT}`);
    });
});
